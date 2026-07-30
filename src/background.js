importScripts("lib/url-cleaner.js");
importScripts("lib/translate.js");

const SPLIT_RATIO = 0.5;
const MIN_SPLIT_HEIGHT = 600;
const windowHistory = new Map();
const BADGE_BG_COLOR = "#0B0B0B";
let badgeRefreshTimer = null;
const windowGroupHistory = new Map();
const windowActiveGroup = new Map();

chrome.runtime.onInstalled.addListener(() => {
  logCommandShortcuts();
  scheduleBadgeRefresh();
});

chrome.runtime.onStartup.addListener(() => {
  logCommandShortcuts();
  scheduleBadgeRefresh();
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  const previous = windowHistory.get(windowId);
  if (previous) {
    if (previous.currentTabId !== tabId) {
      windowHistory.set(windowId, { currentTabId: tabId, lastTabId: previous.currentTabId });
    }
  } else {
    windowHistory.set(windowId, { currentTabId: tabId, lastTabId: null });
  }

  // Auto-collapse group feature
  await handleAutoCollapseGroups(tabId, windowId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [windowId, state] of windowHistory.entries()) {
    if (state.currentTabId === tabId || state.lastTabId === tabId) {
      windowHistory.set(windowId, {
        currentTabId: state.currentTabId === tabId ? null : state.currentTabId,
        lastTabId: state.lastTabId === tabId ? null : state.lastTabId
      });
    }
  }

  windowGroupHistory.delete(tabId);
  scheduleBadgeRefresh();
});

chrome.tabs.onCreated.addListener(() => {
  scheduleBadgeRefresh();
});

chrome.windows.onCreated.addListener(() => {
  scheduleBadgeRefresh();
});

chrome.windows.onRemoved.addListener(() => {
  scheduleBadgeRefresh();
});

scheduleBadgeRefresh();

const actionApi = chrome?.action || chrome?.browserAction;
if (actionApi?.onClicked) {
  actionApi.onClicked.addListener(() => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      void openChromeUrl("chrome://extensions/shortcuts");
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "OPEN_LINK_SPLIT" && typeof message.url === "string") {
    openLinkInSplitWindow(message.url, sender.tab?.windowId);
    return;
  }

  if (message.type === "DETACH_CURRENT_TAB") {
    detachCurrentTab(sender.tab?.id);
    return;
  }

  if (message.type === "SELECT_PREVIOUS_TAB") {
    selectAdjacentTab(-1);
    return;
  }

  if (message.type === "SELECT_NEXT_TAB") {
    selectAdjacentTab(1);
    return;
  }

  if (message.type === "OPTIONS_UPDATED") {
    scheduleBadgeRefresh();
    return;
  }

  if (message.type === "TRANSLATE_REQUEST" && typeof message.text === "string") {
    if (message.inline) {
      // Options page test runner expects a direct response
      void translateInline(message.text, sendResponse);
      return true; // keep channel open for async sendResponse
    }
    translateForContentScript(message.text, sender.tab?.id);
  }

  if (message.type === "GROUP_COLLAPSED") {
    windowGroupHistory.delete(message.tabId);
    return;
  }
});

