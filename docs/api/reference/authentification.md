# Authentification

Endpoints pour vérifier une clé API et connecter un utilisateur. Les concepts sont expliqués dans le [guide Authentification](../guides/authentification.md).

- [Vérifier une clé API](#vérifier-une-clé-api) — `GET /auth/context`
- [Connecter un utilisateur](#connecter-un-utilisateur) — `POST /auth/login`

---

## Vérifier une clé API

Renvoie les informations de la clé API utilisée. Pratique pour tester une configuration ou un bilan de santé.

```
GET /api/v1/auth/context
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 100 / min par adresse IP |
| **Idempotent** | Oui (lecture) |

### Exemple

```bash
curl https://<votre-instance>/api/v1/auth/context \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "key": {
    "id": "64432848-ae79-497f-8636-65477dbacb8d",
    "name": "Borne Foy's",
    "scopes": ["*"],
    "createdAt": "2026-09-29T07:39:26.281Z"
  }
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `401` | `Missing or invalid Authorization header` / `Invalid API Key` / `API Key revoked` | Voir [Authentification](../guides/authentification.md#erreurs-dauthentification). |
| `429` | `Too Many Requests` | Plus de 100 requêtes par minute depuis cette IP. |

### Objet `ApiKey`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant de la clé. |
| `name` | string | Nom donné par l'administrateur. |
| `scopes` | string[] | Toujours `["*"]` pour l'instant : une clé a accès à tous les endpoints. |
| `createdAt` | string (ISO 8601) | Date de création. |

---

## Connecter un utilisateur

Vérifie l'identifiant et le mot de passe Gadzby d'un utilisateur et renvoie un **jeton utilisateur** valable 2 heures, à utiliser sur les endpoints [`/me`](./utilisateur-connecte.md).

```
POST /api/v1/auth/login
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 10 / min par adresse IP **et** 5 / min par identifiant |
| **Idempotent** | Non (chaque appel émet un nouveau jeton) |

### Corps

| Champ | Type | Requis | Description |
|---|---|---|---|
| `username` | string | Oui | Identifiant Gadzby. Insensible à la casse. |
| `password` | string | Oui | Mot de passe Gadzby. |

### Exemple

```bash
curl -X POST https://<votre-instance>/api/v1/auth/login \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "jdupont", "password": "••••••••"}'
```

**`201 Created`**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOi…",
  "expiresAt": "2026-09-29T15:31:47.012Z",
  "user": {
    "id": "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    "username": "jdupont",
    "prenom": "Jean",
    "nom": "Dupont",
    "bucque": "Zag",
    "balance": 2196
  }
}
```

| Champ | Type | Description |
|---|---|---|
| `token` | string | Jeton utilisateur, à envoyer dans l'en-tête `X-User-Token`. |
| `expiresAt` | string (ISO 8601) | Expiration du jeton (2 h après l'émission). |
| `user` | [`UtilisateurConnecte`](./utilisateur-connecte.md#objet-utilisateurconnecte) | Profil et solde. |

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `400` | `Invalid JSON body` | Corps absent ou JSON invalide. |
| `400` | `Invalid payload` | `username` ou `password` manquant. |
| `401` | `Invalid credentials` | Identifiant inconnu ou mot de passe incorrect. Les deux cas renvoient volontairement le même message. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `403` | `Account disabled` | Mot de passe correct, mais compte désactivé. |
| `429` | `Too Many Requests` | Trop de tentatives pour cette IP ou cet identifiant. |
