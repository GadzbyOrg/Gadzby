# Fam'ss

Les Fam'ss sont des groupes d'utilisateurs avec un solde commun. Un membre peut payer un achat avec ce solde (`paymentSource: "FAMILY"` sur [`POST /shops/{shopId}/purchases`](./achats.md#créer-un-achat)).

- [Lister les Fam'ss](#lister-les-famss) — `GET /famss`
- [Lister les membres d'une Fam'ss](#lister-les-membres-dune-famss) — `GET /famss/{famsId}/members`

Le solde d'une Fam'ss n'est pas exposé par l'API.

---

## Lister les Fam'ss

```
GET /api/v1/famss
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 100 / min par clé API |
| **Idempotent** | Oui (lecture) |

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|---|---|---|---|---|
| `name` | string | Non | — | Recherche partielle, insensible à la casse, sur le nom. |
| `limit` | integer | Non | `50` | Entre 1 et 100. |
| `offset` | integer | Non | `0` | Décalage, positif ou nul (voir [Pagination](../guides/pagination.md)). |

### Exemple

```bash
curl "https://<votre-instance>/api/v1/famss?name=14&limit=10" \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "limit": 10,
  "offset": 0,
  "famss": [
    {
      "id": "90641a4a-ad78-4439-aefc-37a096ff369b",
      "name": "14"
    }
  ]
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `400` | `Invalid limit` | `limit` hors de l'intervalle 1–100 ou non entier. |
| `400` | `Invalid offset` | `offset` négatif ou non entier. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `429` | `Too Many Requests` | Limite atteinte. |

### Objet `Fams`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant. |
| `name` | string | Nom. |

---

## Lister les membres d'une Fam'ss

Renvoie tous les membres. Utile pour vérifier qu'un utilisateur peut payer avec le solde de la Fam'ss avant un achat `FAMILY`.

```
GET /api/v1/famss/{famsId}/members
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 100 / min par clé API |
| **Idempotent** | Oui (lecture) |

### Paramètres de chemin

| Paramètre | Type | Description |
|---|---|---|
| `famsId` | UUID | Identifiant de la Fam'ss. |

### Exemple

```bash
curl https://<votre-instance>/api/v1/famss/90641a4a-ad78-4439-aefc-37a096ff369b/members \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "members": [
    {
      "id": "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      "username": "jdupont",
      "nom": "Dupont",
      "prenom": "Jean",
      "bucque": "Zag",
      "promss": "ME210"
    }
  ]
}
```

Chaque membre a les champs `id`, `username`, `nom`, `prenom`, `bucque` et `promss` de l'objet [`Utilisateur`](./utilisateurs.md#objet-utilisateur).

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `400` | `Invalid famsId` | `famsId` qui n'est pas un UUID. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `404` | `Fam'ss introuvable` | Fam'ss inexistante. |
| `429` | `Too Many Requests` | Limite atteinte. |
