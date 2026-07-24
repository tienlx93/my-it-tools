// src/vscode-extension/extension.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

const TOOL_MAP: Record<string, { route: string; label: string }> = {
  'my-it-tools.qr': { route: 'qrcode-generator', label: 'Generate QR Code' },
  'my-it-tools.stats': { route: 'text-statistics', label: 'Text Statistics' },
  'my-it-tools.datetime': { route: 'date-converter', label: 'Date-Time Converter' },
  'my-it-tools.base64': { route: 'base64-string-converter', label: 'Base64 Encode' },
  'my-it-tools.json': { route: 'json-prettify', label: 'JSON Viewer' },
  'my-it-tools.url': { route: 'url-encoder', label: 'URL Encoder' },
  'my-it-tools.hash': { route: 'hash-text', label: 'Hash Text' },
  'my-it-tools.slugify': { route: 'slugify-string', label: 'Slugify String' },
};

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  for (const [commandId, tool] of Object.entries(TOOL_MAP)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(commandId, () => {
        const editor = vscode.window.activeTextEditor;
        const selected = editor ? editor.document.getText(editor.selection) : '';
        openPanel(context, tool.route, tool.label, selected);
      }),
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('my-it-tools.openAll', () => {
      openPanel(context, '', 'IT Tools', '');
    }),
  );
}

function openPanel(
  context: vscode.ExtensionContext,
  route: string,
  label: string,
  input: string,
): void {
  const webviewDir = vscode.Uri.joinPath(context.extensionUri, 'webview');
  const title = route ? `IT Tools \u2014 ${label}` : 'IT Tools';

  const encodedInput = encodeURIComponent(input);
  const hash = route ? `/${route}?input=${encodedInput}&mode=vscode` : '/?mode=vscode';

  if (currentPanel) {
    currentPanel.title = title;
    currentPanel.webview.html = buildHtml(currentPanel.webview, webviewDir, route, input);
    void currentPanel.webview.postMessage({ command: 'navigate', hash });
    currentPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'my-it-tools',
    title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [webviewDir],
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = buildHtml(panel.webview, webviewDir, route, input);

  panel.webview.onDidReceiveMessage((msg: { command: string; url: string }) => {
    if (msg.command === 'openInBrowser') {
      void vscode.env.openExternal(vscode.Uri.parse(msg.url));
    }
  });

  panel.onDidDispose(() => {
    currentPanel = undefined;
  }, null, context.subscriptions);

  currentPanel = panel;
}

function buildHtml(
  webview: vscode.Webview,
  webviewDir: vscode.Uri,
  route: string,
  input: string,
): string {
  const indexPath = path.join(webviewDir.fsPath, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Prepare baseUri without trailing slash
  const baseUriStr = webview.asWebviewUri(webviewDir).toString();
  const baseUri = baseUriStr.endsWith('/') ? baseUriStr.slice(0, -1) : baseUriStr;

  // Rewrite relative src and href attributes to explicit webview resource URIs
  // Note: Do NOT inject a <base href> tag because it breaks window.history.replaceState origin checks in Webviews.
  html = html.replace(/(src|href)="(\.\/[^"]+|assets\/[^"]+|[a-zA-Z0-9_.-]+\.(?:ico|png|svg|js|css))"/g, (match, attr, relPath) => {
    if (relPath.startsWith('http://') || relPath.startsWith('https://')) {
      return match;
    }
    const cleanPath = relPath.replace(/^\.\//, '');
    return `${attr}="${baseUri}/${cleanPath}"`;
  });

  // Build hash path for the Vue router
  const encodedInput = encodeURIComponent(input);
  const hash = route ? `/${route}?input=${encodedInput}&mode=vscode` : '/?mode=vscode';

  // Inject CSP meta tag and init script
  const csp = `default-src 'none'; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:; img-src ${webview.cspSource} data: blob:; connect-src ${webview.cspSource} data:; frame-src ${webview.cspSource} 'self' blob: data:; child-src ${webview.cspSource} 'self' blob: data:;`;
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

  // Inject init script: acquire vscode API + set initial hash before Vue boots
  const initScript = `<script>
try { window.__vscodeApi = acquireVsCodeApi(); } catch(e) {}
window.location.hash = ${JSON.stringify(hash)};
window.addEventListener('message', event => {
  const message = event.data;
  if (message && message.command === 'navigate') {
    window.location.hash = message.hash;
  }
});
<\/script>`;

  html = html.replace('</head>', `${cspMeta}\n${initScript}\n</head>`);

  return html;
}

export function deactivate(): void {
  currentPanel?.dispose();
}
