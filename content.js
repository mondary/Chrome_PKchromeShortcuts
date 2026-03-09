document.addEventListener(
  "click",
  (event) => {
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

    event.preventDefault();
    event.stopPropagation();

    chrome.runtime.sendMessage({
      type: "OPEN_LINK_SPLIT",
      url
    });
  },
  true
);

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
