/// <reference types="chrome" />

// Register context menu items on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'it-tools',
    title: 'IT Tools',
    contexts: ['selection', 'link', 'page'],
  });

  // "Open All Tools" is available in every context
  chrome.contextMenus.create({
    parentId: 'it-tools',
    id: 'open-all-tools',
    title: 'Open All Tools',
    contexts: ['selection', 'link', 'page'],
  });

  // Separator (visual grouping via a disabled item is not supported in MV3, so order suffices)
  chrome.contextMenus.create({
    parentId: 'it-tools',
    id: 'qr',
    title: 'Generate QR Code',
    // 'page' allows right-click on blank page area; falls back to current URL
    contexts: ['selection', 'link', 'page'],
  });

  chrome.contextMenus.create({
    parentId: 'it-tools',
    id: 'stats',
    title: 'Text Statistics',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    parentId: 'it-tools',
    id: 'datetime',
    title: 'Date-Time Converter',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    parentId: 'it-tools',
    id: 'base64',
    title: 'Base64 Encode',
    contexts: ['selection'],
  });
});

// Listen to menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) {
    return;
  }

  // "Open All Tools" opens the main page (no specific tool)
  if (info.menuItemId === 'open-all-tools') {
    chrome.tabs.sendMessage(tab.id, { action: 'open-main-page' }).catch(err => console.warn(err));
    return;
  }

  // Determine the input payload:
  // 1. For QR: prefer link URL, then selection, then fall back to current tab URL
  // 2. For other tools: use selection text
  let payload = '';
  if (info.menuItemId === 'qr') {
    payload = info.linkUrl ?? info.selectionText ?? tab.url ?? '';
  }
  else if (info.selectionText) {
    payload = info.selectionText;
  }

  const toolMap: Record<string, string> = {
    qr: 'qrcode-generator',
    stats: 'text-statistics',
    datetime: 'date-converter',
    base64: 'base64-string-converter',
  };

  const targetRoute = toolMap[info.menuItemId as string];
  if (targetRoute) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'open-tool',
      route: targetRoute,
      input: payload,
    }).catch(err => console.warn(err));
  }
});
