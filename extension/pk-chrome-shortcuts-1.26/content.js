let lastSplitOpen = { url: "", at: 0 };
let lastSelectionText = "";
let selectionTimer = null;
let lastCopiedText = "";
let lastCopyTime = 0;
const COPY_COOLDOWN = 2000; // ms avant de pouvoir copier à nouveau
const SELECTION_DELAY = 1500; // ms d'attente après la fin de la sélection

document.addEventListener("mousedown", onSplitGesture, true);
document.addEventListener("click", onSplitGesture, true);
window.addEventListener("keydown", onNavigationHotkeys, true);

document.addEventListener("selectionchange", onSelectionChange, true);

function onSplitGesture(event) {
  if (event.defaultPrevented || event.button !== 0) {
    return;
  }

  if (!event.metaKey || !event.altKey) {
    return;
  }

  const anchor = getAnchorFromEvent(event);
  if (!anchor) {
    return;
  }

  const url = anchor.href;
  if (!url || url.startsWith("javascript:")) {
    return;
  }

  // Prevent native Option+click behaviors so the extension action wins.
  event.preventDefault();
  event.stopPropagation();

  const now = Date.now();
  if (lastSplitOpen.url === url && now - lastSplitOpen.at < 350) {
    return;
  }

  lastSplitOpen = { url, at: now };
  chrome.runtime.sendMessage({
    type: "OPEN_LINK_SPLIT",
    url
  });
}

function onNavigationHotkeys(event) {
  if (event.defaultPrevented) {
    return;
  }

  if (isEditableTarget(event.target)) {
    return;
  }

  if (isCmdOptionArrowLeft(event)) {
    event.preventDefault();
    event.stopPropagation();
    chrome.runtime.sendMessage({ type: "SELECT_PREVIOUS_TAB" });
    return;
  }

  if (isCmdOptionArrowRight(event)) {
    event.preventDefault();
    event.stopPropagation();
    chrome.runtime.sendMessage({ type: "SELECT_NEXT_TAB" });
  }
}

function getAnchorFromEvent(event) {
  const path = event.composedPath ? event.composedPath() : [];
  for (const node of path) {
    if (node instanceof Element) {
      const anchor = node.closest("a[href]");
      if (anchor) {
        return anchor;
      }
    }
  }

  const target = event.target;
  if (target instanceof Element) {
    return target.closest("a[href]");
  }

  if (target instanceof Node && target.parentElement) {
    return target.parentElement.closest("a[href]");
  }

  return null;
}

function isEditableTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function isCmdOptionArrowLeft(event) {
  return (
    event.metaKey &&
    event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    event.key === "ArrowLeft"
  );
}

function isCmdOptionArrowRight(event) {
  return (
    event.metaKey &&
    event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    event.key === "ArrowRight"
  );
}

function onSelectionChange() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText) {
    if (selectionTimer) {
      clearTimeout(selectionTimer);
    }

    selectionTimer = setTimeout(async () => {
      const currentSelection = window.getSelection().toString().trim();
      if (currentSelection === selectedText) {
        const result = await chrome.storage.sync.get({ autoCopyEnabled: true });
        if (result.autoCopyEnabled) {
          const now = Date.now();
          // Vérifier le cool-down et que ce n'est pas le même texte que précédemment
          if (selectedText !== lastCopiedText || (now - lastCopyTime) > COPY_COOLDOWN) {
            copyToClipboard(selectedText);
            lastCopiedText = selectedText;
            lastCopyTime = now;
          }
        }
      }
    }, SELECTION_DELAY);
  } else {
    if (selectionTimer) {
      clearTimeout(selectionTimer);
      selectionTimer = null;
    }
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log("[PK Shortcuts] Copied to clipboard:", text);
  } catch (error) {
    console.error("[PK Shortcuts] Failed to copy:", error);
  }
}
