/// <reference types="chrome" />

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'open-tool') {
    const { route, input } = message;
    showModal(route, input);
  }
  else if (message.action === 'open-main-page') {
    // Open the main tools page (no specific route)
    showModal('', '');
  }
});

function showModal(route: string, input: string) {
  // If modal already exists, remove it first
  const existing = document.getElementById('__it-tools-ext');
  if (existing) {
    existing.remove();
  }

  const host = document.createElement('div');
  host.id = '__it-tools-ext';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Styles for Shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
    }
    iframe {
      width: 90%;
      height: 85%;
      border: none;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
      background-color: white;
    }
  `;
  shadow.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const iframe = document.createElement('iframe');
  const baseUrl = chrome.runtime.getURL('index.html');
  // When no route is specified, navigate to the home page (all tools)
  let extensionUrl: string;
  if (route) {
    const encodedInput = encodeURIComponent(input);
    extensionUrl = `${baseUrl}#/${route}?input=${encodedInput}&mode=modal`;
  }
  else {
    extensionUrl = `${baseUrl}#/`;
  }
  iframe.src = extensionUrl;

  overlay.appendChild(iframe);
  shadow.appendChild(overlay);

  // Dismiss when clicking the overlay (outside iframe)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      host.remove();
    }
  });

  // Dismiss when Escape key is pressed
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      host.remove();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}
