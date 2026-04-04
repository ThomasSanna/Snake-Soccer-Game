# Direction Artistique (DA) - Cursor Soccer

## Mots-clés
**Moderne, Fluide, Beau, Dynamique, Tactique.**

## Esthétique générale
- **Thème néon / cyberpunk léger** ou **minimalisme épuré (Glassmorphism)**.
- Arène de jeu sombre avec des lignes de terrain lumineuses.
- Les joueurs ne sont pas des sprites de personnages, mais des **entités abstraites** : des curseurs ou des petits "snakes" lumineux avec une traînée persistante (trail) indiquant leur vitesse et direction.

## Animation et "Juice"
- **Trails (Traînées) :** La queue du snake/curseur s'allonge avec la vitesse. Indispensable pour l'aspect fluide et pour visualiser l'inertie.
- **Impacts :** Lorsqu'un curseur frappe la balle, de légères particules (étincelles) s'échappent dans la direction opposée à l'impact.
- **Screen Shake :** Un léger tremblement d'écran lors d'un gros impact ou d'un but.
- **Déformation (Squash & Stretch) :** La balle se déforme légèrement lorsqu'elle va très vite ou rebondit contre un mur.
- **Sons dynamiques :** Effets de synthétiseur (synths) qui réagissent à la violence du choc avec la balle.

## Mécanique Visuelle "Snake"
L'aspect "snake" a un impact direct sur le gameplay. La hitbox n'est pas un simple cercle. 
- Frapper la balle avec la "tête" déclenche un tir puissant.
- Bloquer la balle avec le "corps" ou le côté agit comme un mur absorbant (amorti).
- **Le Mouvement vers la Souris :** Le snake suit la souris avec une limite de vitesse et de l'inertie, imposant un temps de réaction (pas de téléportation instantanée).
- **L'Endurance (Stamina) & Sprint :** Un boost/sprint temporaire (clic gauche ou espace) consomme une jauge d'endurance. Visuellement, l'endurance pourrait être représentée par la longueur du "corps" ou l'intensité lumineuse du néon du snake, qui diminue lorsqu'il sprinte.
