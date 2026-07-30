// Shared translation logic for PK Chrome Shortcuts.
// Loaded by background.js via importScripts.

const TRANSLATE_MAX_CHARS = 1500;

const LANG_DISPLAY = {
  auto: "Auto",
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  pl: "Polski",
  ru: "Русский",
  "zh-CN": "中文",
  ja: "日本語",
  ar: "العربية",
  ko: "한국어"
};

const Translator = {
  maxChars: TRANSLATE_MAX_CHARS,
  langDisplay: LANG_DISPLAY,

  resolveTarget(code) {
    if (!code || code === "auto") {
      const browser = (typeof navigator !== "undefined" && navigator.language) || "en";
      return browser.split("-")[0] || "en";
    }
    return code;
  },

  async translate(text, targetCode, apiMode) {
    const target = this.resolveTarget(targetCode);
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      return { text: "", detected: "", source: "none" };
    }
    if (trimmed.length > TRANSLATE_MAX_CHARS) {
      const truncated = trimmed.slice(0, TRANSLATE_MAX_CHARS);
      const result = await this._callApi(truncated, target, apiMode);
      return { ...result, truncated: true };
    }
    return this._callApi(trimmed, target, apiMode);
  },

  async _callApi(text, target, apiMode) {
    if (apiMode === "mymemory_only") {
      return this._mymemory(text, target);
    }
    try {
      return await this._google(text, target);
    } catch (err) {
      console.warn("[Translator] Google failed, falling back to MyMemory:", err);
      return this._mymemory(text, target);
    }
  },

  async _google(text, target) {
    const url =
      "https://translate.google.com/translate_a/single?client=gtx" +
      `&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`Google HTTP ${res.status}`);
    const data = await res.json();
    const chunks = Array.isArray(data?.[0]) ? data[0] : [];
    const translated = chunks.map((chunk) => (typeof chunk?.[0] === "string" ? chunk[0] : "")).join("");
    if (!translated) throw new Error("Empty Google response");
    const detected = data?.[2] || "unknown";
    return { text: translated, detected, source: "Google" };
  },

  async _mymemory(text, target) {
    const source = "Autodetect";
    const url =
      "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(text) +
      `&langpair=${encodeURIComponent(source)}|${encodeURIComponent(target)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error("Empty MyMemory response");
    const detected = data?.responseData?.detectedLanguage || "unknown";
    return { text: translated, detected, source: "MyMemory" };
  }
};

if (typeof globalThis !== "undefined") {
  globalThis.Translator = Translator;
  globalThis.LANG_DISPLAY = LANG_DISPLAY;
}
