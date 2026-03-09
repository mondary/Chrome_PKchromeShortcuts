const SPLIT_RATIO = 0.5;
const MIN_SPLIT_HEIGHT = 600;
const windowHistory = new Map();
const BADGE_BG_COLOR = "#0B0B0B";
let badgeRefreshTimer = null;

chrome.runtime.onInstalled.addListener(() => {
  logCommandShortcuts();
  scheduleBadgeRefresh();
});

chrome.runtime.onStartup.addListener(() => {
  logCommandShortcuts();
  scheduleBadgeRefresh();
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  const previous = windowHistory.get(windowId);
  if (!previous) {
    windowHistory.set(windowId, { currentTabId: tabId, lastTabId: null });
    return;
  }

  if (previous.currentTabId !== tabId) {
    windowHistory.set(windowId, { currentTabId: tabId, lastTabId: previous.currentTabId });
  }
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
    void openChromeUrl("chrome://extensions/shortcuts");
  });
}

chrome.runtime.onMessage.addListener((message, sender) => {
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
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "t13-detach-current-tab") {
    await detachCurrentTab();
    return;
  }

  if (command === "s01-split-active-tab-simulated") {
    await splitActiveTabSimulated();
    return;
  }

  if (command === "s02-native-split-view") {
    // Chrome native Split View is handled by Chrome itself (Cmd+Option+N on Mac).
    // This command is intentionally a placeholder entry in chrome://extensions/shortcuts.
    return;
  }

  if (command === "n01-navigate-last-active-tab") {
    await navigateToLastActiveTab();
    return;
  }

  if (command === "n01a-select-first-tab") {
    await selectTabBoundary("first");
    return;
  }

  if (command === "n01b-select-last-tab") {
    await selectTabBoundary("last");
    return;
  }

  if (command === "t08-toggle-pin-tab") {
    await togglePinActiveTab();
    return;
  }

  if (command === "n07-search-and-jump") {
    await searchAndJump();
    return;
  }

  if (command === "n08-search-in-background") {
    await searchInBackground();
    return;
  }

  if (command === "n02-select-previous-tab") {
    await selectAdjacentTab(-1);
    return;
  }

  if (command === "n03-select-next-tab") {
    await selectAdjacentTab(1);
    return;
  }

  if (command === "t04-move-current-tab-left") {
    await moveCurrentTabBy(-1);
    return;
  }

  if (command === "t05-move-current-tab-right") {
    await moveCurrentTabBy(1);
    return;
  }

  if (command === "t06-move-current-tab-first") {
    await moveCurrentTabToBoundary("first");
    return;
  }

  if (command === "t07-move-current-tab-last") {
    await moveCurrentTabToBoundary("last");
    return;
  }

  if (command === "t02-close-current-tab") {
    await closeCurrentTab();
    return;
  }

  if (command === "t01-new-tab") {
    await createNewTab();
    return;
  }

  if (command === "w01-new-window") {
    await chrome.windows.create({ focused: true });
    return;
  }

  if (command === "w02-new-incognito-window") {
    await chrome.windows.create({ focused: true, incognito: true });
    return;
  }

  if (command === "t03-duplicate-current-tab") {
    await duplicateCurrentTab();
    return;
  }

  if (command === "t10-reload-current-tab") {
    await reloadCurrentTab();
    return;
  }

  if (command === "t11-hard-reload-current-tab") {
    await hardReloadCurrentTab();
    return;
  }

  if (command === "n06-find-in-page") {
    await findInCurrentPage();
    return;
  }

  if (command === "t12-unload-current-tab") {
    await unloadCurrentTab();
    return;
  }

  if (command === "n04-go-back-page") {
    await goBackCurrentTab();
    return;
  }

  if (command === "n05-go-forward-page") {
    await goForwardCurrentTab();
    return;
  }

  if (command === "t09-toggle-mute-tab") {
    await toggleMuteActiveTab();
    return;
  }

  if (command === "c01-open-chrome-bookmarks") {
    await openChromeUrl("chrome://bookmarks");
    return;
  }

  if (command === "c02-open-chrome-downloads") {
    await openChromeUrl("chrome://downloads");
    return;
  }

  if (command === "c05-open-chrome-extensions") {
    await openChromeUrl("chrome://extensions");
    return;
  }

  if (command === "c06-open-extension-shortcuts") {
    await openChromeUrl("chrome://extensions/shortcuts");
    return;
  }

  if (command === "c07-open-chrome-flags") {
    await openChromeUrl("chrome://flags");
    return;
  }

  if (command === "c08-open-chrome-help") {
    await openChromeUrl("chrome://help");
    return;
  }

  if (command === "c03-open-chrome-history") {
    await openChromeUrl("chrome://history");
    return;
  }

  if (command === "c04-open-chrome-settings") {
    await openChromeUrl("chrome://settings");
  }
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

async function findInCurrentPage() {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id || !activeTab.url || activeTab.url.startsWith("chrome://")) {
      return;
    }

    const promptText = "Find in page:";
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (label) => {
        const query = window.prompt(label);
        if (!query || typeof query !== "string") {
          return false;
        }
        return window.find(query, false, false, true, false, false, false);
      },
      args: [promptText]
    });
  } catch (error) {
    console.error("[PK Shortcuts] FIND_IN_CURRENT_PAGE failed:", error);
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

    const tabs = await chrome.tabs.query({});
    const count = tabs.length;
    const text = count > 999 ? "999+" : String(count);
    await badgeApi.setBadgeBackgroundColor({ color: BADGE_BG_COLOR });
    await badgeApi.setBadgeText({ text });
  } catch (error) {
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