async function translateInline(text, sendResponse) {
  try {
    const config = await getTranslateConfig();
    if (!config.feature_translate) {
      sendResponse({ error: "disabled" });
      return;
    }
    const result = await Translator.translate(text, config.translate_target_lang, config.translate_api);
    sendResponse({ ok: true, result });
  } catch (err) {
    sendResponse({ error: String(err?.message || err) });
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "c14-detach-current-tab") {
    await detachCurrentTab();
    return;
  }

  if (command === "c16-toggle-autocopy") {
    await toggleAutoCopy();
    return;
  }

  if (command === "c17-copy-cleaned-url") {
    await copyCleanedActiveTabUrl();
    return;
  }

  if (command === "c18-dedup-tabs") {
    await dedupTabsAuto();
    return;
  }

  if (command === "c19-translate-selection") {
    await triggerTranslateSelection();
    return;
  }

  if (command === "g01-split-active-tab-simulated") {
    await splitActiveTabSimulated();
    return;
  }

  if (command === "g02-native-split-view") {
    // Chrome native Split View is handled by Chrome itself (Cmd+Option+N on Mac).
    // This command is intentionally a placeholder entry in chrome://extensions/shortcuts.
    return;
  }

  if (command === "d01-navigate-last-active-tab") {
    await navigateToLastActiveTab();
    return;
  }

  if (command === "d02-select-first-tab") {
    await selectTabBoundary("first");
    return;
  }

  if (command === "d03-select-last-tab") {
    await selectTabBoundary("last");
    return;
  }

  if (command === "c09-toggle-pin-tab") {
    await togglePinActiveTab();
    return;
  }

  if (command === "d08-search-and-jump") {
    await searchAndJump();
    return;
  }

  if (command === "d09-search-in-background") {
    await searchInBackground();
    return;
  }

  if (command === "d04-select-previous-tab") {
    await selectAdjacentTab(-1);
    return;
  }

  if (command === "d05-select-next-tab") {
    await selectAdjacentTab(1);
    return;
  }

  if (command === "c05-move-current-tab-left") {
    await moveCurrentTabBy(-1);
    return;
  }

  if (command === "c06-move-current-tab-right") {
    await moveCurrentTabBy(1);
    return;
  }

  if (command === "c07-move-current-tab-first") {
    await moveCurrentTabToBoundary("first");
    return;
  }

  if (command === "c08-move-current-tab-last") {
    await moveCurrentTabToBoundary("last");
    return;
  }

  if (command === "c03-close-current-tab") {
    await closeCurrentTab();
    return;
  }

  if (command === "c01-new-tab") {
    await createNewTab();
    return;
  }

  if (command === "b01-new-window") {
    await chrome.windows.create({ focused: true });
    return;
  }

  if (command === "b02-new-incognito-window") {
    await chrome.windows.create({ focused: true, incognito: true });
    return;
  }

  if (command === "c04-duplicate-current-tab") {
    await duplicateCurrentTab();
    return;
  }

  if (command === "c11-reload-current-tab") {
    await reloadCurrentTab();
    return;
  }

  if (command === "c12-hard-reload-current-tab") {
    await hardReloadCurrentTab();
    return;
  }

  if (command === "c13-unload-current-tab") {
    await unloadCurrentTab();
    return;
  }

  if (command === "d06-go-back-page") {
    await goBackCurrentTab();
    return;
  }

  if (command === "d07-go-forward-page") {
    await goForwardCurrentTab();
    return;
  }

  if (command === "c10-toggle-mute-tab") {
    await toggleMuteActiveTab();
    return;
  }

  if (command === "a01-open-chrome-bookmarks") {
    await openChromeUrl("chrome://bookmarks");
    return;
  }

  if (command === "a02-open-chrome-downloads") {
    await openChromeUrl("chrome://downloads");
    return;
  }

  if (command === "a05-open-chrome-extensions") {
    await openChromeUrl("chrome://extensions");
    return;
  }

  if (command === "a06-open-extension-shortcuts") {
    await openChromeUrl("chrome://extensions/shortcuts");
    return;
  }

  if (command === "a07-open-chrome-flags") {
    await openChromeUrl("chrome://flags");
    return;
  }

  if (command === "a08-open-chrome-help") {
    await openChromeUrl("chrome://help");
    return;
  }

  if (command === "a03-open-chrome-history") {
    await openChromeUrl("chrome://history");
    return;
  }

  if (command === "a04-open-chrome-settings") {
    await openChromeUrl("chrome://settings");
    return;
  }

  // Unmatched commands are native-Chrome reference entries listed for memory only.
});

