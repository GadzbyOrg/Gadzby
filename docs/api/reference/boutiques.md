# Boutiques

Consulter les boutiques (« boquettes »), leurs catégories et leur catalogue.

- [Lister les boutiques](#lister-les-boutiques) — `GET /shops`
- [Récupérer une boutique](#récupérer-une-boutique) — `GET /shops/{shopId}`
- [Lister les catégories d'une boutique](#lister-les-catégories-dune-boutique) — `GET /shops/{shopId}/categories`
- [Lister les produits d'une boutique](#lister-les-produits-dune-boutique) — `GET /shops/{shopId}/products`

Pour vendre, voir [Achats](./achats.md) et [Utilisateur connecté](./utilisateur-connecte.md#acheter-en-libre-service).

---

## Lister les boutiques

Renvoie les boutiques **actives**, de la plus récente à la plus ancienne.

```
GET /api/v1/shops
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
| `slug` | string | Non | — | Correspondance exacte sur le slug (identifiant utilisé dans les URL de Gadzby). |
| `limit` | integer | Non | `50` | Nombre de résultats, plafonné à 100. |
| `offset` | integer | Non | `0` | Décalage (voir [Pagination](../guides/pagination.md)). |

### Exemple

```bash
curl "https://<votre-instance>/api/v1/shops?name=cock&limit=10" \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "shops": [
    {
      "id": "1520a378-63aa-4667-86f7-d106f618ee68",
      "name": "Cocktail",
      "slug": "cocktail",
      "description": "Vente de cocktails au foy's",
      "isSelfServiceEnabled": true,
      "createdAt": "2026-04-19T07:56:30.519Z"
    }
  ],
  "limit": 10,
  "offset": 0
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `429` | `Too Many Requests` | Limite atteinte. |

---

## Récupérer une boutique

```
GET /api/v1/shops/{shopId}
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 100 / min par clé API |
| **Idempotent** | Oui (lecture) |

### Paramètres de chemin

| Paramètre | Type | Description |
|---|---|---|
| `shopId` | UUID | Identifiant de la boutique. |

### Exemple

```bash
curl https://<votre-instance>/api/v1/shops/1520a378-63aa-4667-86f7-d106f618ee68 \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "shop": {
    "id": "1520a378-63aa-4667-86f7-d106f618ee68",
    "name": "Cocktail",
    "slug": "cocktail",
    "description": "Vente de cocktails au foy's",
    "isActive": true,
    "isSelfServiceEnabled": true,
    "createdAt": "2026-04-19T07:56:30.519Z"
  }
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `404` | `Shop not found` | Boutique inexistante ou désactivée. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `429` | `Too Many Requests` | Limite atteinte. |
| `500` | `Internal Server Error` | `shopId` qui n'est pas un UUID valide (voir [Problèmes connus](../problemes-connus.md)). |

---

## Lister les catégories d'une boutique

Renvoie les catégories de produits de la boutique, triées par nom. Utilisez leur `id` pour filtrer le catalogue.

```
GET /api/v1/shops/{shopId}/categories
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 100 / min par clé API |
| **Idempotent** | Oui (lecture) |

### Paramètres de chemin

| Paramètre | Type | Description |
|---|---|---|
| `shopId` | UUID | Identifiant de la boutique. |

### Exemple

```bash
curl https://<votre-instance>/api/v1/shops/1520a378-63aa-4667-86f7-d106f618ee68/categories \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "categories": [
    {
      "id": "d9e3a4f3-14b8-4965-85aa-f5d4b071e901",
      "name": "Cocktails",
      "shopId": "1520a378-63aa-4667-86f7-d106f618ee68"
    }
  ]
}
```

Une boutique inconnue renvoie une liste vide (pas de `404`).

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `429` | `Too Many Requests` | Limite atteinte. |
| `500` | `Internal Server Error` | Identifiant qui n'est pas un UUID valide (voir [Problèmes connus](../problemes-connus.md)). |

### Objet `Categorie`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant de la catégorie. |
| `name` | string | Nom. |
| `shopId` | UUID | Boutique. |

---

## Lister les produits d'une boutique

Renvoie le catalogue **non archivé** de la boutique, dans l'ordre d'affichage de Gadzby.

```
GET /api/v1/shops/{shopId}/products
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 100 / min par clé API |
| **Idempotent** | Oui (lecture) |

### Paramètres de chemin

| Paramètre | Type | Description |
|---|---|---|
| `shopId` | UUID | Identifiant de la boutique. |

### Paramètres de requête

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `categoryId` | UUID | Non | Ne renvoyer que les produits de cette catégorie. |

### Exemple

```bash
curl "https://<votre-instance>/api/v1/shops/1520a378-63aa-4667-86f7-d106f618ee68/products?categoryId=d9e3a4f3-14b8-4965-85aa-f5d4b071e901" \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "products": [
    {
      "id": "f8452fba-a295-48b4-9119-9f6a241d3ac0",
      "shopId": "1520a378-63aa-4667-86f7-d106f618ee68",
      "name": "Cocktail Classique (25cl)",
      "description": "",
      "price": 150,
      "stock": 42,
      "unit": "unit",
      "fcv": 1,
      "displayOrder": 0,
      "allowSelfService": true,
      "categoryId": "d9e3a4f3-14b8-4965-85aa-f5d4b071e901",
      "defaultQuantity": 1,
      "activeFrom": null,
      "activeUntil": null,
      "eventId": null,
      "eventPrice": null,
      "isArchived": false,
      "category": {
        "id": "d9e3a4f3-14b8-4965-85aa-f5d4b071e901",
        "name": "Cocktails"
      }
    }
  ]
}
```

Une boutique inconnue renvoie une liste vide (pas de `404`).

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `429` | `Too Many Requests` | Limite atteinte. |
| `500` | `Internal Server Error` | Identifiant qui n'est pas un UUID valide (voir [Problèmes connus](../problemes-connus.md)). |

### Objet `Produit`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant du produit. |
| `shopId` | UUID | Boutique. |
| `name` | string | Nom. |
| `description` | string \| null | Description. |
| `price` | integer | Prix unitaire en centimes. Le prix réellement débité peut différer si le produit est lié à une manip' ouverte (voir `eventPrice`). |
| `stock` | number | Stock restant, dans l'unité `unit`. **Peut être négatif** : la vente n'est pas bloquée par le stock. |
| `unit` | string | `unit`, `liter` ou `kg`. |
| `allowSelfService` | boolean | Achetable via [`POST /me/purchases`](./utilisateur-connecte.md#acheter-en-libre-service). |
| `categoryId` | UUID | Catégorie. |
| `category` | object | `{ id, name }` de la catégorie. |
| `defaultQuantity` | integer | Quantité proposée par défaut à la caisse. |
| `activeFrom` / `activeUntil` | string (ISO 8601) \| null | Période de disponibilité affichée dans Gadzby. **Non vérifiée** à l'achat via l'API. |
| `eventId` | UUID \| null | Manip' liée. |
| `eventPrice` | integer \| null | Prix en centimes appliqué tant que la manip' liée est ouverte. |
| `isArchived` | boolean | Toujours `false` ici. |
| `fcv`, `displayOrder` | number | Champs internes de gestion de stock et d'affichage. Ne vous y fiez pas (voir [Problèmes connus](../problemes-connus.md)). |

Les **variantes** (demi, pinte…) ne sont pas renvoyées par cet endpoint (voir [Problèmes connus](../problemes-connus.md)).

---

## Objet `Boutique`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant. |
| `name` | string | Nom. |
| `slug` | string | Identifiant lisible, utilisé dans les URL de Gadzby (`/shops/<slug>`). |
| `description` | string \| null | Description. |
| `isActive` | boolean | Toujours `true` dans les réponses. Uniquement sur `GET /shops/{shopId}`. |
| `isSelfServiceEnabled` | boolean | Le libre-service est ouvert : achats possibles via [`POST /me/purchases`](./utilisateur-connecte.md#acheter-en-libre-service). |
| `createdAt` | string (ISO 8601) | Date de création. |
