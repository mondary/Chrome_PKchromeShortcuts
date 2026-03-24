# PK Chrome Shortcuts

![Project icon](icon2.png)

[🇫🇷 FR](README.md) · [🇬🇧 EN](README_en.md)

✨ Extension Chrome pour piloter les onglets, la navigation et le split view via raccourcis clavier.

## ✅ Fonctionnalités
- Badge sur l’icône extension: compteur du nombre total d’onglets ouverts.
- `Cmd + Option + clic` sur un lien: split view simulé (fenêtres côte à côte).
- Détacher l’onglet actif dans une nouvelle fenêtre.
- Navigation d’onglets: précédent/suivant, premier/dernier, dernier onglet actif.
- Actions onglet: move, pin/unpin, mute/unmute, reload/hard reload, duplicate, unload.
- Ouverture rapide des pages Chrome (`chrome://bookmarks`, `history`, `flags`, etc.).
- Libellés de commandes groupés avec emojis dans `chrome://extensions/shortcuts`.

## 🧠 Utilisation
- Charge le dossier `src/` dans `chrome://extensions` (`Load unpacked`).
- Ouvre `chrome://extensions/shortcuts` pour voir/modifier les raccourcis.
- Le raccourci gestuel `Cmd + Option + clic` fonctionne directement sur les liens.

## 🗂️ Structure
- `src/`: source canonique de l'extension Chrome.
- `extension/`: ZIPs de release générés localement.
- `scripts/`: build et publication Chrome Web Store.
- `secrets/`: fichiers locaux sensibles non versionnés.
- `icon.png` et `icon2.png`: assets de projet conservés à la racine.

## ⚙️ Réglages
- Les raccourcis sont gérés nativement par Chrome dans `chrome://extensions/shortcuts`.
- Certaines combinaisons peuvent être réservées par macOS/Chrome.

## 🧾 Commandes
- 🗂️ Onglets: new, close, duplicate, move left/right/first/last, pin, mute, reload, hard reload, unload, detach.
- 🧭 Navigation: previous/next tab, first/last tab, last active tab, back/forward page, find, search and jump.
- ↔️ Split: split simulé + entrée split view natif Chrome.
- 🪟 Fenêtres: nouvelle fenêtre, nouvelle fenêtre privée.
- 🌐 Chrome pages: bookmarks, downloads, history, settings, extensions, shortcuts, flags, help.

## 📦 Build & Package
- Générer un ZIP release local:
```bash
./scripts/build-release.sh
```
- Le ZIP est écrit dans `extension/` (`extension/pk-chrome-shortcuts-<version>.zip`).

## 🧪 Installation (Chrome)
1. Ouvre `chrome://extensions`
2. Active `Developer mode`
3. Clique `Load unpacked`
4. Sélectionne `.../Chrome_PKchromeShortcuts/src`

## 🧾 Changelog
- `1.1`: correction compatibilité badge (fallback `action/browserAction`).
- `1.0`: ajout du badge compteur d’onglets sur l’icône extension.
- `0.45`: structure projet en `src/` (chargeable) + `extension/` (artefacts release), scripts release/publish ajustés.
- `0.44`: réorganisation initiale des dossiers.
- `0.43`: hard reload par défaut en `Cmd+Shift+R`.

## 🔗 Liens
- EN README: [README_en.md](README_en.md)
