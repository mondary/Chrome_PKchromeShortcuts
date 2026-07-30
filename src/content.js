let lastSplitOpen = { url: "", at: 0 };
let lastSelectionText = "";
let selectionTimer = null;
let lastCopiedText = "";
let lastCopyTime = 0;
let translateTimer = null;
let translatePopupController = null;
let featureFlags = {
  autoCopyEnabled: true,
  feature_split_gesture: true,
  feature_tab_nav_hotkeys: true,
  feature_translate: true,
  translate_trigger: "auto",
  translate_target_lang: "auto"
};
const COPY_COOLDOWN = 2000; // ms avant de pouvoir copier à nouveau
const SELECTION_DELAY = 1500; // ms d'attente après la fin de la sélection
const TRANSLATE_DELAY = 600; // ms avant de montrer la popup traduction
const TRANSLATE_MIN_CHARS = 3; // minimum pour déclencher la traduction

loadFeatureFlags();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  Object.keys(featureFlags).forEach((key) => {
    if (changes[key]) {
      featureFlags[key] = changes[key].newValue;
    }
  });
});

async function loadFeatureFlags() {
  try {
    const stored = await chrome.storage.sync.get(featureFlags);
    featureFlags = { ...featureFlags, ...stored };
  } catch {}
}

document.addEventListener("mousedown", onSplitGesture, true);
document.addEventListener("click", onSplitGesture, true);
window.addEventListener("keydown", onNavigationHotkeys, true);

document.addEventListener("selectionchange", onSelectionChange, true);

chrome.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) return;

  if (message.type === "TRANSLATE_RESULT") {
    if (message.error === "disabled") {
      hideTranslatePopup();
    } else if (message.ok && message.result) {
      showTranslatePopup(message.result);
    } else if (message.error) {
      showTranslatePopup({ error: message.error });
    }
  }
});

// ============================================================
// TRANSLATE POPUP (Shadow DOM)
// ============================================================

function ensureTranslatePopup() {
  if (translatePopupController) return translatePopupController;
  const host = document.createElement("div");
  host.id = "pk-translator-host";
  host.style.cssText = "all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0; pointer-events: none;";
  const shadow = host.attachShadow({ mode: "closed" });
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  shadow.innerHTML = buildTranslatePopupTemplate(isDark);
  document.documentElement.appendChild(host);
  const popup = shadow.querySelector(".pk-popup");
  const closeBtn = shadow.querySelector(".pk-close");
  closeBtn.addEventListener("click", hideTranslatePopup);
  document.addEventListener("mousedown", (event) => {
    if (!translatePopupController) return;
    if (event.target === host) return;
    if (host.contains(event.target)) return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) return;
    hideTranslatePopup();
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideTranslatePopup();
  }, true);
  translatePopupController = { host, shadow, popup, isDark };
  return translatePopupController;
}

function buildTranslatePopupTemplate(isDark) {
  const bg = isDark ? "#1c1c1c" : "#ffffff";
  const text = isDark ? "#f4f4f5" : "#18181b";
  const border = isDark ? "#333" : "#e4e4e7";
  const mute = isDark ? "#a1a1aa" : "#71717a";
  const accent = isDark ? "#f5a623" : "#d97706";
  const accentSoft = isDark ? "rgba(245,166,35,0.15)" : "rgba(217,119,6,0.12)";
  const dangerSoft = isDark ? "rgba(239,68,68,0.18)" : "rgba(220,38,38,0.12)";
  const danger = "#ef4444";
  return `
    <style>
      * { box-sizing: border-box; }
      .pk-popup {
        position: fixed;
        background: ${bg};
        color: ${text};
        border: 1px solid ${border};
        border-radius: 10px;
        padding: 10px 12px;
        max-width: 340px;
        min-width: 180px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.45;
        box-shadow: 0 8px 28px rgba(0,0,0,0.32);
        pointer-events: auto;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.15s ease, transform 0.15s ease;
      }
      .pk-popup.visible { opacity: 1; transform: translateY(0); }
      .pk-head {
        display: flex; align-items: center; justify-content: space-between;
        gap: 8px; margin-bottom: 6px;
      }
      .pk-lang {
        font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
        color: ${accent}; background: ${accentSoft};
        padding: 2px 8px; border-radius: 10px; text-transform: uppercase;
      }
      .pk-close {
        background: transparent; border: 0; color: ${mute};
        cursor: pointer; font-size: 16px; line-height: 1; padding: 0 4px;
        border-radius: 4px;
      }
      .pk-close:hover { color: ${text}; background: ${border}; }
      .pk-text { white-space: pre-wrap; word-wrap: break-word; }
      .pk-loading { color: ${mute}; font-style: italic; }
      .pk-error { color: ${danger}; background: ${dangerSoft}; padding: 8px 10px; border-radius: 6px; }
      .pk-footer {
        font-size: 10px; color: ${mute}; margin-top: 6px;
        display: flex; justify-content: space-between; gap: 6px;
      }
      .pk-truncated { color: ${danger}; font-weight: 600; }
    </style>
    <div class="pk-popup" hidden>
      <div class="pk-head">
        <span class="pk-lang">…</span>
        <button class="pk-close" aria-label="Close">×</button>
      </div>
      <div class="pk-text pk-loading">Traduction…</div>
      <div class="pk-footer"><span class="pk-source"></span><span class="pk-truncated" hidden>tronqué</span></div>
    </div>
  `;
}

