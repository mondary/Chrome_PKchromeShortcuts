# PK Chrome Shortcuts MVP

## Ce que fait ce MVP
- `Cmd + Option + clic` sur un lien: ouvre le lien dans une nouvelle fenetre redimensionnee (style vue fractionnee).
- `Cmd + Shift + U` (via `chrome://extensions/shortcuts`): detache l'onglet courant dans une nouvelle fenetre.
- `Navigate to last active tab` (via `chrome://extensions/shortcuts`): revient a l'onglet precedent actif.
- `Cmd + Shift + P` (via `chrome://extensions/shortcuts`): pin / unpin l'onglet actif.
- `Cmd + Shift + K` (via `chrome://extensions/shortcuts`): search and jump.
- `Cmd + Shift + L` (via `chrome://extensions/shortcuts`): search in background.
- `Split active tab (simulated)` reste disponible via `chrome://extensions/shortcuts` (pas de raccourci par defaut pour eviter conflit).
- Entree `Split View reel Chrome` visible dans `chrome://extensions/shortcuts` (raccourci natif Chrome: `Cmd + Option + N`).

## Installation rapide
1. Ouvre `chrome://extensions`
2. Active le mode Developpeur
3. Clique sur `Load unpacked`
4. Selectionne ce dossier: `/Users/clm/Documents/GitHub/TESTS/Chrome_PKchromeShortcuts`

## Test rapide
- Va sur une page web avec des liens, puis fais `Cmd + Option + clic` sur un lien.
- Ouvre `chrome://extensions/shortcuts` puis verifie/modifie les raccourcis de l'extension.
- Sur une page web, fais `Cmd + U`.

## Notes
- `Cmd + U` est un raccourci reserve de Chrome (View Source). Si besoin, change-le dans `chrome://extensions/shortcuts`.
