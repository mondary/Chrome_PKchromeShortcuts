// PK Shortcuts · Options page logic

const DEFAULTS = {
  autoCopyEnabled: true,
  feature_split_gesture: true,
  feature_tab_nav_hotkeys: true,
  feature_badge_tab_count: true,
  feature_url_cleaner: true,
  url_cleaner_mode: "balanced",
  url_cleaner_custom_sources: [
    "utm", "facebook", "googleads", "linkedin", "microsoft",
    "mailchimp", "instagram", "youtube", "hubspot", "yandex",
    "aliexpress", "tiktok", "twitter", "generic"
  ],
  url_cleaner_custom_params: "",
  options_theme: "dark",
  feature_translate: true,
  translate_target_lang: "auto",
  translate_trigger: "auto",
  translate_api: "google_mymemory"
};

const STORAGE_KEYS = Object.keys(DEFAULTS);
const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let settings = { ...DEFAULTS };

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  setVersion();
  bindThemeToggle();
  bindNav();
  bindFeatureToggles();
  bindUrlCleaner();
  bindDedup();
  bindTranslate();
  bindBackup();
  bindAbout();
});

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  settings = { ...DEFAULTS, ...stored };

  for (const key of STORAGE_KEYS) {
    if (key === "options_theme") continue;
    const el = document.querySelector(`[data-key="${key}"]`);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!settings[key];
  }

  // URL cleaner mode radio
  const modeRadio = document.querySelector(`input[name="uc-mode"][value="${settings.url_cleaner_mode}"]`);
  if (modeRadio) modeRadio.checked = true;

  // Custom params
  $("uc-custom-params").value = settings.url_cleaner_custom_params || "";

  // Translate
  const trTrigger = document.querySelector(`input[name="tr-trigger"][value="${settings.translate_trigger}"]`);
  if (trTrigger) trTrigger.checked = true;
  const trApi = document.querySelector(`input[name="tr-api"][value="${settings.translate_api}"]`);
  if (trApi) trApi.checked = true;
  $("tr-target-lang").value = settings.translate_target_lang || "auto";

  applyTheme(settings.options_theme);
  renderCustomSources();
  refreshCustomWrapVisibility();
  refreshTestOutput();
  refreshBackupPreview();
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function bindThemeToggle() {
  $("theme-toggle").addEventListener("click", () => {
    const current = settings.options_theme || "dark";
    const next = current === "dark" ? "light" : "dark";
    settings.options_theme = next;
    applyTheme(next);
    void chrome.storage.sync.set({ options_theme: next });
    flashSaved();
  });
}

function bindNav() {
  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (!target) return;
      $$(".nav-item").forEach((b) => b.classList.toggle("active", b === btn));
      $$(".page").forEach((p) => {
        p.classList.toggle("active", p.dataset.page === target);
      });
    });
  });
}

function bindAbout() {
  $("open-shortcuts").addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });
}

// ============================================================
// TRANSLATE
// ============================================================

function bindTranslate() {
  $$('input[name="tr-trigger"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      settings.translate_trigger = radio.value;
      void persist("translate_trigger", radio.value);
    });
  });

  $$('input[name="tr-api"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      settings.translate_api = radio.value;
      void persist("translate_api", radio.value);
    });
  });

  $("tr-target-lang").addEventListener("change", (e) => {
    settings.translate_target_lang = e.target.value;
    void persist("translate_target_lang", e.target.value);
  });

  const input = $("tr-test-input");
  const btn = $("tr-test-btn");
  input.addEventListener("input", () => {
    btn.disabled = input.value.trim().length < 2;
  });
  btn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;
    const output = $("tr-test-output");
    output.textContent = "Traduction…";
    output.classList.add("dirty");
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "…";
    try {
      const response = await chrome.runtime.sendMessage({
        type: "TRANSLATE_REQUEST",
        text,
        inline: true
      });
      if (response?.ok && response.result) {
        const r = response.result;
        const truncated = r.truncated ? " [tronqué]" : "";
        output.textContent = `${r.text}${truncated}  ·  via ${r.source}`;
      } else if (response?.error) {
        output.textContent = `Erreur : ${response.error}`;
      } else {
        output.textContent = "Réponse invalide.";
      }
    } catch (err) {
      output.textContent = `Erreur : ${err?.message || err}`;
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

// ============================================================
// BACKUP (import / export / reset)
// ============================================================

function bindBackup() {
  $("bk-export").addEventListener("click", exportConfig);
  $("bk-import").addEventListener("click", () => $("bk-import-file").click());
  $("bk-import-file").addEventListener("change", importConfig);
  $("bk-reset").addEventListener("click", resetConfig);
}

function buildExportPayload() {
  return {
    schema: "pk-shortcuts-settings/v1",
    exportedAt: new Date().toISOString(),
    version: getManifestVersion(),
    settings: { ...settings }
  };
}

function getManifestVersion() {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "unknown";
  }
}