function positionPopup(popup, rect) {
  const margin = 8;
  const popupRect = popup.getBoundingClientRect();
  const popupW = popupRect.width || 280;
  const popupH = popupRect.height || 80;
  let left = rect.left + (rect.width / 2) - (popupW / 2);
  let top = rect.bottom + margin;
  if (top + popupH > window.innerHeight - margin) {
    top = rect.top - popupH - margin;
  }
  if (top < margin) top = margin;
  if (left < margin) left = margin;
  if (left + popupW > window.innerWidth - margin) left = window.innerWidth - popupW - margin;
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function showTranslatePopup(result) {
  const ctrl = ensureTranslatePopup();
  const { popup, shadow } = ctrl;
  const textEl = shadow.querySelector(".pk-text");
  const langEl = shadow.querySelector(".pk-lang");
  const sourceEl = shadow.querySelector(".pk-source");
  const truncatedEl = shadow.querySelector(".pk-truncated");

  popup.hidden = false;
  popup.classList.remove("visible");

  if (result.error) {
    textEl.className = "pk-text pk-error";
    textEl.textContent = `Erreur : ${result.error}`;
    langEl.textContent = "Erreur";
    sourceEl.textContent = "";
    truncatedEl.hidden = true;
  } else {
    textEl.className = "pk-text";
    textEl.textContent = result.text || "(vide)";
    const detected = result.detected && result.detected !== "unknown" ? result.detected.toUpperCase() : "?";
    const target = Translator_resolveTarget(featureFlags.translate_target_lang).toUpperCase();
    langEl.textContent = `${detected} → ${target}`;
    sourceEl.textContent = `via ${result.source || "?"}`;
    truncatedEl.hidden = !result.truncated;
  }

  const sel = window.getSelection();
  let rect = null;
  if (sel && sel.rangeCount > 0) {
    rect = sel.getRangeAt(0).getBoundingClientRect();
  }
  if (!rect || rect.width === 0) {
    rect = { left: window.innerWidth / 2 - 140, top: window.innerHeight / 2, width: 280, height: 0 };
  }
  positionPopup(popup, rect);
  requestAnimationFrame(() => popup.classList.add("visible"));
}

function hideTranslatePopup() {
  if (!translatePopupController) return;
  const { popup } = translatePopupController;
  popup.classList.remove("visible");
  setTimeout(() => {
    if (!translatePopupController) return;
    translatePopupController.popup.hidden = true;
  }, 150);
}

function Translator_resolveTarget(code) {
  if (!code || code === "auto") {
    const browser = (typeof navigator !== "undefined" && navigator.language) || "en";
    return browser.split("-")[0] || "en";
  }
  return code;
}

function maybeTriggerAutoTranslate(selectedText) {
  if (!featureFlags.feature_translate) return;
  if (featureFlags.translate_trigger !== "auto") return;
  if (!selectedText || selectedText.length < TRANSLATE_MIN_CHARS) return;
  if (isEditableTarget(document.activeElement)) return;
  if (translateTimer) clearTimeout(translateTimer);
  translateTimer = setTimeout(() => {
    const sel = window.getSelection();
    const current = sel ? sel.toString().trim() : "";
    if (current !== selectedText) return;
    requestTranslate(selectedText);
  }, TRANSLATE_DELAY);
}

function requestTranslate(text) {
  chrome.runtime.sendMessage({ type: "TRANSLATE_REQUEST", text }, (resp) => {
    if (chrome.runtime.lastError) {
      // Background may be unavailable; rely on TRANSLATE_RESULT broadcast.
    }
  });
}

function onSplitGesture(event) {
  if (!featureFlags.feature_split_gesture) return;

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
  if (!featureFlags.feature_tab_nav_hotkeys) return;

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
        if (featureFlags.autoCopyEnabled) {
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

    maybeTriggerAutoTranslate(selectedText);
  } else {
    if (selectionTimer) {
      clearTimeout(selectionTimer);
      selectionTimer = null;
    }
    if (translateTimer) {
      clearTimeout(translateTimer);
      translateTimer = null;
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
