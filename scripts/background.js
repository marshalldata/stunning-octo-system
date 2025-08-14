// scripts/background.js - FIXED VERSION
console.log('CodeGrab Pro background service worker loaded');

// Storage for scanned code blocks
let scanResults = {};

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('CodeGrab Pro installed:', details);
  
  // Create context menus
  chrome.contextMenus.create({
    id: 'codegrab-scan',
    title: 'Scan for Code Blocks',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'codegrab-settings',
    title: 'CodeGrab Settings',
    contexts: ['action']
  });

  // Set default settings
  if (details.reason === 'install') {
    const defaultSettings = {
      theme: 'auto',
      autoScan: true,
      minCodeLength: 10,
      maxCodeBlocks: 50,
      syntaxHighlighting: true,
      showLineNumbers: true
    };
    
    chrome.storage.sync.set({ codeGrabSettings: defaultSettings });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'codegrab-scan') {
    scanPage(tab.id);
  } else if (info.menuItemId === 'codegrab-settings') {
    chrome.runtime.openOptionsPage();
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'scan-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        scanPage(tabs[0].id);
      }
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.action === 'scanResults') {
    const tabId = sender.tab.id;
    const results = message.payload;
    
    // Store results
    scanResults[tabId] = {
      blocks: results,
      timestamp: Date.now(),
      url: sender.tab.url,
      title: sender.tab.title
    };
    
    // Update badge
    updateBadge(tabId, results.length);
    
    // Store in chrome.storage for popup access
    chrome.storage.session.set({
      [`scanResults_${tabId}`]: scanResults[tabId]
    });
    
    sendResponse({ success: true, count: results.length });
    
  } else if (message.action === 'getScanResults') {
    const tabId = message.tabId;
    if (scanResults[tabId]) {
      sendResponse(scanResults[tabId]);
    } else {
      // Try to get from storage
      chrome.storage.session.get(`scanResults_${tabId}`, (result) => {
        sendResponse(result[`scanResults_${tabId}`] || null);
      });
      return true; // Will respond asynchronously
    }
    
  } else if (message.action === 'clearResults') {
    const tabId = message.tabId;
    delete scanResults[tabId];
    updateBadge(tabId, 0);
    chrome.storage.session.remove(`scanResults_${tabId}`);
    sendResponse({ success: true });
    
  } else if (message.action === 'downloadFile') {
    // ✅ FIXED DOWNLOAD FUNCTION
    handleDownload(message.payload, sendResponse);
    return true; // Will respond asynchronously
    
  } else if (message.action === 'getSettings') {
    chrome.storage.sync.get('codeGrabSettings', (result) => {
      sendResponse(result.codeGrabSettings || {});
    });
    return true; // Will respond asynchronously
    
  } else if (message.action === 'saveSettings') {
    chrome.storage.sync.set({ codeGrabSettings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true; // Will respond asynchronously
  }
});

// ✅ FIXED: New download handler function
async function handleDownload(payload, sendResponse) {
  try {
    const { filename, content, mimeType } = payload;
    
    // Create blob data URL
    const blob = new Blob([content], { type: mimeType || 'text/plain' });
    
    // Convert blob to data URL (works better in service workers)
    const reader = new FileReader();
    reader.onload = function() {
      const dataUrl = reader.result;
      
      // Use chrome.downloads API
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('Download started:', downloadId);
          sendResponse({ success: true, downloadId: downloadId });
        }
      });
    };
    
    reader.onerror = function() {
      console.error('FileReader error:', reader.error);
      sendResponse({ success: false, error: 'Failed to process file' });
    };
    
    reader.readAsDataURL(blob);
    
  } catch (error) {
    console.error('Download failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Scan page function
async function scanPage(tabId) {
  try {
    // Inject content script if not already present
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/content.js']
    });
    
    // Send scan message
    chrome.tabs.sendMessage(tabId, { action: 'startScan' });
    
  } catch (error) {
    console.error('Failed to scan page:', error);
  }
}

// Update badge with code block count
function updateBadge(tabId, count) {
  const text = count > 0 ? count.toString() : '';
  const color = count > 0 ? '#4CAF50' : '#757575';
  
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
}

// Clear badge when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete scanResults[tabId];
  chrome.storage.session.remove(`scanResults_${tabId}`);
});

// Auto-scan on page load (if enabled)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    chrome.storage.sync.get('codeGrabSettings', (result) => {
      const settings = result.codeGrabSettings || {};
      if (settings.autoScan) {
        setTimeout(() => scanPage(tabId), 2000); // Delay for page to fully load
      }
    });
  }
});