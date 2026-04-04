# Game Design Document (GDD) - Cursor Soccer

Ce document détaille les mécaniques précises du jeu afin que n'importe quel développeur (ou IA) comprenne exactement le comportement mathématique et physique attendu avant de coder.

## 1. Perspective et Échelle
- **Vue :** Top-down 2D (vue de dessus).
- **Proportions :** Le terrain est un grand rectangle (ex: 1920x1080 en logique absolue) mis à l'échelle sur l'écran du joueur pour toujours garder le même ratio (ex: 16:9).

## 2. Le Snake (Le Joueur)
Le snake n'est pas un simple polygone, c'est une structure cinématique.
- **Structure de Données :** Un tableau de noeuds (ex: 10 à 20 points `x, y`). Le noeud `0` est la Tête.
- **Déplacement (La Tête) :** La tête utilise un algorithme de "*Steering Behavior*" (Recherche de cible). Elle est attirée par l'objectif (la position de la souris) mais est bridée par une `vitesse_max` et une `force_de_braquage` (inertie temporelle). 
- **Déplacement (Le Corps) :** Les autres noeuds suivent la tête en utilisant de la *Cinématique Inverse* (Inverse Kinematics) ou une *Intégration de Verlet* (contraintes de distance). Cela crée naturellement l'effet fluide de serpentin.
- **Endurance (Stamina) & Sprint :**
  - **Action :** Un appui sur *Clic Gauche* ou *Espace*.
  - **Comportement :** Multiplie la `vitesse_max` et la `force_de_braquage` par X (ex: 1.5).
  - **Coût :** Vide la jauge de "Stamina" de X par frame. La jauge se recharge lentement si le joueur ne sprinte pas.
  - **Visuel :** Le rayon (l'épaisseur) ou le Glow (lumière) du snake rétrécit à mesure que la jauge descend.

## 3. La Physique de la Balle et les Collisions
C'est ici que la tactique 1v1 / 2v2 prend tout son sens.
- **La Balle :** Un objet circulaire de petit rayon, avec un fort *bounciness* (restitution élastique) et un léger *damping* (friction de l'air) pour qu'elle finisse par s'arrêter.
- **Collision Balle <=> Tête du Snake :**
  - La tête est considérée comme un **Cercle**.
  - Lorsqu'elle percute la balle, une grande force d'impulsion (Vecteur de frappe) est appliquée à la balle, basée sur la vitesse actuelle de la tête. C'est le moyen de faire un Tir / Dégagement.
- **Collision Balle <=> Corps du Snake :**
  - Le corps est vu physiquement comme une série de **Segments de Ligne** (Capsules) entre chaque noeud.
  - La collision balle/corps est très différente : elle a un coefficient de restitution faible (absorbe le choc).
  - Utilisation tactique : Le joueur fait glisser sa souris sur le côté de la balle pour que le corps s'enroule ou se pose devant la balle pour l'arrêter net (amorti de la poitrine).

## 4. Le Terrain
- **Bordures :** Les murs du haut et du bas font rebondir la balle.
- **Cages (Buts) :** Situées à gauche et à droite. Un but est validé quand la balle franchit la ligne. Une onde de choc visuelle repousse les joueurs, l'écran tremble, un son lourd se joue, le score est mis à jour et le jeu se met en pause 2-3 secondes avant de replacer tout le monde au centre.

## 5. Feeling et "Juice" (Recommandations Code IA)
- Ne jamais lier les inputs du joueur à des changements de position purs (`x = mouse.x`). Toujours appliquer des **Vecteurs de vélocité** (`velocity.x += force`).
- Utiliser un `TickRate` (ex: 60Hz) strict pour la physique (updates), séparé de la boucle de rendu (draw).
- Pour les effets (étincelles, traînées lumineuses), utiliser un système d'émetteur de particules détaché du système physique autoritaire, afin que la fantaisie visuelle (client) n'alourdisse jamais le calcul du réseau (serveur).