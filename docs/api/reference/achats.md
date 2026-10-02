# Achats

Enregistrer un achat en boutique pour le compte d'un utilisateur, **sans son mot de passe**. Réservé aux intégrations de confiance (caisse, automate) : la clé API seule suffit pour débiter n'importe quel utilisateur.

Si c'est l'utilisateur lui-même qui achète depuis votre application, utilisez plutôt [`POST /me/purchases`](./utilisateur-connecte.md#acheter-en-libre-service), qui exige sa connexion.

- [Créer un achat](#créer-un-achat) — `POST /shops/{shopId}/purchases`

---

## Créer un achat

Débite le solde personnel de l'utilisateur, ou celui de sa Fam'ss, pour une liste de produits de la boutique. En une seule opération atomique :
- le prix est calculé côté Gadzby (prix de manip' ou de variante inclus) ;
- le stock est décrémenté ;
- une transaction est créée par article ;
- un événement [`shop.purchase.created`](../guides/webhooks.md) est envoyé.

La boutique doit exister et être active. Contrairement à `/me/purchases`, cet endpoint **ne vérifie pas** le libre-service de la boutique ni l'option `allowSelfService` des produits.

```
POST /api/v1/shops/{shopId}/purchases
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 30 / min par clé API |
| **Idempotent** | Avec l'en-tête `Idempotency-Key` (recommandé), voir [Idempotence](../guides/idempotence.md) |

### Paramètres de chemin

| Paramètre | Type | Description |
|---|---|---|
| `shopId` | UUID | Boutique. |

### Corps

| Champ | Type | Requis | Défaut | Description |
|---|---|---|---|---|
| `targetUserId` | UUID | Oui | — | Utilisateur débité. |
| `items` | array | Oui | — | Au moins un article. |
| `items[].productId` | UUID | Oui | — | Produit de la boutique. |
| `items[].quantity` | integer | Oui | — | Quantité, entier strictement positif. |
| `items[].variantId` | UUID | Non | — | Variante du produit. |
| `paymentSource` | `"PERSONAL"` \| `"FAMILY"` | Non | `"PERSONAL"` | Solde à débiter. |
| `famsId` | UUID | Si `FAMILY` | — | Fam'ss à débiter. L'utilisateur doit en être membre (voir [membres d'une Fam'ss](./famss.md#lister-les-membres-dune-famss)). |
| `descriptionPrefix` | string | Non | `[API - <nom de la clé>] Achat` | Début du libellé de chaque transaction, suivi de `<produit> x<quantité>`. |

### Exemple

```bash
curl -X POST https://<votre-instance>/api/v1/shops/1520a378-63aa-4667-86f7-d106f618ee68/purchases \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "Idempotency-Key: 3f2b1c4e-8d7a-4b6f-9e0d-1a2b3c4d5e6f" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    "items": [
      { "productId": "01fceb19-01fa-4776-a802-4be5ca76a4cb", "quantity": 2 }
    ],
    "paymentSource": "PERSONAL"
  }'
```

**`201 Created`**

```json
{
  "success": true
}
```

La réponse ne contient ni les transactions ni le nouveau solde. Récupérez-les via [`GET /shops/{shopId}/transactions`](./transactions.md#lister-les-transactions-dune-boutique) ou le webhook `shop.purchase.created`.

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `400` | `Invalid JSON body` | JSON invalide. |
| `400` | `Invalid payload` | Corps non conforme, avec `details` (voir [Erreurs](../guides/erreurs.md#erreurs-de-validation)). |
| `400` | `famsId is required when paymentSource is FAMILY` | `famsId` manquant. |
| `400` | `Invalid shopId` | `shopId` qui n'est pas un UUID. |
| `400` | `Certains produits sont invalides ou introuvables` | Produit inexistant ou d'une autre boutique. |
| `400` | `Variante invalide pour <produit>` | Variante qui n'appartient pas au produit. |
| `400` | `Solde insuffisant` | Solde personnel trop faible. |
| `400` | `Solde insuffisant (Fam'ss)` | Solde de la Fam'ss trop faible. |
| `400` | `L'utilisateur n'est pas membre de cette famille` | `targetUserId` hors de la Fam'ss. |
| `400` | `Compte désactivé` | Utilisateur désactivé. |
| `400` | `Idempotency key already used for a different request` | Clé d'idempotence réutilisée avec un autre corps. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `403` | `Shop inactive` | Boutique désactivée. |
| `404` | `Shop not found` | `shopId` inconnu. |
| `409` | `Request already in progress` | Requête avec la même `Idempotency-Key` en cours. |
| `429` | `Too Many Requests` | Limite atteinte. |
| `500` | `Internal Server Error` | Erreur inattendue. Aucun débit n'a eu lieu. |
