// Firefox exposes promise-based APIs on browser; Chromium exposes them on chrome.
// Resolve on demand so browserless previews and isolated tests can supply their own port.
export function maybeExtensionApi(): typeof chrome | undefined {
  const globals = globalThis as typeof globalThis & {
    browser?: typeof chrome;
    chrome?: typeof chrome;
  };
  return globals.browser ?? globals.chrome;
}
export function extensionApi(): typeof chrome {
  const api = maybeExtensionApi();
  if (!api) throw new Error('Extension APIs are unavailable.');
  return api;
}
