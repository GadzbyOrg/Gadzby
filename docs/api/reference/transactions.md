# Transactions

Consulter l'historique financier d'une boutique.

- [Lister les transactions d'une boutique](#lister-les-transactions-dune-boutique) — `GET /shops/{shopId}/transactions`

---

## Lister les transactions d'une boutique

Renvoie les transactions liées à la boutique (achats, annulations…), de la plus récente à la plus ancienne. Tous les filtres fournis se cumulent.

```
GET /api/v1/shops/{shopId}/transactions
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 100 / min par clé API |
| **Idempotent** | Oui (lecture) |

### Paramètres de chemin

| Paramètre | Type | Description |
|---|---|---|
| `shopId` | UUID | Boutique. |

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|---|---|---|---|---|
| `userId` | UUID | Non | — | Utilisateur débité (`targetUserId`). |
| `productId` | UUID | Non | — | Produit vendu. |
| `categoryId` | UUID | Non | — | Catégorie des produits vendus. |
| `startDate` | string (ISO 8601) | Non | — | Transactions créées **à partir de** cette date (incluse). |
| `endDate` | string (ISO 8601) | Non | — | Transactions créées **jusqu'à** cette date (incluse). |
| `limit` | integer | Non | `50` | Nombre de résultats, entre 1 et 200. |
| `offset` | integer | Non | `0` | Décalage, positif ou nul (voir [Pagination](../guides/pagination.md)). |

### Exemple

```bash
curl "https://<votre-instance>/api/v1/shops/1520a378-63aa-4667-86f7-d106f618ee68/transactions?startDate=2026-09-01T00:00:00Z&limit=1" \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "transactions": [
    {
      "id": "3322191b-4386-4dc3-ba08-2bfa8291b8c4",
      "amount": -35,
      "type": "PURCHASE",
      "status": "COMPLETED",
      "walletSource": "PERSONAL",
      "targetUserId": "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      "famsId": null,
      "productId": "01fceb19-01fa-4776-a802-4be5ca76a4cb",
      "productVariantId": null,
      "quantity": 1,
      "eventId": null,
      "description": "[API - Borne Foy's] Achat Granité coca cola (25cl) x1",
      "groupId": null,
      "createdAt": "2026-09-29T07:32:54.661Z",
      "targetUser": {
        "id": "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
        "username": "jdupont",
        "nom": "Dupont",
        "prenom": "Jean",
        "bucque": "Zag",
        "promss": "ME210"
      },
      "product": {
        "id": "01fceb19-01fa-4776-a802-4be5ca76a4cb",
        "name": "Granité coca cola (25cl)"
      },
      "productVariant": null
    }
  ],
  "limit": 1,
  "offset": 0
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `400` | `Invalid shopId` / `Invalid userId` / `Invalid productId` / `Invalid categoryId` | Identifiant qui n'est pas un UUID. |
| `400` | `Invalid startDate` / `Invalid endDate` | Date illisible. |
| `400` | `Invalid limit` / `Invalid offset` | Pagination non entière ou hors limites. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `429` | `Too Many Requests` | Limite atteinte. |

---

## Objet `Transaction`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant. |
| `amount` | integer | Montant en centimes. **Négatif** = débit du compte, **positif** = crédit (remboursement…). |
| `type` | string | `PURCHASE`, `TOPUP`, `TRANSFER`, `REFUND`, `DEPOSIT` ou `ADJUSTMENT`. |
| `status` | string | `PENDING`, `COMPLETED`, `FAILED` ou `CANCELLED`. Quand une vente est annulée, la transaction d'origine passe en `CANCELLED` et une transaction `REFUND` de montant opposé est ajoutée. Pour un chiffre d'affaires, ne comptez que les `PURCHASE` au statut `COMPLETED`. |
| `walletSource` | string | `PERSONAL` ou `FAMILY` : solde débité. |
| `targetUserId` | UUID | Utilisateur dont le compte est impacté. |
| `targetUser` | object | Profil résumé de `targetUserId` : `id`, `username`, `nom`, `prenom`, `bucque`, `promss`. |
| `famsId` | UUID \| null | Fam'ss débitée si `walletSource` vaut `FAMILY`. |
| `productId` | UUID \| null | Produit vendu. |
| `product` | object \| null | `{ id, name }` du produit vendu. |
| `productVariantId` | UUID \| null | Variante vendue. |
| `productVariant` | object \| null | `{ id, name }` de la variante vendue. |
| `quantity` | number \| null | Quantité vendue, **dans l'unité de base du produit**. Pour une variante, c'est le nombre d'articles × la `quantity` de la variante (2 demis de 0,5 → `1`). |
| `eventId` | UUID \| null | Manip' à laquelle la vente est rattachée. |
| `description` | string | Libellé affiché dans l'historique. |
| `groupId` | UUID \| null | Regroupe les transactions d'une même opération groupée. |
| `createdAt` | string (ISO 8601) | Date. |
