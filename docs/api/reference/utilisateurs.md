# Utilisateurs

Rechercher et consulter les utilisateurs d'une instance. Ces endpoints ne renvoient jamais l'e-mail, le téléphone, le mot de passe ni le solde.

- [Rechercher des utilisateurs](#rechercher-des-utilisateurs) — `GET /users`
- [Récupérer un utilisateur](#récupérer-un-utilisateur) — `GET /users/{userId}`

---

## Rechercher des utilisateurs

Renvoie au maximum 50 utilisateurs **actifs** (ni désactivés, ni supprimés) qui correspondent à tous les filtres fournis. Sans filtre, renvoie 50 utilisateurs actifs quelconques.

```
GET /api/v1/users
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 60 / min par clé API |
| **Idempotent** | Oui (lecture) |

### Paramètres de requête

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `name` | string | Non | Recherche partielle, insensible à la casse, sur `nom`, `prenom`, `username` et `bucque`. |
| `nums` | string | Non | Correspondance exacte sur le nums (`11-96(0)`). |
| `promss` | string | Non | Correspondance exacte sur la promss (`ME210`). |

Cet endpoint n'est pas paginé (voir [Pagination](../guides/pagination.md#valeurs-par-endpoint)).

### Exemple

```bash
curl "https://<votre-instance>/api/v1/users?name=dupont&promss=ME210" \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "users": [
    {
      "id": "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      "nom": "Dupont",
      "prenom": "Jean",
      "username": "jdupont",
      "bucque": "Zag",
      "nums": "11-96(0)",
      "promss": "ME210",
      "tabagnss": "ME",
      "image": null
    }
  ]
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `429` | `Too Many Requests` | Limite atteinte. |

---

## Récupérer un utilisateur

Renvoie le profil public d'un utilisateur. Un utilisateur **désactivé** est renvoyé (avec `isAsleep: true`), un utilisateur **supprimé** renvoie `404`.

```
GET /api/v1/users/{userId}
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 100 / min par clé API |
| **Idempotent** | Oui (lecture) |

### Paramètres de chemin

| Paramètre | Type | Description |
|---|---|---|
| `userId` | UUID | Identifiant de l'utilisateur. |

### Exemple

```bash
curl https://<votre-instance>/api/v1/users/a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "user": {
    "id": "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    "nom": "Dupont",
    "prenom": "Jean",
    "username": "jdupont",
    "bucque": "Zag",
    "nums": "11-96(0)",
    "promss": "ME210",
    "tabagnss": "ME",
    "image": null,
    "isAsleep": false,
    "isDeleted": false
  }
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `404` | `User not found` | Utilisateur inexistant ou supprimé. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `429` | `Too Many Requests` | Limite atteinte. |
| `500` | `Internal Server Error` | `userId` qui n'est pas un UUID valide (voir [Problèmes connus](../problemes-connus.md)). |

---

## Objet `Utilisateur`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant. |
| `nom` | string | Nom. |
| `prenom` | string | Prénom. |
| `username` | string | Identifiant de connexion. |
| `bucque` | string \| null | Surnom. |
| `nums` | string \| null | Numéro de l'élève. |
| `promss` | string | Promotion (ex. `ME210`). |
| `tabagnss` | string | Campus d'origine : `ME`, `CL`, `CH`, `KA`, `PA`, `BO`, `LI`, `AN` ou `AI`. |
| `image` | string \| null | Avatar : nom de fichier, servi par `GET /api/avatars/{image}` (hors `/v1`, sans authentification), ou `null`. Certains comptes anciens contiennent un chemin relatif. |
| `isAsleep` | boolean | Compte désactivé. Uniquement sur `GET /users/{userId}`. |
| `isDeleted` | boolean | Toujours `false` dans une réponse `200`. Uniquement sur `GET /users/{userId}`. |
