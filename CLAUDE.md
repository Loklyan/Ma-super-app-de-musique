# Lecteur de musique hybride : Google Drive + YouTube

Document de départ pour Claude Code. À placer à la racine du dépôt (sous le nom `CLAUDE.md` si tu veux qu'il soit relu à chaque session) ou à coller comme premier message.

## 1. Objectif

Une application de lecture de musique, façon YouTube Music (thème sombre, mini-lecteur, file d'attente), qui mélange dans une même file :

- la **musique personnelle stockée dans Google Drive** (et des fichiers locaux choisis sur l'appareil) ;
- des **vidéos et playlists YouTube** choisies par l'utilisateur (lien collé), lues avec le **lecteur officiel intégré**.

L'utilisateur choisit ses sources, et l'application pioche elle-même, en **mode aléatoire**, entre YouTube et Drive/local, avec un réglage de proportion.

Utilisateur : Benjamin, francophone, projet personnel. Interface **en français**.

## 2. Appareils et contraintes d'installation

| Appareil | Rôle | Remarque |
|---|---|---|
| Mac | Développement et premiers tests dans le navigateur | Pas de Xcode nécessaire pour la voie web |
| Android | Cible principale | Chrome, PWA installable |
| iPhone | Cible secondaire | Safari, PWA via « Sur l'écran d'accueil ». **Aucun abonnement développeur Apple** : pas d'app native ni de TestFlight |

## 3. Règles à ne pas enfreindre

1. **Aucune extraction de flux YouTube** (pas de youtube-dl / youtube_explode / yt-dlp, pas d'URL de flux directes), **aucun accès aux API internes non officielles** de YouTube Music (innertube, WEB_REMIX), pas de scraping, pas de proxy de contournement.
2. YouTube passe **uniquement** par l'API IFrame officielle. Le lecteur doit rester **visible**, d'au moins 200 × 200 px, ne pas être masqué ni recouvert : c'est une exigence des règles d'intégration de YouTube. Les publicités qu'il affiche ne sont pas bloquées.
3. Ne pas copier de code d'un projet sous licence GPL (par exemple SimpMusic). On peut s'inspirer des idées, pas du code. Code du projet sous licence MIT.
4. **Pas de backend**, pas de serveur : tout tourne dans le navigateur et se publie sur GitHub Pages.
5. **Aucun secret dans le dépôt.** L'identifiant client Google (client ID) est public et peut figurer dans la config ; il n'y a pas de « client secret » dans ce schéma. Pas de jeton ni de clé privée committés.

## 4. Stack par défaut

- **TypeScript + Vite**, interface légère (Svelte de préférence, React acceptable). Mobile d'abord.
- **PWA** : manifest, icônes, service worker pour le « shell » de l'app (via `vite-plugin-pwa`). Appeler `navigator.storage.persist()` au premier lancement.
- **Déploiement GitHub Pages** via GitHub Actions. Régler `base` de Vite sur le nom du dépôt ; routage en mode **hash** pour éviter les 404 au rechargement.
- Stockage local : **IndexedDB** (bibliothèque, playlists, réglages, historique). Les fichiers audio téléchargés de Drive vont dans un cache à taille limitée (LRU), qu'on peut vider depuis les réglages.

> Cette stack est la valeur par défaut. Si la phase 0 montre qu'elle ne tient pas sur Android (voir §9), le plan B est une app **Flutter** pour Android, en gardant la même architecture (§5). Ne pas basculer sans accord de l'utilisateur.

## 5. Architecture

### Piste (track)

```ts
type Track =
  | { id: string; source: 'drive'; driveFileId: string; title: string; artist?: string; album?: string; artworkUrl?: string; durationSec?: number }
  | { id: string; source: 'local'; handleOrFileKey: string; title: string; artist?: string; album?: string; artworkUrl?: string; durationSec?: number }
  | { id: string; source: 'youtube'; videoId: string; title: string; durationSec?: number };
```

### Fournisseurs de lecture

Une interface commune, une implémentation par source :

```ts
interface Provider {
  readonly id: 'drive' | 'local' | 'youtube';
  readonly playsInBackground: boolean; // true pour drive/local, false pour youtube
  play(track: Track): Promise<void>;
  pause(): void;
  resume(): void;
  seek(sec: number): void;
  preload?(track: Track): Promise<void>;
  onEnded(cb: () => void): void;
  onError(cb: (e: PlaybackError) => void): void;
}
```

- **Drive et local partagent UN SEUL élément `<audio>`**, créé une fois et réutilisé pour tous les morceaux (on change seulement `src`). Ne jamais créer un nouvel élément audio par morceau : iOS et Android refusent de lancer un nouveau lecteur depuis l'arrière-plan.
- **YouTube** : API IFrame officielle, un seul `YT.Player` réutilisé (`loadVideoById`).
- **Le passage au morceau suivant doit être déclenché par l'événement `ended` du lecteur**, jamais par un minuteur : les minuteurs sont ralentis ou gelés quand la page est masquée.

### Contrôleur de lecture (PlaybackController)

Seul point qui connaît la file d'attente. Il gère : file, index courant, aléatoire, répétition, historique, bascule selon la visibilité de la page, et la **Media Session** (titre, artiste, pochette, boutons lecture / pause / suivant / précédent / seek sur l'écran de verrouillage).

### Règle de bascule en arrière-plan

Le lecteur YouTube intégré est susceptible d'être mis en pause quand la page est masquée ou l'écran verrouillé, et un nouveau morceau YouTube lancé sans geste de l'utilisateur peut être refusé. Donc :

- Réglage « Quand l'app est en arrière-plan » avec 3 valeurs : **Jouer seulement Drive/local** (défaut), **Tenter YouTube quand même**, **Mettre en pause**.
- En mode par défaut, quand `document.visibilityState === 'hidden'`, le tirage aléatoire ignore les morceaux YouTube ; si le morceau suivant est YouTube, on saute au prochain morceau Drive/local.
- Quand la page redevient visible, YouTube redevient éligible.
- La valeur par défaut sera ajustée selon les résultats de la phase 0 (§9).

### Aléatoire mixte

- Réglage de proportion (curseur) : par exemple 70 % Drive/local, 30 % YouTube.
- Tirage en deux temps : on choisit d'abord la source selon la proportion, puis un morceau au hasard **parmi les morceaux non encore joués** de cette source. Quand une source est épuisée, on la remélange.
- Éviter l'effet « une playlist YouTube de 500 titres écrase 40 fichiers Drive » : c'est pour cela que la proportion s'applique par source et non par nombre de morceaux.
- Pas de répétition immédiate ; mémoriser l'historique pour « précédent ».

## 6. Google Drive

- Connexion avec **Google Identity Services** (modèle « token client », script `https://accounts.google.com/gsi/client`), sans backend.
- Portée par défaut : `https://www.googleapis.com/auth/drive.readonly`, en mode « test » avec le compte de l'utilisateur comme utilisateur autorisé (usage personnel, pas de vérification Google nécessaire).
  - Variante à garder en tête : **Google Picker** avec la portée `drive.file`, où l'utilisateur ne donne accès qu'aux fichiers qu'il sélectionne. Plus restrictif, intéressant si l'app devenait publique.
- L'utilisateur choisit un dossier Drive ; l'app liste récursivement ses fichiers audio (`mimeType contains 'audio/'`, avec repli par extension pour les fichiers dont le type est générique).
- **Lecture** : `fetch('https://www.googleapis.com/drive/v3/files/{id}?alt=media', { headers: { Authorization: 'Bearer ' + token } })` → `Blob` → `URL.createObjectURL` → `<audio>`. (La balise audio ne peut pas envoyer l'en-tête d'autorisation, d'où le téléchargement.)
- **Précharger le morceau suivant** pendant la lecture du courant.
- Le jeton d'accès expire (environ 1 h) : le renouveler silencieusement ; sur une erreur 401, renouveler puis réessayer une fois.
- **Métadonnées** : lire les tags ID3 / pochettes avec une bibliothèque comme `music-metadata` (`parseBlob`). Optimisation possible : ne récupérer que le début du fichier (requête `Range`) pour lire les tags sans tout télécharger.
- Formats : MP3 et M4A partout ; FLAC et OGG selon le navigateur (Safari est le plus restrictif). Si un format n'est pas lisible, l'indiquer clairement dans l'interface et passer au suivant.

## 7. YouTube

- L'utilisateur colle un lien (vidéo ou playlist) ; reconnaître `youtube.com/watch?v=`, `youtu.be/`, `music.youtube.com/watch?v=`, `list=`.
- Pour une playlist : `loadPlaylist` puis `getPlaylist()` pour récupérer les identifiants des vidéos, **à vérifier sur une grosse playlist** (le comportement peut être limité).
- Erreurs du lecteur : 101 et 150 (lecture hors YouTube interdite), 153 (page sans origine valide, par exemple ouverte en `file://`), autres : marquer le morceau « non lisible » et passer au suivant, sans boucler.
- Pas d'accès à la bibliothèque ou aux playlists personnelles de YouTube Music (aucune API officielle pour ça).
- Plus tard (optionnel) : recherche via l'**API YouTube Data v3** avec une clé d'API restreinte à l'origine du site ; le quota gratuit est limité, donc mettre en cache les résultats.

## 8. Interface

Mobile d'abord, thème sombre, proche de YouTube Music :

- barre inférieure : Accueil / Bibliothèque / File d'attente ;
- mini-lecteur persistant en bas, lecteur plein écran avec pochette ;
- onglets Bibliothèque : Drive, Local, YouTube, Playlists ;
- playlists mixtes (Drive + YouTube dans la même liste), export / import en JSON ;
- le lecteur YouTube s'affiche dans la vue plein écran quand un morceau YouTube joue, visible et d'au moins 200 × 200 px ;
- réglages : proportion aléatoire, comportement en arrière-plan, taille du cache, déconnexion Google.

## 9. Phases (avancer une phase à la fois)

À la fin de chaque phase : commit, déploiement GitHub Pages, puis **attendre la validation de l'utilisateur sur ses appareils** avant la suivante.

**Phase 0 : test d'arrière-plan (déjà fait en partie).** Le fichier `test-lecture.html` du dossier `tests/` sert à vérifier, sur Android et iPhone, la lecture écran verrouillé et le passage local → YouTube en arrière-plan. Les résultats de l'utilisateur décident de la règle de bascule par défaut et de la stack (§4). Ne pas la considérer terminée tant que l'utilisateur n'a pas transmis les journaux.
*Point déjà observé* : dans un contexte d'ouverture restreint (aperçu intégré ou `file://`), le navigateur a refusé le lien `blob:` (« Media load rejected by URL safety check ») et le lecteur YouTube ne s'initialisait pas. Toujours tester via une vraie adresse (`localhost` ou https).

**Phase 1 : socle.** Projet Vite + TypeScript, PWA, déploiement GitHub Pages, lecteur local (sélection de fichiers), file d'attente, Media Session, un seul élément `<audio>`, interface de base.
*Validé quand* : sur Android, un MP3 continue de jouer écran verrouillé, avec les boutons de l'écran de verrouillage ; l'app s'installe sur l'écran d'accueil.

**Phase 2 : Google Drive.** Connexion, choix d'un dossier, liste, lecture avec préchargement, renouvellement du jeton, cache LRU, métadonnées.
*Validé quand* : 10 morceaux d'un dossier Drive s'enchaînent écran verrouillé sans coupure.

**Phase 3 : YouTube et file mixte.** Lecteur IFrame, ajout par lien, playlists, aléatoire mixte avec proportion, règle de bascule selon la visibilité.
*Validé quand* : en mélange, l'app ignore YouTube écran verrouillé et le réintègre quand l'écran se rallume (ou se comporte selon le réglage choisi).

**Phase 4 : finitions.** Playlists persistantes et export JSON, recherche dans la bibliothèque, paroles (fichiers `.lrc` ou API LRCLIB), thème, réglages, nettoyage.

## 10. Ce que l'utilisateur doit faire lui-même

Claude Code ne peut pas le faire à sa place :

1. Créer le dépôt GitHub et activer **Pages** (source : GitHub Actions).
2. Dans la console Google Cloud : créer un projet, activer l'**API Google Drive**, créer un **identifiant OAuth de type « Application Web »** avec comme origines JavaScript autorisées `http://localhost:5173` et `https://<utilisateur>.github.io`, configurer l'écran de consentement en mode test et s'ajouter comme utilisateur test. Fournir le **client ID** à Claude Code.
3. Tester sur ses appareils et transmettre les journaux de la page de test.

## 11. Qualité attendue

- Code typé, structuré en modules (`providers/`, `queue/`, `drive/`, `youtube/`, `ui/`), sans dépendance inutile.
- Gérer proprement les erreurs (réseau, jeton expiré, format non supporté, vidéo non intégrable) avec un message en français ; ne jamais bloquer la file à cause d'un morceau.
- README en français : installation, configuration Google Cloud, déploiement.
- Petits commits, un message clair par commit.
- Avant d'ajouter une dépendance importante ou de changer de stack : demander.

## 12. Risques connus

- Lecture YouTube en arrière-plan : non garantie, d'où la règle de bascule.
- Stockage de Safari sur iPhone : peut être purgé ; Drive reste la source de vérité, le cache est reconstruisible.
- Formats FLAC / OGG sur Safari.
- L'identifiant OAuth en mode test peut imposer une reconnexion régulière.