async function openLinkInSplitWindow(url, sourceWindowId) {
  try {
    const sourceWindow = await getSourceWindow(sourceWindowId);

    if (!sourceWindow || !sourceWindow.id) {
      await chrome.windows.create({ url, focused: true });
      return;
    }

    if (sourceWindow.state && sourceWindow.state !== "normal") {
      await chrome.windows.update(sourceWindow.id, { state: "normal" });
    }

    const normalizedSourceWindow = await chrome.windows.get(sourceWindow.id);
    const width = normalizedSourceWindow.width || 1400;
    const height = normalizedSourceWindow.height || 900;
    const left =
      typeof normalizedSourceWindow.left === "number" ? normalizedSourceWindow.left : 0;
    const top = typeof normalizedSourceWindow.top === "number" ? normalizedSourceWindow.top : 0;

    const leftWidth = Math.floor(width * SPLIT_RATIO);
    const rightWidth = Math.max(1, width - leftWidth);

    await chrome.windows.update(sourceWindow.id, {
      focused: false,
      left,
      top,
      width: leftWidth,
      height: Math.max(MIN_SPLIT_HEIGHT, height)
    });

    await chrome.windows.create({
      url,
      focused: true,
      left: left + leftWidth,
      top,
      width: rightWidth,
      height: Math.max(MIN_SPLIT_HEIGHT, height)
    });
  } catch (error) {
    console.error("[PK Shortcuts] OPEN_LINK_SPLIT failed:", error);
  }
}

async function detachCurrentTab(fallbackTabId) {
  try {
    let tabId = fallbackTabId;

    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      tabId = activeTab?.id;
    }

    if (!tabId) {
      return;
    }

    await chrome.windows.create({ tabId, focused: true });
  } catch (error) {
    console.error("[PK Shortcuts] DETACH_CURRENT_TAB failed:", error);
  }
}

async function splitActiveTabSimulated() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab?.url || !activeTab.windowId) {
      return;
    }

    await openLinkInSplitWindow(activeTab.url, activeTab.windowId);
  } catch (error) {
    console.error("[PK Shortcuts] SPLIT_ACTIVE_TAB_SIMULATED failed:", error);
  }
}

async function getSourceWindow(sourceWindowId) {
  try {
    if (sourceWindowId) {
      return await chrome.windows.get(sourceWindowId);
    }

    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab?.windowId) {
      return null;
    }

    return await chrome.windows.get(activeTab.windowId);
  } catch {
    return null;
  }
}

async function navigateToLastActiveTab() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab?.windowId || !activeTab.id) {
      return;
    }

    const state = windowHistory.get(activeTab.windowId);
    const targetTabId = state?.lastTabId;
    if (!targetTabId || targetTabId === activeTab.id) {
      return;
    }

    await chrome.tabs.update(targetTabId, { active: true });
    await chrome.windows.update(activeTab.windowId, { focused: true });
  } catch (error) {
    console.error("[PK Shortcuts] NAVIGATE_LAST_ACTIVE_TAB failed:", error);
  }
}

async function togglePinActiveTab() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id) {
      return;
    }

    await chrome.tabs.update(activeTab.id, { pinned: !Boolean(activeTab.pinned) });
  } catch (error) {
    console.error("[PK Shortcuts] TOGGLE_PIN_TAB failed:", error);
  }
}

async function toggleMuteActiveTab() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id) {
      return;
    }

    const isMuted = Boolean(activeTab.mutedInfo?.muted);
    await chrome.tabs.update(activeTab.id, { muted: !isMuted });
  } catch (error) {
    console.error("[PK Shortcuts] TOGGLE_MUTE_TAB failed:", error);
  }
}

async function selectAdjacentTab(direction) {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.windowId || typeof activeTab.index !== "number") {
      return;
    }

    const tabs = await chrome.tabs.query({ windowId: activeTab.windowId });
    if (!tabs || tabs.length <= 1) {
      return;
    }

    const sorted = [...tabs].sort((a, b) => (a.index || 0) - (b.index || 0));
    const currentIndex = sorted.findIndex((tab) => tab.id === activeTab.id);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = (currentIndex + direction + sorted.length) % sorted.length;
    const targetTab = sorted[targetIndex];
    if (targetTab?.id) {
      await chrome.tabs.update(targetTab.id, { active: true });
    }
  } catch (error) {
    console.error("[PK Shortcuts] SELECT_ADJACENT_TAB failed:", error);
  }
}

