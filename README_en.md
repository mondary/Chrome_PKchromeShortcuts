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

## 🧠 Usage
- Load the `src/` folder in `chrome://extensions` (`Load unpacked`).
- Open `chrome://extensions/shortcuts` to view/edit shortcuts.
- The gesture shortcut `Cmd + Option + Click` works directly on links.

## 🗂️ Structure
- `src/`: canonical Chrome extension source.
- `extension/`: locally generated release ZIPs.
- `scripts/`: build and Chrome Web Store publish scripts.
- `secrets/`: unversioned local sensitive files.
- `icon.png` and `icon2.png`: project assets kept at the repo root.

## ⚙️ Settings
- Shortcuts are managed natively by Chrome in `chrome://extensions/shortcuts`.
- Some key combos may be reserved by macOS/Chrome.

## 🧾 Commands
- 🗂️ Tabs: new, close, duplicate, move left/right/first/last, pin, mute, reload, hard reload, unload, detach.
- 🧭 Navigation: previous/next tab, first/last tab, last active tab, back/forward page, search and jump.
- ↔️ Split: simulated split + native Chrome split view entry.
- 🪟 Windows: new window, new incognito window.
- 🌐 Chrome pages: bookmarks, downloads, history, settings, extensions, shortcuts, flags, help.

## 📦 Build & Package
- Generate a local release ZIP:
```bash
./scripts/build-release.sh
```
- The ZIP is written to `extension/` (`extension/pk-chrome-shortcuts-<version>.zip`).

## 🔒 Privacy
- Repo privacy policy: [PRIVACY.md](PRIVACY.md)
- Publishable HTML page for Chrome Web Store: [privacy-policy.html](privacy-policy.html)

## 🧪 Install (Chrome)
1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `.../Chrome_PKchromeShortcuts/src`

## 🧾 Changelog
- `1.23`: removed the unnecessary EN/FR anchor links from the privacy page.
- `1.22`: enlarged icon2 and made it feel more integrated in the privacy page header.
- `1.21`: added a large icon.png background accent and language flags to the privacy page.
- `1.20`: redesigned the HTML privacy page with a cleaner layout, bilingual FR/EN content, and icon2 branding.
- `1.19`: added a proper privacy policy to the repo for Chrome Web Store publication.
- `1.18`: clarified the Cmd+E label to indicate the find bar must already be open.
- `1.17`: clarified the Cmd+G / Cmd+Shift+G labels for find-in-page navigation.
- `1.16`: made suggestions more visually obvious with a dedicated emoji.
- `1.15`: updated the "Search and jump" label to show `Chrome: Cmd+Shift+A`.
- `1.14`: corrected labels to separate real Chrome shortcuts from personal suggestions.
- `1.13`: flattened labels to a single-line " · Chrome: ..." format without any "Extension" wording.
- `1.12`: normalized the "Chrome ·" separator across FR and EN labels.
- `1.10`: renamed command IDs to enforce a logical category order in Chrome.
- `1.9`: moved reopen-tab command next to the other tab actions.
- `1.8`: adjusted command ordering to better group developer tools.
- `1.7`: reordered commands by category in the Chrome shortcuts list.
- `1.6`: removed "Extension: Not set" lines from shortcut labels.
- `1.5`: added shortcut entry count to the extension title.
- `1.4`: normalized shortcut labels, removed one bookmarks duplicate, adjusted shortcut suggestions.
- `1.3`: structure cleanup, removed fake "find in page", added native Chrome commands as shortcut reminders.
- `1.1`: fixed badge API compatibility (`action/browserAction` fallback).
- `1.0`: added tab count badge on extension icon.
- `0.45`: project structure finalized as `src/` (loadable) + `extension/` (release artifacts), release/publish scripts updated.
- `0.44`: initial folder restructuring.
- `0.43`: hard reload default set to `Cmd+Shift+R`.

## 🔗 Links
- FR README: [README.md](README.md)
