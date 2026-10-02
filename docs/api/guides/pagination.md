# Pagination

Les endpoints qui renvoient des listes utilisent une pagination par **décalage** (`limit` / `offset`).

| Paramètre | Description |
|---|---|
| `limit` | Nombre maximum d'éléments à renvoyer. |
| `offset` | Nombre d'éléments à sauter depuis le début de la liste. |

La réponse rappelle les valeurs appliquées :

```json
{
  "success": true,
  "shops": [ … ],
  "limit": 50,
  "offset": 0
}
```

Il n'y a pas de champ `total`. Pour parcourir toute la liste, augmentez `offset` de `limit` jusqu'à recevoir moins de `limit` éléments.

```js
async function fetchAll(path, key) {
  const limit = 100; // maximum de GET /shops
  const all = [];
  for (let offset = 0; ; offset += limit) {
    const res = await fetch(`${BASE_URL}${path}?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const page = await res.json();
    all.push(...page.shops);
    if (page.shops.length < limit) return all;
  }
}
```

## Valeurs par endpoint

| Endpoint | `limit` par défaut | `limit` max | Tri |
|---|---|---|---|
| `GET /shops` | 50 | 100 | Création, plus récente d'abord |
| `GET /shops/{shopId}/transactions` | 50 | 200 | Date, plus récente d'abord |
| `GET /famss` | 50 | 100 | Nom, alphabétique |
| `GET /users` | 50 | 100 | Nom puis prénom, alphabétique |

Le tri est stable : deux appels identiques renvoient les éléments dans le même ordre.

Les autres listes (`/shops/{shopId}/products`, `/shops/{shopId}/categories`, `/famss/{famsId}/members`, `/webhooks`) renvoient tous les éléments en une fois.

## Validation

Sur tous les endpoints paginés :
- `limit` doit être un entier entre 1 et le maximum de l'endpoint, sinon `400 Invalid limit` ;
- `offset` doit être un entier positif ou nul, sinon `400 Invalid offset`.

Les listes peuvent bouger entre deux pages si des éléments sont créés entre-temps. Pour les transactions, utilisez un filtre `endDate` fixe pendant le parcours.
