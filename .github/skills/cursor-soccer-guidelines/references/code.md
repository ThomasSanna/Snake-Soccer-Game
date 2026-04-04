# Règles de Code - Cursor Soccer

## Architecture Générale
- **Séparation Stricte Client/Serveur :** Le client s'occupe du rendu, des inputs locaux, et de l'extrapolation (pour la fluidité). Le serveur s'occupe de la source de vérité, de la logique physique complète et de la gestion des états de match (but, score, timers).
- **TypeScript / Environnement Typé :** Utiliser des interfaces solides partagées entre client et serveur pour l'état du jeu (State), les actions (Inputs), et la configuration physics (Friction, Max Speed, Radius).
- **Boucle de Jeu Déterministe :** La boucle de jeu doit posséder un tick rate fixe sur le serveur (ex: 60Hz), et le moteur physique doit être abstrait et tourner à la fois côté client et côté serveur (pour la prédiction côté client et l'autorisation côté serveur).

## Technologies Recommandées ("Le Meilleur")
- **Architecture de Build :** Monorepo (Turborepo ou simple workspaces pnpm/npm) avec Vite pour le front-end et esbuild/tsup pour le back-end.
- **Backend :** Node.js avec `Colyseus` (Framework multi-joueurs TypeScript ultra-robuste avec gestion native des "Rooms", state-syncing et delta-compression) ou `uWebSockets.js` si un framework de bas niveau ultra-performant est désiré. 
- **Moteur Physique :** `Matter.js` sans rendu côté serveur (ou un moteur physique sur-mesure `PhysicEngine.ts` si la logique du "snake" est trop spécifique et demande des calculs mathématiques purs de vecteurs plutôt qu'un moteur de corps rigides classique).
- **Frontend :** `PixiJS` (Moteur WebGL 2D le plus rapide) couplé à Vite. Interface UI en `React` ou `Svelte` superposée par-dessus le Canvas. Vue que le jeu demande beaucoup de particules et de lumières "néon", PixiJS est indiscutable pour la perf et les shaders (glowing effects).

## Règles de nommage & Organisation
- **Répertoires Séparés :** `server/`, `client/`,  `shared/` (inclut les types et constantes de la physique).
- Mots-clés en anglais pour tout le code (Variables, classes, fonctions). Documentation en français possible si souhaité, mais l'Anglais est le standard.
- Toujours utiliser `const` et éviter les allocations de mémoires massives (ex: création dynamique de milliers d'objets pendant le `update()` de la game loop) pour éviter les GC Spikes (Garbage Collector stutters).