async function refreshBackupPreview() {
  const el = $("bk-preview").querySelector("code");
  if (!el) return;
  const payload = buildExportPayload();
  el.textContent = JSON.stringify(payload, null, 2);
}

async function exportConfig() {
  try {
    const payload = buildExportPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const version = payload.version || "x";
    const filename = `pk-shortcuts-${version}-${today}.json`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flashButton("bk-export", "✓ Exporté");
  } catch (err) {
    console.error("[PK Options] Export failed:", err);
    alert("Export impossible : " + (err?.message || err));
  }
}

async function importConfig(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("JSON invalide");
    }
    if (parsed.schema !== "pk-shortcuts-settings/v1") {
      throw new Error(`Schéma non reconnu : ${parsed.schema || "absent"}`);
    }
    const incomingSettings = parsed.settings || {};
    const unknownKeys = Object.keys(incomingSettings).filter((k) => !DEFAULTS.hasOwnProperty(k));
    const knownIncoming = {};
    Object.keys(DEFAULTS).forEach((k) => {
      if (incomingSettings.hasOwnProperty(k)) {
        knownIncoming[k] = incomingSettings[k];
      }
    });

    let warning = "";
    if (unknownKeys.length > 0) {
      warning = `\n\nClés ignorées (inconnues) : ${unknownKeys.join(", ")}`;
    }
    const curVersion = getManifestVersion();
    if (parsed.version && parsed.version !== curVersion) {
      warning += `\n\nVersion du fichier : ${parsed.version} (actuelle : ${curVersion})`;
    }

    const confirmed = window.confirm(
      `Importer cette configuration ?${warning}\n\n${Object.keys(knownIncoming).length} clé(s) seront écrasées.`
    );
    if (!confirmed) return;

    await chrome.storage.sync.set(knownIncoming);
    await loadSettings();
    flashButton("bk-import", "✓ Importé");
    await chrome.runtime.sendMessage({ type: "OPTIONS_UPDATED" }).catch(() => {});
  } catch (err) {
    console.error("[PK Options] Import failed:", err);
    alert("Import impossible : " + (err?.message || err));
  }
}

async function resetConfig() {
  const confirmed = window.confirm(
    "Réinitialiser TOUS les réglages aux valeurs par défaut ? Cette action est irréversible."
  );
  if (!confirmed) return;
  try {
    await chrome.storage.sync.set(DEFAULTS);
    await loadSettings();
    flashButton("bk-reset", "✓ Réinitialisé");
    await chrome.runtime.sendMessage({ type: "OPTIONS_UPDATED" }).catch(() => {});
  } catch (err) {
    console.error("[PK Options] Reset failed:", err);
    alert("Reset impossible : " + (err?.message || err));
  }
}

function setVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    $("ext-version").textContent = manifest.version;
    $("about-version").textContent = manifest.version;
  } catch {}
}

function bindFeatureToggles() {
  $$('input.toggle[data-key]').forEach((el) => {
    el.addEventListener("change", () => {
      const key = el.dataset.key;
      settings[key] = el.checked;
      void saveAndPersist(key, el.checked);
    });
  });
}

function bindUrlCleaner() {
  $$('input[name="uc-mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      settings.url_cleaner_mode = radio.value;
      void persist("url_cleaner_mode", radio.value);
      renderCustomSources();
      refreshCustomWrapVisibility();
      refreshTestOutput();
    });
  });

  $("uc-custom-params").addEventListener("input", (e) => {
    settings.url_cleaner_custom_params = e.target.value;
    void persist("url_cleaner_custom_params", e.target.value);
    refreshTestOutput();
  });

  $("uc-test-input").addEventListener("input", refreshTestOutput);

  $("uc-copy").addEventListener("click", async () => {
    const text = $("uc-test-output").textContent;
    if (!text || text === "—") return;
    try {
      await navigator.clipboard.writeText(text);
      flashButton("uc-copy", "Copié ✓");
    } catch (err) {
      console.error("[PK Options] Clipboard write failed:", err);
    }
  });
}

