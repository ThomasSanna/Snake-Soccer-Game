# Sécurité de "Cursor Soccer"

## L'Autorité du Serveur
La règle de base pour n'importe quel jeu multijoueur (en particulier web) : **Le client ne doit jamais être la source de vérité.** Ne jamais faire confiance au client :
- Le client N'envoie PAS "J'ai frappé la balle avec 100 de puissance vers la droite."
- Le client ENVOIE ses inputs bruts : "Ma souris est à ces coordonnées, j'ai cliqué/j'utilise mon dash", et inclut un Event ID ou numéro de frame en cours.
- Le Serveur VALIDE le mouvement du curseur : Ce vecteur de vitesse est-il possible sans dash ? L'intervalle de temps entre sa dernière position et l'actuelle permet-elle un déplacement aussi grand ?

## Anti-Triche & Mesures
- **DDoS et Spamming :** Mettre en place un Rate Limiter (limitation du taux de requêtes) strict sur les WebSockets. Si un client envoie 1000 messages Mouvement par seconde, le déconnecter instantanément.
- **Manipulation des Vitesses (Speedhacks) :** Côté Serveur, le vecteur de déplacement doit passer par un `clamp` de la vitesse maximale théorique d'un personnage (Snake ou curseur).
- **Validation d'Endurance (Stamina Check) :** Le serveur gère et réduit lui-même la 'Stamina' d'un joueur. Même si un client envoie de faux messages pour sprinter en continu, si le serveur calcule que l'endurance est à zéro, les requêtes de sprint seront traitées comme des déplacements normaux.
- **Manipulation des Variables Locales :** Obfusquez le code et liez solidement l'interface au réseau et à l'architecture. Mais même s'ils manipulent les variables client-side (vitesse client modifiée ou hitbox locale modifiée), c'est le serveur qui gèrera seul la vraie version, ce qui rend la manipulation "vide" de sens côté tricheur (le monde lui retournera la 'bonne' réalité, lui créant du rubber-banding constant).

## Protection des Lobbies
- Tokens JWT (JSON Web Tokens) ou validation de session au chargement via WebSocket afin d'éviter qu'un joueur n'usurpe l'identité d'un autre dans un canal 2v2 par exemple.
- Les salles génèrent un UUID difficile à deviner via force brute (et limite d'essais).

## Stabilité "Physique" & Sécurité
- Assurez-vous que les calculs de collisions flottants ne créent pas des situations où la balle "traverse" un mur de manière intempestive côté Serveur (Continuous Collision Detection / Raycasting aux hautes vitesses plutôt qu'un position check continu).