async function selectTabBoundary(boundary) {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.windowId) {
      return;
    }

    const tabs = await chrome.tabs.query({ windowId: activeTab.windowId });
    if (!tabs || tabs.length === 0) {
      return;
    }

    const sorted = [...tabs].sort((a, b) => (a.index || 0) - (b.index || 0));
    const targetTab = boundary === "first" ? sorted[0] : sorted[sorted.length - 1];
    if (targetTab?.id) {
      await chrome.tabs.update(targetTab.id, { active: true });
    }
  } catch (error) {
    console.error("[PK Shortcuts] SELECT_TAB_BOUNDARY failed:", error);
  }
}

async function moveCurrentTabBy(delta) {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id || !activeTab.windowId || typeof activeTab.index !== "number") {
      return;
    }

    const tabs = await chrome.tabs.query({ windowId: activeTab.windowId });
    const lastIndex = Math.max(0, tabs.length - 1);
    const targetIndex = Math.max(0, Math.min(lastIndex, activeTab.index + delta));
    if (targetIndex === activeTab.index) {
      return;
    }

    await chrome.tabs.move(activeTab.id, { index: targetIndex });
    await chrome.tabs.update(activeTab.id, { active: true });
  } catch (error) {
    console.error("[PK Shortcuts] MOVE_CURRENT_TAB_BY failed:", error);
  }
}

async function moveCurrentTabToBoundary(boundary) {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id || !activeTab.windowId) {
      return;
    }

    const tabs = await chrome.tabs.query({ windowId: activeTab.windowId });
    if (!tabs || tabs.length <= 1) {
      return;
    }

    const targetIndex = boundary === "first" ? 0 : tabs.length - 1;
    await chrome.tabs.move(activeTab.id, { index: targetIndex });
    await chrome.tabs.update(activeTab.id, { active: true });
  } catch (error) {
    console.error("[PK Shortcuts] MOVE_CURRENT_TAB_TO_BOUNDARY failed:", error);
  }
}

async function closeCurrentTab() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id) {
      return;
    }

    await chrome.tabs.remove(activeTab.id);
  } catch (error) {
    console.error("[PK Shortcuts] CLOSE_CURRENT_TAB failed:", error);
  }
}

async function createNewTab() {
  try {
    const activeTab = await getActiveTab();
    await chrome.tabs.create({
      active: true,
      windowId: activeTab?.windowId
    });
  } catch (error) {
    console.error("[PK Shortcuts] NEW_TAB failed:", error);
  }
}

async function duplicateCurrentTab() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id) {
      return;
    }

    await chrome.tabs.duplicate(activeTab.id);
  } catch (error) {
    console.error("[PK Shortcuts] DUPLICATE_CURRENT_TAB failed:", error);
  }
}

async function reloadCurrentTab() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id) {
      return;
    }

    await chrome.tabs.reload(activeTab.id);
  } catch (error) {
    console.error("[PK Shortcuts] RELOAD_CURRENT_TAB failed:", error);
  }
}

async function hardReloadCurrentTab() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id) {
      return;
    }

    await chrome.tabs.reload(activeTab.id, { bypassCache: true });
  } catch (error) {
    console.error("[PK Shortcuts] HARD_RELOAD_CURRENT_TAB failed:", error);
  }
}

async function unloadCurrentTab() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id) {
      return;
    }

    await chrome.tabs.discard(activeTab.id);
  } catch (error) {
    console.error("[PK Shortcuts] UNLOAD_CURRENT_TAB failed:", error);
  }
}

async function goBackCurrentTab() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id || typeof chrome.tabs.goBack !== "function") {
      return;
    }

    await chrome.tabs.goBack(activeTab.id);
  } catch (error) {
    if (isBenignHistoryNavigationError(error)) {
      return;
    }

    console.error("[PK Shortcuts] GO_BACK_PAGE failed:", error);
  }
}

async function goForwardCurrentTab() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id || typeof chrome.tabs.goForward !== "function") {
      return;
    }

    await chrome.tabs.goForward(activeTab.id);
  } catch (error) {
    if (isBenignHistoryNavigationError(error)) {
      return;
    }

    console.error("[PK Shortcuts] GO_FORWARD_PAGE failed:", error);
  }
}

