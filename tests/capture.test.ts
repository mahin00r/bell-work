import { afterEach, expect, it, vi } from 'vitest';
import { capturePage, openCapture } from '../src/shared/capture';
afterEach(() => vi.unstubAllGlobals());
function browser(url = 'https://example.org/jobs') {
  const tabs = {
    query: vi.fn().mockResolvedValue([{ id: 12, title: 'Design fellow', url }]),
    get: vi.fn().mockResolvedValue({ id: 12, title: 'Design fellow', url }),
    create: vi.fn().mockResolvedValue({}),
  };
  const scripting = {
    executeScript: vi.fn().mockResolvedValue([{ result: { organization: 'Northwind Labs' } }]),
  };
  vi.stubGlobal('chrome', {
    tabs,
    scripting,
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
  });
  return { tabs, scripting };
}
it('reads the active page only when capture is requested', async () => {
  const { tabs, scripting } = browser();
  expect(tabs.query).not.toHaveBeenCalled();
  expect(await capturePage()).toEqual({
    title: 'Design fellow',
    organization: 'Northwind Labs',
    url: 'https://example.org/jobs',
  });
  expect(tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
  expect(scripting.executeScript).toHaveBeenCalledOnce();
});
it('uses the Firefox promise namespace when chrome is unavailable', async () => {
  const { tabs } = browser();
  const firefox = Reflect.get(globalThis, 'chrome');
  vi.stubGlobal('browser', firefox);
  vi.stubGlobal('chrome', undefined);
  expect((await capturePage()).organization).toBe('Northwind Labs');
  expect(tabs.query).toHaveBeenCalledOnce();
});
it('uses a hostname fallback and skips restricted pages', async () => {
  const { scripting } = browser();
  scripting.executeScript.mockRejectedValueOnce(new Error('Restricted'));
  expect((await capturePage()).organization).toBe('example.org');
  const restricted = browser('chrome://settings');
  expect(await capturePage()).toEqual({ title: '', organization: '' });
  expect(restricted.scripting.executeScript).not.toHaveBeenCalled();
});
it('opens the dashboard with an encoded capture form', async () => {
  const { tabs } = browser();
  await openCapture(12);
  const url = new URL(tabs.create.mock.calls[0][0].url as string);
  expect(url.searchParams.get('capture')).toBe('1');
  expect(url.searchParams.get('title')).toBe('Design fellow');
  expect(url.searchParams.get('organization')).toBe('Northwind Labs');
});