function renderCustomSources() {
  const wrap = $("uc-sources");
  wrap.innerHTML = "";
  const sources = (typeof URLCleaner !== "undefined" && URLCleaner.sources) || {};
  const selected = new Set(settings.url_cleaner_custom_sources || []);

  Object.entries(sources).forEach(([id, def]) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = id;
    input.checked = selected.has(id);
    input.addEventListener("change", () => {
      const next = new Set(settings.url_cleaner_custom_sources || []);
      if (input.checked) next.add(id);
      else next.delete(id);
      settings.url_cleaner_custom_sources = Array.from(next);
      void persist("url_cleaner_custom_sources", settings.url_cleaner_custom_sources);
      refreshTestOutput();
    });
    label.appendChild(input);
    const text = document.createElement("span");
    text.textContent = def.label;
    label.appendChild(text);
    wrap.appendChild(label);
  });
}

function refreshCustomWrapVisibility() {
  $("uc-custom-wrap").hidden = settings.url_cleaner_mode !== "custom";
}

function refreshTestOutput() {
  const input = $("uc-test-input").value.trim();
  const output = $("uc-test-output");
  const copyBtn = $("uc-copy");
  if (!input) {
    output.textContent = "—";
    output.classList.remove("dirty");
    copyBtn.disabled = true;
    return;
  }
  const cleaned = URLCleaner.clean(input, buildCleanerConfig());
  output.textContent = cleaned;
  output.classList.add("dirty");
  copyBtn.disabled = false;
}

function buildCleanerConfig() {
  return {
    mode: settings.url_cleaner_mode,
    customSources: settings.url_cleaner_custom_sources,
    customParams: settings.url_cleaner_custom_params
  };
}

function flashButton(id, msg) {
  const btn = $(id);
  const original = btn.textContent;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1200);
}

// ============================================================
// TAB DEDUP
// ============================================================

function bindDedup() {
  $("dedup-scan").addEventListener("click", scanDuplicates);
  $("dedup-all-oldest").addEventListener("click", () => applyBulkStrategy("oldest"));
  $("dedup-all-active").addEventListener("click", () => applyBulkStrategy("active"));
  $("dedup-close").addEventListener("click", closeSelectedDuplicates);
}

let dedupState = {
  groups: [],
  // selected: Map<groupKey, tabId>
  selected: new Map()
};

async function scanDuplicates() {
  const summaryEl = $("dedup-summary");
  const listEl = $("dedup-list");
  listEl.innerHTML = "";
  summaryEl.textContent = "Scan en cours…";
  $("dedup-actions").hidden = true;

  try {
    const tabs = await chrome.tabs.query({});
    const groups = new Map();
    for (const tab of tabs) {
      if (!tab.url) continue;
      const key = URLCleaner.normalizeForDedup(tab.url);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(tab);
    }

    const duplicates = Array.from(groups.entries())
      .filter(([, arr]) => arr.length > 1)
      .map(([key, arr]) => ({ key, tabs: arr }))
      .sort((a, b) => b.tabs.length - a.tabs.length);

    dedupState.groups = duplicates;
    dedupState.selected = new Map();

    if (duplicates.length === 0) {
      summaryEl.textContent = "Aucun doublon trouvé ✓";
      renderEmpty(listEl, "Aucun doublon. Tous tes onglets sont uniques.");
      return;
    }

    const totalTabs = duplicates.reduce((acc, g) => acc + g.tabs.length, 0);
    const totalDupes = totalTabs - duplicates.length;
    summaryEl.textContent = `${duplicates.length} groupe(s) · ${totalTabs} onglets · ${totalDupes} à fermer`;

    // Default selection: prefer active, else oldest (lowest id)
    duplicates.forEach((group) => {
      dedupState.selected.set(group.key, pickKeepCandidate(group, "active").id);
    });

    renderGroups();
    $("dedup-actions").hidden = false;
  } catch (err) {
    summaryEl.textContent = "Erreur pendant le scan.";
    console.error("[PK Options] Dedup scan failed:", err);
  }
}

