---
name: cursor-soccer-guidelines
description: 'Utiliser pour appliquer les règles de Direction Artistique (DA), les normes de code (TypeScript, architecture), et la sécurité du jeu Cursor Soccer.'
user-invocable: true
disable-model-invocation: false
---

# Cursor Soccer - Lignes Directrices

Ce skill contient toutes les règles fondatrices pour le développement du jeu "Cursor Soccer" (jeu de foot multijoueur web basé sur les curseurs/snakes).

## Quand utiliser ce skill
- Lors de la création de nouveaux composants UI ou l'implémentation de la Direction Artistique.
- Lors de l'écriture ou de l'optimisation du moteur physique et de la boucle de jeu.
- Pour la mise en place du réseau (multijoueur, WebSockets).
- Pour vérifier les règles de sécurité et d'anti-cheat.

## Procédures & Règles

### 1. Direction Artistique (DA)
Consultez le fichier [DA & UI](./references/da.md) pour les couleurs, les animations, et le "juice" (particules, trails). Le jeu doit être "moderne, fluide, beau et dynamique".

### 2. Règles de Code & Architecture
Consultez le fichier [Architecture & Code](./references/code.md) pour les standards TypeScript, la séparation Client/Serveur, et l'optimisation de la boucle de jeu.

### 3. Sécurité & Multijoueur
Consultez le fichier [Sécurité](./references/security.md) pour les principes d'autorité du serveur, la mitigation du lag, et l'anti-triche.