async function openChromeUrl(url) {
  try {
    const activeTab = await getActiveTab();
    await chrome.tabs.create({
      url,
      active: true,
      windowId: activeTab?.windowId
    });
  } catch (error) {
    console.error("[PK Shortcuts] OPEN_CHROME_URL failed:", error);
  }
}

async function searchAndJump() {
  try {
    const query = await requestUserSearchQuery();
    if (!query) {
      return;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab?.id) {
      return;
    }

    const matchingTab = await findTabByQuery(query);
    if (matchingTab?.id && matchingTab.windowId) {
      await chrome.tabs.update(matchingTab.id, { active: true });
      await chrome.windows.update(matchingTab.windowId, { focused: true });
      return;
    }

    await chrome.tabs.update(activeTab.id, { url: toSearchUrl(query) });
  } catch (error) {
    console.error("[PK Shortcuts] SEARCH_AND_JUMP failed:", error);
  }
}

async function searchInBackground() {
  try {
    const query = await requestUserSearchQuery();
    if (!query) {
      return;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab?.windowId) {
      return;
    }

    await chrome.tabs.create({
      url: toSearchUrl(query),
      active: false,
      windowId: activeTab.windowId
    });
  } catch (error) {
    console.error("[PK Shortcuts] SEARCH_IN_BACKGROUND failed:", error);
  }
}

async function requestUserSearchQuery() {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!activeTab?.id || !activeTab.url || activeTab.url.startsWith("chrome://")) {
    return null;
  }

  const promptText = "Search:";
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: (label) => {
      const value = window.prompt(label);
      return typeof value === "string" ? value.trim() : "";
    },
    args: [promptText]
  });

  const query = result?.result;
  if (typeof query !== "string" || query.length === 0) {
    return null;
  }

  return query;
}

async function findTabByQuery(query) {
  const normalized = query.toLowerCase();
  const tabs = await chrome.tabs.query({});
  return (
    tabs.find((tab) => {
      const title = (tab.title || "").toLowerCase();
      const url = (tab.url || "").toLowerCase();
      return title.includes(normalized) || url.includes(normalized);
    }) || null
  );
}

