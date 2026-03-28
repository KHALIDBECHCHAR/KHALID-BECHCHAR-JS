# Mur de Post-it 2.0

**Auteur : Khalid BECHCHAR**

---

## Présentation

Mur de Post-it 2.0 est une application de type "mur collaboratif" permettant de créer, modifier, supprimer et organiser des post-its (posts). Cette version ajoute des tags/catégories, la possibilité d'épingler des posts et un système de réactions emoji en temps réel.

---

## Instructions d'installation et de lancement

1. Ouvrir un terminal à la racine du projet.

2. Installer les dépendances :
```bash
npm install
```

3. Lancer l'application :
```bash
npm start
```

4. Ouvrir dans le navigateur : **http://localhost:3000**

5. Réinitialiser la base de données avec des données de test :
```bash
npm run init-db
```

---

## Remarques importantes

- Ne pas inclure le dossier `node_modules` dans l'archive ou le dépôt partagé. Le fichier `package.json` suffit pour réinstaller les dépendances.
- Le projet utilise SQLite — aucune configuration de base de données externe n'est nécessaire, le fichier `data.db` est créé automatiquement au premier lancement.

---

## Fonctionnalités ajoutées (nouvelles)

### 1. Tags / Catégories
- Chaque post peut être associé à une catégorie : Général, Idée, Question, Urgent, Fun, Annonce.
- Un sélecteur de tag est disponible dans le formulaire de création/édition.
- Un filtre par catégorie est disponible dans la barre latérale pour afficher uniquement les posts d'une catégorie.
- Route back-end : `GET /api/posts?tag=idée`

### 2. Épingler un post (Pin)
- N'importe quel post peut être épinglé pour apparaître en tête du mur.
- Les posts épinglés sont mis en évidence avec un badge et une bordure rouge.
- Le tri respecte toujours les posts épinglés en premier.
- Route back-end : `PATCH /api/posts/:id/pin` (toggle)

### 3. Réactions Emoji
- 6 réactions disponibles sur chaque post : ❤️ 😂 🔥 👏 😮 😢
- Les compteurs se mettent à jour en temps réel sans recharger la page.
- Animation "pop" au clic pour un retour visuel immédiat.
- Routes back-end : `GET /api/posts/:id/reactions` et `POST /api/posts/:id/reactions`

---

## Fonctionnalités existantes (rappel)

- Créer, modifier, supprimer des posts
- Votes 👍 / 👎
- Commentaires par post
- Choix de couleur du post-it
- Recherche en temps réel
- Tri par date ou popularité
- Statistiques en header (posts, votes, commentaires)

---

## API — Liste des routes

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/posts` | Récupérer tous les posts (filtres: `?search=`, `?sort=`, `?tag=`) |
| GET | `/api/posts/:id` | Récupérer un post par ID |
| POST | `/api/posts` | Créer un nouveau post |
| PUT | `/api/posts/:id` | Modifier un post |
| DELETE | `/api/posts/:id` | Supprimer un post |
| PATCH | `/api/posts/:id/pin` | Épingler / désépingler un post |
| POST | `/api/posts/:id/vote` | Voter pour un post (`up` ou `down`) |
| GET | `/api/posts/:id/reactions` | Récupérer les réactions d'un post |
| POST | `/api/posts/:id/reactions` | Ajouter une réaction à un post |
| GET | `/api/posts/:id/comments` | Récupérer les commentaires d'un post |
| POST | `/api/posts/:id/comments` | Ajouter un commentaire à un post |

---

## Scripts utiles (package.json)

| Commande | Description |
|----------|-------------|
| `npm start` | Démarre le serveur sur http://localhost:3000 |
| `npm run dev` | Démarre avec nodemon (rechargement automatique) |
| `npm run init-db` | Réinitialise la base de données avec des données de test |

---

## Structure du projet

```
mur-postit-2.0/
├── index.js          # Serveur Express + routes API
├── package.json
├── data.db           # Base de données SQLite (auto-générée)
├── db/
│   └── init.js       # Script d'initialisation de la BD
├── public/
│   ├── index.html    # Interface utilisateur
│   ├── app.js        # JavaScript front-end
│   └── styles.css    # Styles CSS
└── README.md
```

---

## Contact

**Auteur : Khalid BECHCHAR**
