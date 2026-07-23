interface VscodeApi {
  postMessage(data: unknown): void
}

/**
 * Returns the VS Code API injected by the extension host init script,
 * or null when running outside a VS Code webview (web app, Chrome extension).
 */
export function useVscodeApi(): VscodeApi | null {
  return (window as Window & { __vscodeApi?: VscodeApi }).__vscodeApi ?? null;
}
