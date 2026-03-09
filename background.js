const SPLIT_RATIO = 0.5;
const MIN_SPLIT_HEIGHT = 600;
const windowHistory = new Map();

chrome.runtime.onInstalled.addListener(() => {
  logCommandShortcuts();
});

chrome.runtime.onStartup.addListener(() => {
  logCommandShortcuts();
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
});

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
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "detach-current-tab") {
    await detachCurrentTab();
    return;
  }

  if (command === "split-active-tab-simulated") {
    await splitActiveTabSimulated();
    return;
  }

  if (command === "native-split-view") {
    // Chrome native Split View is handled by Chrome itself (Cmd+Option+N on Mac).
    // This command is intentionally a placeholder entry in chrome://extensions/shortcuts.
    return;
  }

  if (command === "navigate-last-active-tab") {
    await navigateToLastActiveTab();
    return;
  }

  if (command === "toggle-pin-tab") {
    await togglePinActiveTab();
    return;
  }

  if (command === "search-and-jump") {
    await searchAndJump();
    return;
  }

  if (command === "search-in-background") {
    await searchInBackground();
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
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab?.id) {
      return;
    }

    await chrome.tabs.update(activeTab.id, { pinned: !Boolean(activeTab.pinned) });
  } catch (error) {
    console.error("[PK Shortcuts] TOGGLE_PIN_TAB failed:", error);
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

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: () => {
      const value = window.prompt("Search:");
      return typeof value === "string" ? value.trim() : "";
    }
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
