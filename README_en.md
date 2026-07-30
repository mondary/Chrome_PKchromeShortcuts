# PK Chrome Shortcuts

![Project icon](icon2.png)

[🇬🇧 EN](README_en.md) · [🇫🇷 FR](README.md)

✨ Chrome extension to control tabs, navigation, and split view with keyboard shortcuts.

## ✅ Features
- Badge on extension icon: live counter of total open tabs.
- `Cmd + Option + Click` on a link: simulated split view (side-by-side windows).
- Detach current tab into a new window.
- Tab navigation: previous/next, first/last, last active tab.
- Tab actions: move, pin/unpin, mute/unmute, reload/hard reload, duplicate, unload.
- Quick open Chrome pages (`chrome://bookmarks`, `history`, `flags`, etc.).
- Grouped command labels with emojis in `chrome://extensions/shortcuts`.
- 🧹 URL Cleaner: strips tracking params (utm, fbclid, gclid, etc.) with strict/balanced/light/custom modes.
- ♻️ Tab Deduplicator: detects and closes duplicate tabs.
- 🌐 Inline translation: translates selection on the fly (Google + MyMemory).
- 📑 Auto-collapse: automatically collapses tab groups when leaving them.
- 💾 Backup: import/export/reset configuration.

## 🧠 Usage
- Load the `src/` folder in `chrome://extensions` (`Load unpacked`).
- Open `chrome://extensions/shortcuts` to view/edit shortcuts.
- The gesture shortcut `Cmd + Option + Click` works directly on links.
- Click the extension icon to open the options page.

## 🗂️ Structure
- `src/`: canonical Chrome extension source.
- `release/`: locally generated release ZIPs.
- `scripts/`: build and Chrome Web Store publish scripts.
- `secrets/`: unversioned local sensitive files.
- `icon.png` and `icon2.png`: project assets kept at the repo root.

## ⚙️ Settings
- Shortcuts are managed natively by Chrome in `chrome://extensions/shortcuts`.
- Some key combos may be reserved by macOS/Chrome.
- Options page: features, URL Cleaner, Tab Dedup, Translation, Backup.

## 🧾 Commands
- 🗂️ Tabs: new, close, duplicate, move left/right/first/last, pin, mute, reload, hard reload, unload, detach.
- 🧭 Navigation: previous/next tab, first/last tab, last active tab, back/forward page, search and jump.
- ↔️ Split: simulated split + native Chrome split view entry.
- 🪟 Windows: new window, new incognito window.
- 🌐 Chrome pages: bookmarks, downloads, history, settings, extensions, shortcuts, flags, help.
- 🧹 URL Cleaner: copy cleaned URL.
- ♻️ Tab Dedup: auto-close duplicate tabs.
- 🌐 Translation: translate current selection.

## 📦 Build & Package
- Generate a local release ZIP:
```bash
./scripts/build-release.sh
```
- The ZIP is written to `release/` (`release/PK-Chrome-Shortcuts-v<version>.zip`).

## 🔒 Privacy
- Repo privacy policy: [PRIVACY.md](PRIVACY.md)
- Publishable HTML page for Chrome Web Store: [privacy-policy.html](privacy-policy.html)

## 🧪 Install (Chrome)
1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `.../Chrome_PKshortcuts/src`

## 📋 Changelog
See [CHANGELOG.md](CHANGELOG.md) for full history.

## 🔗 Links
- 🇫🇷 FR README: [README.md](README.md)