function pickKeepCandidate(group, strategy) {
  if (strategy === "active") {
    const active = group.tabs.find((t) => t.active);
    if (active) return active;
  }
  // oldest = lowest id (IDs are monotonically increasing)
  return group.tabs.slice().sort((a, b) => (a.id || 0) - (b.id || 0))[0];
}

function renderEmpty(root, msg) {
  const div = document.createElement("div");
  div.className = "dedup-empty";
  div.textContent = msg;
  root.appendChild(div);
}

function renderGroups() {
  const listEl = $("dedup-list");
  listEl.innerHTML = "";

  dedupState.groups.forEach((group) => {
    const keepId = dedupState.selected.get(group.key);
    const groupEl = document.createElement("div");
    groupEl.className = "dedup-group";

    const head = document.createElement("div");
    head.className = "dedup-group-head";
    const urlEl = document.createElement("div");
    urlEl.className = "dedup-group-url";
    urlEl.textContent = group.key;
    const countEl = document.createElement("span");
    countEl.className = "dedup-group-count";
    countEl.textContent = `${group.tabs.length} tabs`;
    head.appendChild(urlEl);
    head.appendChild(countEl);
    groupEl.appendChild(head);

    const sorted = group.tabs.slice().sort((a, b) => (a.id || 0) - (b.id || 0));
    const oldestId = sorted[0]?.id;
    const activeId = group.tabs.find((t) => t.active)?.id;

    sorted.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.className = "dedup-tab";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `keep-${group.key}`;
      radio.value = String(tab.id);
      radio.checked = tab.id === keepId;
      radio.addEventListener("change", () => {
        dedupState.selected.set(group.key, tab.id);
      });

      const info = document.createElement("div");
      info.className = "dedup-tab-info";

      const titleEl = document.createElement("div");
      titleEl.className = "dedup-tab-title";
      titleEl.textContent = tab.title || "(sans titre)";

      const metaEl = document.createElement("div");
      metaEl.className = "dedup-tab-meta";
      const tags = [];
      tags.push(`#${tab.index ?? "?"} · Fenêtre ${tab.windowId ?? "?"}`);
      if (tab.id === activeId) tags.push('<span class="tag">actif</span>');
      if (tab.id === oldestId) tags.push('<span class="tag">+ ancien</span>');
      metaEl.innerHTML = tags.join(" · ");

      info.appendChild(titleEl);
      info.appendChild(metaEl);

      tabEl.appendChild(radio);
      tabEl.appendChild(info);
      groupEl.appendChild(tabEl);
    });

    listEl.appendChild(groupEl);
  });
}

function applyBulkStrategy(strategy) {
  dedupState.groups.forEach((group) => {
    dedupState.selected.set(group.key, pickKeepCandidate(group, strategy).id);
  });
  renderGroups();
}

async function closeSelectedDuplicates() {
  const toClose = [];
  dedupState.groups.forEach((group) => {
    const keepId = dedupState.selected.get(group.key);
    group.tabs.forEach((tab) => {
      if (tab.id !== keepId && typeof tab.id === "number") {
        toClose.push(tab.id);
      }
    });
  });

  if (toClose.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    `Fermer ${toClose.length} onglet(s) en doublon ?`
  );
  if (!confirmed) return;

  const closeBtn = $("dedup-close");
  const original = closeBtn.textContent;
  closeBtn.textContent = "Fermeture…";
  closeBtn.disabled = true;

  try {
    await chrome.tabs.remove(toClose);
    closeBtn.textContent = `✓ ${toClose.length} fermé(s)`;
    await new Promise((r) => setTimeout(r, 900));
    await scanDuplicates();
  } catch (err) {
    console.error("[PK Options] Close failed:", err);
    closeBtn.textContent = "Erreur";
  } finally {
    closeBtn.textContent = original;
    closeBtn.disabled = false;
  }
}

// ============================================================
// PERSISTENCE
// ============================================================

async function persist(key, value) {
  try {
    await chrome.storage.sync.set({ [key]: value });
    flashSaved();
    // Notify background that feature flags changed
    await chrome.runtime.sendMessage({ type: "OPTIONS_UPDATED", key, value }).catch(() => {});
  } catch (err) {
    console.error("[PK Options] Persist failed:", err);
  }
}

async function saveAndPersist(key, value) {
  return persist(key, value);
}

function flashSaved() {
  const el = $("saved-indicator");
  el.classList.add("flash");
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(() => el.classList.remove("flash"), 1200);
}
