# Changelog

Historique des releases de PK Chrome Shortcuts.

---

## TODO — Roadmap

Statut : `2026.07.01`

---

## Releases

### [2026.07.01] - 2026-07-30

#### Added
- page d'options avec navigation sidebar (features, url cleaner, tab dedup, traduction, sauvegarde, à propos)
- url cleaner avec modes strict / balanced / light / custom, suppression des paramètres tracking (utm, fbclid, gclid, etc.)
- tab deduplicator pour fermer les onglets en double
- traduction inline avec google translate + fallback mymemory
- auto-collapse des groupes d'onglets quand on quitte un groupe
- backup / import / reset de configuration
- thème dark / light dans les options
- commande c17 copy cleaned url (alt+shift+u suggéré)
- commande c18 dedup tabs
- commande c19 translate selection
- permission tabgroups pour l'api chrome.tabgroups

#### Changed
- format de version migré vers yyyymm.patch (skill pk-commits)
- build-release.sh : output dans release/, format pk-chrome-shortcuts-vversion.zip
- .gitignore : extension/ → release/
- suggested_key déplacées vers alt+shift pour éviter conflits chrome natif

#### Fixed
- permission tabgroups manquante (chrome.tabgroups était undefined)
- auto-collapse groupes : approche stateless (collapse tous les groupes sauf celui actif)
- raccourcis en conflit avec chrome natif (cmd+left, cmd+d, alt+left, etc.)

### [1.29] - 2026-07-01
- mise à jour branding pk-labs, noms cohérents et descriptions optimisées

### [1.26] - 2026-06-15
- délais augmentés pour la copie automatique (1.5s + 2s cooldown)

### [1.24] - 2026-06-10
- ajout copie automatique de texte sélectionné

### [1.19] - 2026-05-20
- ajout d'une politique de confidentialité dans le repo pour la publication chrome web store

### [1.10] - 2026-04-01
- renommage des identifiants de commandes pour imposer un tri logique par catégorie dans chrome

### [1.0] - 2026-03-15
- ajout du badge compteur d'onglets sur l'icône extension

### [0.45] - 2026-03-01
- structure projet en src/ (chargeable) + extension/ (artefacts release), scripts release/publish ajustés

### [0.43] - 2026-02-20
- hard reload par défaut en cmd+shift+r
