// background.js

// Default settings
const DEFAULT_SETTINGS = {
  showNotification: true,
  showUploadNotification: true,
  showUpdateNotification: true,
  imageLocation: 'chat',
  osuLocation: 'panel',
  textLocation: 'chat',
  checkUpdates: true,
  language: 'en'
};

// Listen for messages from options page or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      sendResponse({ settings });
    });
    return true; // Will respond asynchronously
  }

  if (request.action === 'saveSetting') {
    const { key, value } = request;
    const obj = {};
    obj[key] = value;
    chrome.storage.sync.set(obj, () => {
      if (chrome.runtime.lastError) {
        console.error('[TwitchTweaks] Error saving setting:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log(`[TwitchTweaks] Setting saved: ${key} =`, value);
        sendResponse({ success: true });
      }
    });
    return true; // Will respond asynchronously
  }
});

// On install, set default settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
    if (Object.keys(result).length === 0) {
      chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
        console.log('[TwitchTweaks] Default settings initialized.');
      });
    }
  });
});

// ✅ Новый слушатель: клик по иконке расширения в тулбаре
chrome.action.onClicked.addListener((tab) => {
  // Открываем options.html в новой вкладке
  chrome.tabs.create({ url: chrome.runtime.getURL('s/options.html') });
});