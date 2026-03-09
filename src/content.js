let lastSplitOpen = { url: "", at: 0 };

document.addEventListener("mousedown", onSplitGesture, true);
document.addEventListener("click", onSplitGesture, true);
window.addEventListener("keydown", onNavigationHotkeys, true);

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
