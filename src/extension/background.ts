/// <reference types="chrome" />

// Register context menu items on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'it-tools',
    title: 'IT Tools',
    contexts: ['selection', 'link'],
  });

  chrome.contextMenus.create({
    parentId: 'it-tools',
    id: 'qr',
    title: 'Generate QR Code',
    contexts: ['selection', 'link'],
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

  let payload = '';
  if (info.menuItemId === 'qr' && info.linkUrl) {
    payload = info.linkUrl;
  }
  else if (info.selectionText) {
    payload = info.selectionText;
  }

  const toolMap: Record<string, string> = {
    qr: 'qr-code-generator',
    stats: 'text-statistics',
    datetime: 'date-time-converter',
    base64: 'base64-string-converter',
  };

  const targetRoute = toolMap[info.menuItemId];
  if (targetRoute) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'open-tool',
      route: targetRoute,
      input: payload,
    });
  }
});
