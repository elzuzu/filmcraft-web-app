# FilmCraft Web

**Un éditeur vidéo non linéaire complet, directement dans le navigateur. Sans installation, sans compte, sans envoi de médias.**

### ▶ [**Jouer maintenant**](https://elzuzu.github.io/filmcraft-web-app/)

[![FilmCraft Web : timeline, moniteurs Source et Programme, gradation couleur et vumètres](docs/screenshot.jpg)](https://elzuzu.github.io/filmcraft-web-app/)

<p align="center"><sub>Le projet de démonstration : montage multi-pistes, moniteurs, vumètres et project bin. Tous les médias de cette capture sont générés par FilmCraft.</sub></p>

---

> Version modifiée indépendante, basée sur FilmCraft par l’équipe ArtCraft.

## Ce que vous pouvez faire

- **Monter** : timeline multi-pistes, montage en trois points, insert/overwrite, ripple, roll, slip, slide, rate stretch, rasoir, transitions, marqueurs, nests, multicam.
- **Étalonner** : correction primaire, roues chromatiques, courbes, HSL secondaire, vignette, scopes waveform/vectorscope calculés sur l'image gradée.
- **Animer** : position, échelle, rotation, opacité, plus de 90 effets et une trentaine de transitions, keyframes linéaires/Bezier/hold.
- **Son** : mixage, EQ, dynamique, limiteur true-peak, automation, vumètres ITU-R BS.1770 / EBU R128.
- **Titrer** : moteur de texte OpenType, titres, formes, tracés, sous-titres SRT/WebVTT/SCC.
- **Exporter** : H.264 MP4 + AAC, ProRes 422 HQ, DNxHR, GIF, WAV, séquences PNG, avec rendu en arrière-plan. L’option de stockage navigateur pour H.264 limite le tampon de sortie pendant l’encodage ; la mémoire totale reste dépendante du projet.
- **Prévisualiser** : rendre les aperçus vidéo et audio de la séquence pour accélérer leur lecture pendant la session. Le cache partagé est limité à 256 Mio ; le rendu peut utiliser davantage de mémoire temporaire.

Le **gestionnaire de projet** peut télécharger un paquet `.fcpack` contenant une copie du projet, ses médias liés, ses séquences d’images et ses proxys. Ouvrez ce paquet par **Fichier → Ouvrir** ou par glisser-déposer. Vous pouvez limiter la collecte aux séquences choisies et à leurs dépendances, exclure les proxys et inclure les aperçus audio et vidéo disponibles. Les médias inclus manquants empêchent la création. La consolidation peut réduire et transcoder les vidéos et les fichiers audio compatibles, y compris certains WAV 5.1 dont les canaux sont identifiés ; les médias incompatibles sont conservés entiers et signalés. Les paquets avec aperçus nécessitent web.18 ou une version ultérieure. Le paquet vérifie ses données, mais n’est ni chiffré ni signé.

Le projet de démo s'ouvre au chargement. Vous pouvez importer vos propres fichiers par glisser-déposer ou avec **Importer**.

**Clip d'essai :** [`samples/ocean-sunset.mp4`](samples/ocean-sunset.mp4) (2 s, 640×360, généré par FilmCraft) — téléchargez-le puis glissez-le dans l'application.

Le suivi des masques fonctionne depuis les contrôles d’effet et par commande, avec traitement progressif. Les images clés déjà calculées sont conservées en cas d’arrêt ; modifier ou remplacer le projet interrompt le suivi en cours.

Les proxys peuvent être créés dans le navigateur par lots de médias vidéo (H.264 ou ProRes), traités un à un. La taille pratique du lot dépend de la mémoire disponible. Le fichier reste dans la session et est proposé au téléchargement : conservez-le si vous souhaitez le réutiliser.

## Configuration

| | |
|---|---|
| Navigateurs | Chrome / Edge récents (WebGPU), Firefox et Safari récents (WebGL2) |
| Rendu | WebGPU quand disponible, sinon WebGL2 ; `?webgl` force WebGL2, `?cpu` force le rendu CPU |
| Réseau | 100 % statique ; les médias restent sur votre machine et ne sont jamais téléversés |
| Poids | ~47,7 Mo de `.wasm` (≈15 Mo compressé), chargé une fois puis mis en cache |
| Compte | aucun |

Si le WebGPU de votre pilote pose problème, ouvrez la page avec
[`?webgl`](https://elzuzu.github.io/filmcraft-web-app/?webgl). Le son démarre après le
premier clic ou la première touche, comme l'exigent les navigateurs.

## Agents et automatisation

Chaque bouton, menu, glisser-déposer et raccourci est une **commande** du moteur.
La build web expose **716 commandes** via `window.filmcraft`, ce qui permet à un
agent de monter, étalonner, mixer et exporter exactement comme une personne.

```js
// Dans la console du navigateur
await filmcraft.execute('playhead.start');
await filmcraft.request('ui.playback', { action: 'play' });
const state = await filmcraft.inspect();
const shot = await filmcraft.screenshot({});
```

- [`AGENTS.md`](AGENTS.md) — référence de l'API `window.filmcraft`, modèle de temps, sélecteurs stables.
- [`agent/manifest.json`](agent/manifest.json) — descripteur lisible par machine (version, API, renderers, commandes).
- [`llms.txt`](llms.txt) — index pour les agents qui découvrent le site.
- `readFileChunk(path, offset, length)` — lecture par blocs de 4 Mio pour récupérer les exports volumineux sans plafond de 256 Mio.

L'outillage **MCP + skill** complet (serveur stdio, CLI, skill portable, tests
d'intégration, scripts de build et de publication) est maintenu dans le dépôt
privé `filmcraft-agent`. Il n'est pas publié ici ; accès sur demande.

## Code source et licence

Ce dépôt est une **distribution compilée** : il ne contient pas le code source de
l'application. `filmcraft_web.js` est la colle générée par `wasm-bindgen`,
nécessaire pour charger le binaire ; ce n'est pas le code du projet.

- Le portage web, le packaging, le déploiement et l'outillage agent sont dans un
  dépôt privé.
- FilmCraft est un logiciel libre du projet **ArtCraft**, sous
  [MIT](LICENSE-MIT) **ou** [Apache-2.0](LICENSE-APACHE), au choix.
  Dépôt amont : <https://github.com/storytold/filmcraft>.
- Les notices tierces (polices OFL, composants MPL, etc.) sont dans
  [`NOTICE`](NOTICE) ; les crédits et licences des médias dans
  [`ATTRIBUTION.md`](ATTRIBUTION.md).

**Version :** FilmCraft `0.17.0` — commit amont `32749e34f611`, build web.31 du
3 novembre 2026. Les empreintes des fichiers distribués sont dans
[`SHA256SUMS.txt`](SHA256SUMS.txt) :

```sh
sha256sum -c SHA256SUMS.txt
```

**Mise en ligne :** GitHub Pages sert la branche `main` à la racine. Voir
[`HOSTING.md`](HOSTING.md) pour un autre hébergeur (MIME `application/wasm`,
compression, cache).

## Crédits

FilmCraft est créé par l'équipe **ArtCraft** et ses contributeurs. Cette build web
est une distribution indépendante, **non affiliée et non endossée** par ArtCraft.
Les marques et logos ArtCraft ne sont pas utilisés dans ce dépôt. Les captures
montrent uniquement FilmCraft et des médias générés par FilmCraft.



Les exports H.264, ProRes, DNxHR, APV, Motion JPEG, MXF OP1a, WAV, AIFF, FLAC et AAC/M4A peuvent utiliser le stockage du navigateur. La reprise après fermeture nécessite le même profil, la même origine et Web Locks. Les copies de médias restent distinctes du projet et peuvent être évincées.

Les réglages de sauvegarde automatique affichent l’état des copies de médias de récupération. La taille des copies dépend du quota et de l’espace disponibles ; leur présence ne remplace pas une sauvegarde des originaux.

Les nouvelles copies de récupération sont vérifiées par empreinte SHA-256, y compris après redémarrage. Les anciennes copies sont signalées comme non vérifiées. Les séquences d’images locales utilisent un inventaire lié à la sauvegarde. Les proxys peuvent aussi être créés sur le stockage du navigateur ; leur copie de récupération est distincte et asynchrone.

Les médias et séquences de nouveaux paquets ouverts peuvent être copiés pour la récupération après validation. Les anciens chemins numériques de paquets ne sont pas migrés : conservez et rouvrez le paquet d’origine. Un nettoyage explicite des seules copies interrompues non marquées est disponible pour les agents.

Les paquets portables peuvent utiliser le stockage du navigateur ; leur récupération après fermeture nécessite Web Locks et le même profil. Les copies de médias de récupération sont traitées une à une. La mémoire interne du navigateur reste dépendante du projet.

Les paquets écrits sur le stockage navigateur sont comparés par empreinte à leur source avant publication. Les WAV sont préparés à la lecture sans précharger systématiquement tout le fichier ; le cache et la copie de récupération restent soumis aux ressources disponibles.

Les AIFF PCM non compressés pris en charge peuvent être lus à la demande. Les sauvegardes explicites sont relues et vérifiées avant confirmation ; l’annulation de l’ouverture d’un paquet empêche le remplacement du projet si elle intervient avant sa validation finale.

Les variantes AIFF-C PCM prises en charge sont lues à la demande. Les nouvelles sauvegardes explicites conservent une empreinte vérifiée à la réouverture et nécessitent Web Locks ; les anciennes restent lisibles. La création de paquet peut être annulée avant publication.

Les FLAC natifs à durée connue peuvent être lus par fenêtres. L’ouverture d’un projet contrôle les modifications et l’annulation avant remplacement. Un agent peut lister et supprimer explicitement les fichiers de sauvegarde v2 sans marqueur ; ils peuvent contenir des données récupérables.

Les imports en attente et l’ouverture de sauvegardes contrôlent l’annulation avant de modifier le projet. La copie locale effectuée par le MCP conserve l’état modifié du projet dans le navigateur.
