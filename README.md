# Ma super app de musique

Lecteur de musique façon YouTube Music (thème sombre, mini-lecteur, file d'attente). À terme, il mélangera
les **fichiers locaux**, la **musique de Google Drive** et des **vidéos YouTube** (lecteur officiel intégré).
C'est une application web installable (PWA), sans serveur, publiée sur GitHub Pages.

- Application : https://loklyan.github.io/Ma-super-app-de-musique/
- Page de test d'arrière-plan (phase 0) : https://loklyan.github.io/Ma-super-app-de-musique/tests/test-lecture.html

Le cahier des charges complet est dans [`CLAUDE.md`](CLAUDE.md).

## Avancement

| Phase | Contenu | État |
|---|---|---|
| 0 | Test de lecture en arrière-plan (`public/tests/test-lecture.html`) | en attente des journaux Android / iPhone |
| 1 | Socle : PWA, lecteur local, file d'attente, Media Session | fait, à valider sur Android |
| 2 | Google Drive | à venir |
| 3 | YouTube et aléatoire mixte | à venir |
| 4 | Finitions | à venir |

## Développement

Prérequis : Node.js 22.

```bash
npm install
npm run dev      # http://localhost:5173/Ma-super-app-de-musique/
npm run check    # vérification des types
npm run build    # vérification + construction dans dist/
npm run preview  # sert dist/ en local
```

Pour tester sur téléphone, il faut une vraie adresse (https ou localhost). Une page ouverte en `file://`
ou dans un aperçu intégré bloque les liens `blob:` et le lecteur YouTube. Le plus simple est d'utiliser
la version publiée sur GitHub Pages.

## Déploiement (GitHub Pages)

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. Chaque push sur `main` lance le workflow `.github/workflows/deploy.yml`, qui construit et publie le site.
   On peut aussi le lancer à la main depuis l'onglet **Actions** (« Run workflow »).

Le chemin de base (`/Ma-super-app-de-musique/`) est réglé dans `vite.config.ts`. Le routage passe par le
« hash » (`#/bibliotheque`…) pour éviter les erreurs 404 au rechargement.

## Installer l'app sur le téléphone

- **Android (Chrome)** : ouvrir le site, menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil »).
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

## Configuration Google Cloud (pour la phase 2)

1. Créer un projet sur https://console.cloud.google.com/ et activer l'**API Google Drive**.
2. Écran de consentement OAuth : type « Externe », mode **test**, s'ajouter comme utilisateur test.
3. Identifiants → Créer un **ID client OAuth** de type « Application Web », avec comme origines JavaScript autorisées :
   - `http://localhost:5173`
   - `https://loklyan.github.io`
4. Transmettre le **client ID** (il est public : aucun secret n'est stocké dans le dépôt).

## Organisation du code

```
src/
  types.ts              Track, PlaybackError
  providers/            un fournisseur de lecture par source (un seul <audio> partagé)
  queue/controller.ts   PlaybackController : file, aléatoire, répétition, historique, Media Session
  storage/              IndexedDB (bibliothèque, fichiers locaux, réglages)
  ui/                   composants Svelte
public/tests/           page de test d'arrière-plan
```

## Licence

MIT.
