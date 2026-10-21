import { extensionApi, maybeExtensionApi } from './browser';
import { daySchema } from './schema';
import type { Item } from './types';
export interface Capture {
  title: string;
  url?: string;
  organization: string;
  deadline?: string;
  deadlineSource?: string;
  selectedText?: string;
  country?: string;
}
export function normalizeCaptureUrl(value: string) {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()])
      if (/^utm_/i.test(key) || ['fbclid', 'gclid', 'msclkid'].includes(key.toLowerCase()))
        url.searchParams.delete(key);
    return url.href;
  } catch {
    return value;
  }
}
export function captureDuplicates(
  items: Item[],
  capture: { title: string; organization: string; url?: string },
) {
  const normalized = capture.url ? normalizeCaptureUrl(capture.url) : undefined;
  return items.filter(
    (item) =>
      !item.deletedAt &&
      ((normalized && item.url && normalizeCaptureUrl(item.url) === normalized) ||
        (capture.title.trim() &&
          capture.organization.trim() &&
          item.title.trim().toLocaleLowerCase() === capture.title.trim().toLocaleLowerCase() &&
          (item.kind === 'subscription' ? item.vendor : item.organization)
            .trim()
            .toLocaleLowerCase() === capture.organization.trim().toLocaleLowerCase())),
  );
}
// This function is self-contained because executeScript serializes it into the selected page.
export function readPageCapture(): Partial<Capture> {
  const metadata = {
    organization:
      document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content ?? '',
    selectedText: window.getSelection()?.toString().slice(0, 6000) ?? '',
  };
  let visited = 0;
  function find(value: unknown, depth = 0): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || depth > 8 || visited++ > 500) return;
    if (Array.isArray(value)) {
      for (const entry of value) {
        const result = find(entry, depth + 1);
        if (result) return result;
      }
      return;
    }
    const record = value as Record<string, unknown>;
    if ([record['@type']].flat().includes('JobPosting')) return record;
    for (const entry of Object.values(record)) {
      const result = find(entry, depth + 1);
      if (result) return result;
    }
  }
  for (const script of Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  ).slice(0, 15)) {
    if ((script.textContent?.length ?? 0) > 200000) continue;
    try {
      const job = find(JSON.parse(script.textContent ?? 'null'));
      if (!job) continue;
      const org = job.hiringOrganization as { name?: unknown } | undefined;
      const address = (job.jobLocation as { address?: { addressCountry?: unknown } } | undefined)
        ?.address;
      return {
        ...metadata,
        organization: typeof org?.name === 'string' ? org.name : metadata.organization,
        title: typeof job.title === 'string' ? job.title : undefined,
        deadline: typeof job.validThrough === 'string' ? job.validThrough.slice(0, 10) : undefined,
        country: typeof address?.addressCountry === 'string' ? address.addressCountry : undefined,
      };
    } catch {
      /* Invalid page metadata is ignored; the user can enter fields manually. */
    }
  }
  return metadata;
}
export async function capturePage(tabId?: number): Promise<Capture> {
  if (!maybeExtensionApi()?.tabs) return { title: '', organization: '' };
  try {
    const tab = tabId
      ? await extensionApi().tabs.get(tabId)
      : (await extensionApi().tabs.query({ active: true, currentWindow: true }))[0];
    if (!tab?.url || !/^https?:\/\//.test(tab.url)) return { title: '', organization: '' };
    let organization = new URL(tab.url).hostname.replace(/^www\./, '');
    let details: Partial<Capture> = {};
    if (tab.id) {
      try {
        const result = await extensionApi().scripting.executeScript({
          target: { tabId: tab.id },
          func: readPageCapture,
        });
        const raw = result[0]?.result;
        if (raw && typeof raw === 'object') {
          organization =
            typeof raw.organization === 'string'
              ? raw.organization.trim().slice(0, 500) || organization
              : organization;
          details = {
            ...(typeof raw.title === 'string' ? { title: raw.title.slice(0, 500) } : {}),
            ...(typeof raw.selectedText === 'string' && raw.selectedText
              ? { selectedText: raw.selectedText.slice(0, 6000) }
              : {}),
            ...(typeof raw.country === 'string' ? { country: raw.country.slice(0, 200) } : {}),
            ...(daySchema.safeParse(raw.deadline).success
              ? {
                  deadline: raw.deadline,
                  deadlineSource: 'Page structured data: JobPosting.validThrough',
                }
              : {}),
          };
        }
      } catch {
        /* Restricted pages still provide their tab title and URL. */
      }
    }
    return {
      title: (tab.title ?? organization).slice(0, 500),
      url: normalizeCaptureUrl(tab.url),
      organization,
      ...details,
    };
  } catch {
    return { title: '', organization: '' };
  }
}
export async function openCapture(tabId?: number) {
  const capture = await capturePage(tabId);
  const query = new URLSearchParams({
    capture: '1',
    title: capture.title,
    organization: capture.organization,
    ...(capture.url ? { url: capture.url } : {}),
    ...(capture.deadline
      ? { deadline: capture.deadline, deadlineSource: capture.deadlineSource ?? '' }
      : {}),
    ...(capture.selectedText ? { selectedText: capture.selectedText } : {}),
    ...(capture.country ? { country: capture.country } : {}),
  });
  await extensionApi().tabs.create({
    url: `${extensionApi().runtime.getURL('options.html')}?${query}`,
  });
}
export function openDashboard(id?: string, view?: string) {
  const hash = id
    ? `#item=${encodeURIComponent(id)}`
    : view
      ? `#view=${encodeURIComponent(view)}`
      : '';
  if (maybeExtensionApi()?.tabs)
    void extensionApi().tabs.create({
      url: `${extensionApi().runtime.getURL('options.html')}${hash}`,
    });
  else window.open(`/options.html${hash}`, '_blank', 'noopener');
}
