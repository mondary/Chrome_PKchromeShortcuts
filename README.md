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
- 🧭 Navigation: previous/next tab, first/last tab, last active tab, back/forward page, search and jump.
- ↔️ Split: split simulé + entrée split view natif Chrome.
- 🪟 Fenêtres: nouvelle fenêtre, nouvelle fenêtre privée.
- 🌐 Chrome pages: bookmarks, downloads, history, settings, extensions, shortcuts, flags, help.

## 📦 Build & Package
- Générer un ZIP release local:
```bash
./scripts/build-release.sh
```
- Le ZIP est écrit dans `extension/` (`extension/pk-chrome-shortcuts-<version>.zip`).

## 🔒 Confidentialite
- Politique de confidentialite repo: [PRIVACY.md](PRIVACY.md)
- Page HTML publiee possible pour le Chrome Web Store: [privacy-policy.html](privacy-policy.html)

## 🧪 Installation (Chrome)
1. Ouvre `chrome://extensions`
2. Active `Developer mode`
3. Clique `Load unpacked`
4. Sélectionne `.../Chrome_PKchromeShortcuts/src`

## 🧾 Changelog
- `1.25`: toggle copie automatique sur selection (Cmd+Shift+C).
- `1.24`: ajout copie automatique de texte sélectionné.
- `1.23`: suppression des ancres EN/FR inutiles sur la page de confidentialite.
- `1.22`: icon2 agrandi et integre plus sobrement dans le header de la page de confidentialite.
- `1.21`: ajout d'un fond visuel avec icon.png et drapeaux de langue sur la page de confidentialite.
- `1.20`: refonte de la page HTML de confidentialite avec design plus propre, bilingue FR/EN, et icon2.
- `1.19`: ajout d'une vraie politique de confidentialite dans le repo pour la publication Chrome Web Store.
- `1.18`: clarification du libelle Cmd+E pour indiquer que la barre de recherche doit etre ouverte.
- `1.17`: clarification des libelles Cmd+G / Cmd+Shift+G pour la recherche dans la page.
- `1.16`: mise en avant visuelle des suggestions avec un emoji dedie.
- `1.15`: ajustement du libelle "Rechercher et aller" pour afficher `Chrome: Cmd+Shift+A`.
- `1.14`: correction des libelles pour separer les vrais raccourcis Chrome des suggestions perso.
- `1.13`: libelles remis sur une seule ligne au format " · Chrome: ..." sans mention "Extension".
- `1.12`: harmonisation du separateur "Chrome ·" dans les libelles FR et EN.
- `1.11`: remplacement du format "Chrome :" par "Chrome ·" dans les libelles.
- `1.10`: renommage des identifiants de commandes pour imposer un tri logique par categorie dans Chrome.
- `1.9`: repositionnement de la commande de reouverture d'onglet avec les autres actions d'onglet.
- `1.8`: ajustement de l'ordre des commandes pour mieux regrouper les outils developpeur.
- `1.7`: reorganisation des commandes par typologie dans la liste des raccourcis Chrome.
- `1.6`: suppression des lignes "Extension : Non defini" dans les libelles de raccourcis.
- `1.5`: ajout du nombre d'entrees de raccourcis dans le titre de l'extension.
- `1.4`: harmonisation des libelles de raccourcis, suppression d'un doublon bookmarks, ajustement des suggestions de raccourcis.
- `1.3`: nettoyage structure, suppression du faux "find in page", ajout des commandes Chrome natives comme pense-bete dans les raccourcis.
- `1.1`: correction compatibilité badge (fallback `action/browserAction`).
- `1.0`: ajout du badge compteur d’onglets sur l’icône extension.
- `0.45`: structure projet en `src/` (chargeable) + `extension/` (artefacts release), scripts release/publish ajustés.
- `0.44`: réorganisation initiale des dossiers.
- `0.43`: hard reload par défaut en `Cmd+Shift+R`.

## 🔗 Liens
- EN README: [README_en.md](README_en.md)
