# Authentification

L'API utilise deux niveaux d'identification :

| Identifiant | Identifie | En-tête | Obligatoire sur |
|---|---|---|---|
| **Clé API** | Votre application | `Authorization: Bearer gadzby_…` | Tous les endpoints |
| **Jeton utilisateur** | Un utilisateur Gadzby connecté via votre application | `X-User-Token: eyJ…` | `/me` et `/me/*` |

Avec la clé API seule, votre application agit en tant que **service de confiance** : elle peut lire les données et débiter n'importe quel utilisateur. Le jeton utilisateur limite l'action à **un** utilisateur qui a saisi son mot de passe. Préférez les endpoints `/me` dès que c'est l'utilisateur lui-même qui agit.

## Clés API

### Obtenir une clé API

Seul un administrateur Gadzby (permission `ADMIN_ACCESS`) peut créer une clé, depuis **Administration → Paramètres** (`/admin/settings`).

- La clé commence par `gadzby_` suivi de 64 caractères hexadécimaux.
- Elle est affichée **une seule fois** à la création. Gadzby n'en conserve qu'une empreinte SHA-256 et ne peut pas la réafficher.
- Nommez-la d'après l'application qui l'utilise (`Borne Foy's`, `Bot Discord`…). Ce nom apparaît dans le libellé des transactions créées avec la clé (`[API - Borne Foy's] Achat …`).

### Utiliser la clé

Envoyez la clé dans l'en-tête `Authorization` de **chaque** requête :

```http
GET /api/v1/auth/context HTTP/1.1
Host: <votre-instance>
Authorization: Bearer gadzby_3f9a…
```

Utilisez [`GET /auth/context`](../reference/authentification.md#vérifier-une-clé-api) pour vérifier qu'une clé est valide.

### Révoquer une clé

Un administrateur peut révoquer une clé depuis la même page. La révocation est immédiate :
- toutes les requêtes avec cette clé renvoient `401` ;
- tous les jetons utilisateur émis pour cette clé deviennent inutilisables ;
- les webhooks rattachés à la clé sont désactivés et ne reçoivent plus d'événements.

En cas de fuite, révoquez la clé puis créez-en une nouvelle.

### Bonnes pratiques

- La clé donne accès aux soldes de tous les utilisateurs : **ne l'embarquez jamais** dans une application mobile, une page web ou un dépôt Git. Gardez-la sur un serveur, dans une variable d'environnement ou un gestionnaire de secrets.
- Utilisez une clé par application pour pouvoir en révoquer une sans couper les autres.

## Jetons utilisateur

Un jeton utilisateur prouve qu'un utilisateur s'est connecté **via votre application**. Il sert aux applications où l'utilisateur agit pour lui-même (borne, application personnelle…).

### Obtenir un jeton

Appelez [`POST /auth/login`](../reference/authentification.md#connecter-un-utilisateur) avec l'identifiant et le mot de passe Gadzby de l'utilisateur :

```bash
curl -X POST https://<votre-instance>/api/v1/auth/login \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "jdupont", "password": "••••••••"}'
```

La réponse contient `token`, sa date d'expiration `expiresAt` et le profil de l'utilisateur.

### Utiliser le jeton

Envoyez **les deux** en-têtes :

```http
GET /api/v1/me HTTP/1.1
Authorization: Bearer gadzby_3f9a…
X-User-Token: eyJhbGciOiJIUzI1NiJ9…
```

### Propriétés du jeton

| Propriété | Valeur |
|---|---|
| Durée de vie | **2 heures**, sans renouvellement. Une fois le jeton expiré, l'utilisateur doit se reconnecter. |
| Liaison | Valable **uniquement avec la clé API qui l'a émis**. Un jeton émis pour l'application A est refusé avec la clé de l'application B. |
| Révocation | Le jeton est refusé dès que le compte est désactivé ou supprimé, ou que la clé API est révoquée. Il n'existe pas d'endpoint de déconnexion : pour déconnecter l'utilisateur, supprimez le jeton côté client. |
| Format | JWT opaque. Ne vous fiez pas à son contenu, utilisez `expiresAt` et `GET /me`. |

### Bonnes pratiques

- Ne stockez **jamais** le mot de passe de l'utilisateur. Envoyez-le à `/auth/login` puis oubliez-le.
- Gardez le jeton en mémoire le temps de la session. Sur une borne partagée, effacez-le dès que l'utilisateur a terminé.
- La connexion est limitée à 5 tentatives par minute et par identifiant (voir [Limites de requêtes](./limites-de-requetes.md)). Affichez un message clair plutôt que de réessayer en boucle.

## Erreurs d'authentification

| Statut | `error` | Cause |
|---|---|---|
| `401` | `Missing or invalid Authorization header` | En-tête `Authorization` absent ou sans le préfixe `Bearer `. |
| `401` | `Invalid API Key` | Clé inconnue. |
| `401` | `API Key revoked` | Clé révoquée par un administrateur. |
| `401` | `Missing X-User-Token header` | Endpoint `/me` appelé sans jeton utilisateur. |
| `401` | `Invalid or expired user token` | Jeton expiré, falsifié ou émis pour une autre clé API. |
| `401` | `User account is disabled` | Le compte a été désactivé ou supprimé depuis la connexion. |