function toSearchUrl(query) {
  const isLikelyUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(query) || query.includes(".");
  if (isLikelyUrl) {
    return query.startsWith("http://") || query.startsWith("https://")
      ? query
      : `https://${query}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

async function getActiveTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return activeTab || null;
}

async function logCommandShortcuts() {
  try {
    const all = await chrome.commands.getAll();
    const missing = all.filter((command) => !command.shortcut);
    if (missing.length > 0) {
      console.warn(
        "[PK Shortcuts] Commands without assigned shortcut (likely conflict/reserved):",
        missing.map((command) => command.name)
      );
    }
  } catch (error) {
    console.error("[PK Shortcuts] LOG_COMMAND_SHORTCUTS failed:", error);
  }
}

function scheduleBadgeRefresh() {
  if (badgeRefreshTimer) {
    clearTimeout(badgeRefreshTimer);
  }

  badgeRefreshTimer = setTimeout(() => {
    badgeRefreshTimer = null;
    void refreshTabCountBadge();
  }, 80);
}

async function refreshTabCountBadge() {
  try {
    const badgeApi = getBadgeApi();
    if (!badgeApi) {
      return;
    }

    const stored = await chrome.storage.sync.get({
      autoCopyEnabled: true,
      feature_badge_tab_count: true
    });

    if (!stored.feature_badge_tab_count) {
      await badgeApi.setBadgeText({ text: "" });
      return;
    }

    const tabs = await chrome.tabs.query({});
    const count = tabs.length;
    const text = count > 999 ? "999+" : String(count);
    const color = stored.autoCopyEnabled ? BADGE_BG_COLOR : "#B71C1C";
    await badgeApi.setBadgeBackgroundColor({ color });
    await badgeApi.setBadgeText({ text });
  } catch (error) {
    if (isBenignBadgeError(error)) {
      return;
    }

    console.error("[PK Shortcuts] REFRESH_TAB_COUNT_BADGE failed:", error);
  }
}

function getBadgeApi() {
  if (chrome?.action?.setBadgeText && chrome?.action?.setBadgeBackgroundColor) {
    return chrome.action;
  }

  if (chrome?.browserAction?.setBadgeText && chrome?.browserAction?.setBadgeBackgroundColor) {
    return chrome.browserAction;
  }

  return null;
}

function isBenignHistoryNavigationError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("cannot find a next page in history") ||
    message.includes("cannot find a previous page in history")
  );
}

function isBenignBadgeError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("no sw");
}

async function toggleAutoCopy() {
  try {
    const result = await chrome.storage.sync.get({ autoCopyEnabled: true });
    const newState = !result.autoCopyEnabled;
    await chrome.storage.sync.set({ autoCopyEnabled: newState });
    console.log(`[PK Shortcuts] Auto-copy ${newState ? "ON" : "OFF"}`);

    const badgeApi = getBadgeApi();
    if (badgeApi) {
      await badgeApi.setBadgeBackgroundColor({ color: newState ? "#2E7D32" : "#B71C1C" });
      await badgeApi.setBadgeText({ text: newState ? "ON" : "OFF" });
      setTimeout(() => {
        void refreshTabCountBadge();
      }, 1200);
    }
  } catch (error) {
    console.error("[PK Shortcuts] TOGGLE_AUTOCOPY failed:", error);
  }
}

async function getUrlCleanerConfig() {
  const stored = await chrome.storage.sync.get({
    feature_url_cleaner: true,
    url_cleaner_mode: "balanced",
    url_cleaner_custom_sources: [
      "utm", "facebook", "googleads", "linkedin", "microsoft",
      "mailchimp", "instagram", "youtube", "hubspot", "yandex",
      "aliexpress", "tiktok", "twitter", "generic"
    ],
    url_cleaner_custom_params: ""
  });
  return {
    enabled: stored.feature_url_cleaner,
    mode: stored.url_cleaner_mode,
    customSources: stored.url_cleaner_custom_sources,
    customParams: stored.url_cleaner_custom_params
  };
}

async function copyCleanedActiveTabUrl() {
  try {
    const config = await getUrlCleanerConfig();
    if (!config.enabled) {
      await flashBadge("OFF", "#B71C1C");
      return;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab?.url) {
      return;
    }

    const cleaned = URLCleaner.clean(activeTab.url, config);

    if (cleaned === activeTab.url) {
      await flashBadge("0", "#9E9E9E");
      return;
    }

    await writeClipboardViaTab(activeTab.id, cleaned);
    await flashBadge("✓", "#2E7D32");
  } catch (error) {
    console.error("[PK Shortcuts] COPY_CLEANED_URL failed:", error);
    await flashBadge("ERR", "#B71C1C");
  }
}

async function writeClipboardViaTab(tabId, text) {
  if (typeof tabId !== "number") {
    throw new Error("No active tab id for clipboard write");
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (value) => navigator.clipboard.writeText(value),
      args: [text]
    });
  } catch (err) {
    const message = String(err?.message || err || "").toLowerCase();
    if (message.includes("cannot access") || message.includes("chrome://") || message.includes("contentscript")) {
      throw new Error(`Clipboard write blocked for tab ${tabId}: ${message}`);
    }
    throw err;
  }
}

async function flashBadge(text, color) {
  const badgeApi = getBadgeApi();
  if (!badgeApi) return;
  try {
    await badgeApi.setBadgeBackgroundColor({ color });
    await badgeApi.setBadgeText({ text });
    setTimeout(() => {
      void refreshTabCountBadge();
    }, 1100);
  } catch {}
}

async function dedupTabsAuto() {
  try {
    const tabs = await chrome.tabs.query({});
    const groups = new Map();
    for (const tab of tabs) {
      if (!tab.url) continue;
      const key = URLCleaner.normalizeForDedup(tab.url);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(tab);
    }

    const toClose = [];
    let groupCount = 0;

    for (const [, groupTabs] of groups.entries()) {
      if (groupTabs.length <= 1) continue;
      groupCount++;
      const activeTab = groupTabs.find((t) => t.active);
      const keepTab = activeTab || groupTabs.slice().sort((a, b) => (a.id || 0) - (b.id || 0))[0];
      for (const tab of groupTabs) {
        if (tab.id !== keepTab.id && typeof tab.id === "number") {
          toClose.push(tab.id);
        }
      }
    }

    if (toClose.length === 0) {
      await flashBadge("0", "#9E9E9E");
      return;
    }

    await chrome.tabs.remove(toClose);
    await flashBadge(String(toClose.length), "#2E7D32");
    await notifyDedupResult(groupCount, toClose.length);
  } catch (error) {
    console.error("[PK Shortcuts] DEDUP_TABS failed:", error);
    await flashBadge("ERR", "#B71C1C");
  }
}

async function notifyDedupResult(groupCount, closedCount) {
  try {
    if (typeof chrome?.notifications?.create !== "function") return;
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "PK Shortcuts · Dedup",
      message: `${closedCount} doublon(s) fermé(s) dans ${groupCount} groupe(s).`
    });
  } catch {}
}

async function getTranslateConfig() {
  return await chrome.storage.sync.get({
    feature_translate: true,
    translate_target_lang: "auto",
    translate_trigger: "auto",
    translate_api: "google_mymemory"
  });
}

async function translateForContentScript(text, senderTabId) {
  try {
    const config = await getTranslateConfig();
    if (!config.feature_translate) {
      sendTranslationResult(senderTabId, { error: "disabled" });
      return;
    }
    const result = await Translator.translate(text, config.translate_target_lang, config.translate_api);
    sendTranslationResult(senderTabId, { ok: true, result });
  } catch (err) {
    console.error("[PK Shortcuts] TRANSLATE_REQUEST failed:", err);
    sendTranslationResult(senderTabId, { error: String(err?.message || err) });
  }
}

function sendTranslationResult(tabId, payload) {
  if (typeof tabId !== "number") return;
  try {
    chrome.tabs.sendMessage(tabId, { type: "TRANSLATE_RESULT", ...payload });
  } catch {}
}

async function triggerTranslateSelection() {
  try {
    const config = await getTranslateConfig();
    if (!config.feature_translate) {
      await flashBadge("OFF", "#B71C1C");
      return;
    }
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab?.id) return;
    const [selectionResult] = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: () => {
        const sel = window.getSelection();
        return sel ? sel.toString().trim() : "";
      }
    });
    const text = selectionResult?.result;
    if (!text) {
      await flashBadge("0", "#9E9E9E");
      return;
    }
    const result = await Translator.translate(text, config.translate_target_lang, config.translate_api);
    sendTranslationResult(activeTab.id, { ok: true, result });
  } catch (err) {
    console.error("[PK Shortcuts] TRIGGER_TRANSLATE failed:", err);
    await flashBadge("ERR", "#B71C1C");
  }
}

async function handleAutoCollapseGroups(tabId, windowId) {
  try {
    const stored = await chrome.storage.sync.get({ feature_auto_collapse_groups: true });
    if (!stored.feature_auto_collapse_groups) return;

    if (!chrome.tabGroups) return;

    const tab = await chrome.tabs.get(tabId);
    const currentGroupId = tab?.groupId ?? -1;

    const previousGroupId = windowActiveGroup.get(windowId);

    if (
      typeof previousGroupId === "number" &&
      previousGroupId > -1 &&
      previousGroupId !== currentGroupId
    ) {
      try {
        const group = await chrome.tabGroups.get(previousGroupId);
        if (group && group.windowId === windowId && !group.collapsed) {
          await chrome.tabGroups.update(previousGroupId, { collapsed: true });
        }
      } catch {
        // Group might not exist anymore, ignore
      }
    }

    windowActiveGroup.set(windowId, currentGroupId);
  } catch (error) {
    console.error("[PK Shortcuts] AUTO_COLLAPSE_GROUPS failed:", error);
  }
}
