/* ===== SilkWeb Agents - Background Service Worker ===== */

const DEFAULT_API_BASE = 'https://api.silkweb.io';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/* ===== Context Menus ===== */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'silkweb-scan-page',
    title: 'Scan this page with AEGIS',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'silkweb-analyze-text',
    title: 'Analyze selected text with JUSTICE',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'silkweb-check-domain',
    title: 'Check domain with PHANTOM',
    contexts: ['page']
  });
});

/* ===== Context Menu Click Handlers ===== */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'silkweb-scan-page':
      await handleContextAction(
        '/agents/aegis/scan/url',
        { url: tab.url },
        tab.id
      );
      break;

    case 'silkweb-analyze-text':
      await handleContextAction(
        '/agents/justice/analyze/contract',
        { text: info.selectionText },
        tab.id
      );
      break;

    case 'silkweb-check-domain':
      const domain = new URL(tab.url).hostname;
      await handleContextAction(
        '/agents/phantom/investigate/domain',
        { domain },
        tab.id
      );
      break;
  }
});

/* ===== Handle Context Menu Action ===== */
async function handleContextAction(endpoint, payload, tabId) {
  try {
    const result = await makeApiCall(endpoint, payload);

    // Cache the result
    const cacheKey = `result_${endpoint}_${JSON.stringify(payload)}`;
    await chrome.storage.local.set({
      [cacheKey]: {
        data: result,
        timestamp: Date.now()
      }
    });

    // Send result to content script for display
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_RESULT',
      agent: endpoint.split('/')[2].toUpperCase(),
      data: result
    });
  } catch (err) {
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_ERROR',
      error: err.message
    });
  }
}

/* ===== Message Listener ===== */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'API_CALL') {
    handleApiCall(message.endpoint, message.payload)
      .then(data => sendResponse({ data }))
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_PAGE_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ url: tabs[0]?.url || '' });
    });
    return true;
  }
});

/* ===== API Call Handler with Caching ===== */
async function handleApiCall(endpoint, payload) {
  // Check cache first
  const cacheKey = `result_${endpoint}_${JSON.stringify(payload)}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const result = await makeApiCall(endpoint, payload);

  // Store in cache
  await chrome.storage.local.set({
    [cacheKey]: {
      data: result,
      timestamp: Date.now()
    }
  });

  return result;
}

/* ===== Cache Retrieval ===== */
async function getCached(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      const entry = result[key];
      if (entry && (Date.now() - entry.timestamp) < CACHE_TTL) {
        resolve(entry.data);
      } else {
        // Clean up expired entry
        if (entry) chrome.storage.local.remove(key);
        resolve(null);
      }
    });
  });
}

/* ===== Make API Call ===== */
async function makeApiCall(endpoint, payload) {
  const settings = await getSettings();
  const baseUrl = settings.apiBaseUrl || DEFAULT_API_BASE;
  const apiKey = settings.apiKey || '';

  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `API Error ${response.status}: ${errorBody || response.statusText}`
    );
  }

  return response.json();
}

/* ===== Get Settings ===== */
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiBaseUrl', 'apiKey', 'showFab'], (data) => {
      resolve(data || {});
    });
  });
}

/* ===== Periodic Cache Cleanup ===== */
chrome.alarms.create('cache-cleanup', { periodInMinutes: 10 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cache-cleanup') {
    cleanupCache();
  }
});

async function cleanupCache() {
  const all = await chrome.storage.local.get(null);
  const keysToRemove = [];

  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith('result_') && value.timestamp) {
      if (Date.now() - value.timestamp > CACHE_TTL) {
        keysToRemove.push(key);
      }
    }
  }

  if (keysToRemove.length > 0) {
    chrome.storage.local.remove(keysToRemove);
  }
}
