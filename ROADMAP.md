# Plan de Conception & Roadmap : Cursor Soccer

## 1. Concept Global
- **Genre :** Jeu de football / air-hockey tactique multijoueur (1v1, 2v2).
- **Entités :** Les joueurs contrôlent des "Snakes" (un ensemble de segments de lignes lumineuses suivant une tête).
- **Contrôles physiques :** 
  - La tête du snake pointe vers la souris, mais ne s'y téléporte pas.
  - Vitesse limitée avec un système d'**inertie** (imposant de braquer/freiner avec le corps).
  - **Endurance & Sprint :** Un boost temporaire (clic) consommant une jauge (visuellement liée à la longueur ou luminosité du snake).
- **Direction Artistique :** Moderne, sombre, néon/cyberpunk, particules dynamiques, fluide à haut framerate (PixiJS/WebGL).
- **Tactique :** Frapper avec la tête pour un tir puissant, amortir/dévier avec le corps ou le côté.

## 2. Choix Technologiques ("Le Meilleur")
- **Architecture :** Monorepo (npm workspaces ou Turborepo)
- **Frontend (Client) :** 
  - **Moteur de rendu :** PixiJS (WebGL) pour gérer 60-144fps avec effets visuels intenses (shaders néon, traînées, particules).
  - **UI (Menus, HUD) :** React + Vite.
- **Backend (Serveur) :** 
  - **Environnement :** Node.js avec TypeScript.
  - **Réseau :** Colyseus (Framework TS de serveurs multijoueurs gérant l'état, les "Rooms" et la delta-compression).
- **Moteur Physique :** Custom (Mathématiques 2D vectorielles + algorithme de Verlet pour la souplesse du snake) ou moteur Headless extrêmement léger. Côté serveur autoritaire, avec prédiction côté client.

## 3. Roadmap de Développement

### Phase 1 : Le Prototype "Jouet" (Local & Solo)
L'objectif de cette phase est le **"Game Feel"**. Le code tourne uniquement dans le navigateur, pas de serveur réseau.
- Setup du Canvas / Moteur de base (PixiJS).
- Création du "Snake" avec l'algorithme de suivi de cible (la souris) et l'inertie.
- Implémentation du système de vitesse max, accélération, et jauge d'endurance (Sprint).
- Ajout d'une balle et des murs avec rebonds basiques.
- Tests de collision (tête vs balle pour tirs, corps vs balle pour amortis).

### Phase 2 : Le "Juice" et l'Expérience Visuelle
- Ajout des effets visuels : traînée (trail) fluide du snake.
- Particules à l'impact (balles/murs, balles/joueurs).
- Déformation de la balle (Squash & Stretch).
- Tremblement de caméra (Screen-shake) lors d'un gros impact ou d'un tir sprinté.

### Phase 3 : Infrastructure Serveur & Multijoueur Stricte
- Création du monorepo et du serveur Node.js (Colyseus).
- Transfert de *toute* la logique physique/collision (State) au serveur. Le client ne fait plus que "lire" les positions et "envoyer" des inputs (position souris, clic de sprint).
- Implémentation de la "Client-side Prediction" (le client devine le mouvement en attendant la confirmation du serveur pour éviter l'input lag).

### Phase 4 : Boucle de jeu, Matchmaking et Lobbies
- Implémentation des règles de match (Score, Timer, Engagement au centre après un but).
- Création des "Rooms" sur le serveur (1v1, 2v2).
- Menus React pour créer/rejoindre une partie (Lobby/Matchmaking).

### Phase 5 : Sécurité, Polish et Déploiement
- Hardcoding des limites réseau (Rate Limiter, Stamina verification server-side).
- Déploiement : Client sur un CDN (ex: Vercel) et le Serveur WebSocket sur un VPS/PaaS.
