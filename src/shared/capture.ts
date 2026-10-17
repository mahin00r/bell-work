export interface Capture {
  title: string;
  url?: string;
  organization: string;
}
export async function capturePage(tabId?: number): Promise<Capture> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return { title: '', organization: '' };
  try {
    const tab = tabId
      ? await chrome.tabs.get(tabId)
      : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!tab?.url || !/^https?:\/\//.test(tab.url)) return { title: '', organization: '' };
    let organization = new URL(tab.url).hostname.replace(/^www\./, '');
    if (tab.id) {
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () =>
            document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content ?? '',
        });
        organization = result[0]?.result?.trim().slice(0, 500) || organization;
      } catch {
        /* Restricted pages still provide their tab title and URL. */
      }
    }
    return { title: (tab.title ?? organization).slice(0, 500), url: tab.url, organization };
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
  });
  await chrome.tabs.create({ url: `${chrome.runtime.getURL('options.html')}?${query}` });
}
export function openDashboard(id?: string, view?: string) {
  const hash = id
    ? `#item=${encodeURIComponent(id)}`
    : view
      ? `#view=${encodeURIComponent(view)}`
      : '';
  if (typeof chrome !== 'undefined' && chrome.tabs)
    void chrome.tabs.create({
      url: `${chrome.runtime.getURL('options.html')}${hash}`,
    });
  else window.open(`/options.html${hash}`, '_blank', 'noopener');
}
