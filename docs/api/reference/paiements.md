# Paiements

Transférer de l'argent entre deux utilisateurs.

- [Effectuer un virement](#effectuer-un-virement) — `POST /payments/initiate`

---

## Effectuer un virement

Débite `senderId` et crédite `receiverId` du même montant, en une opération atomique. Comme pour [les achats](./achats.md), la clé API seule suffit : réservez cet endpoint aux intégrations de confiance.

```
POST /api/v1/payments/initiate
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | 30 / min par clé API |
| **Idempotent** | Avec l'en-tête `Idempotency-Key` (recommandé), voir [Idempotence](../guides/idempotence.md) |

### Corps

| Champ | Type | Requis | Description |
|---|---|---|---|
| `senderId` | UUID | Oui | Utilisateur débité. |
| `receiverId` | UUID | Oui | Utilisateur crédité. Doit être différent de `senderId`. |
| `amountInEuros` | number | Oui | Montant **en euros**, strictement positif (`10.5` = 10,50 €). C'est le seul endpoint qui n'utilise pas les centimes. |
| `description` | string | Non | Libellé. Il est toujours préfixé : `[API - <nom de la clé>] <description>`. Par défaut : `Paiement API`. |

### Exemple

```bash
curl -X POST https://<votre-instance>/api/v1/payments/initiate \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    "receiverId": "b2c3d4e5-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
    "amountInEuros": 10.5,
    "description": "Remboursement pizza"
  }'
```

**`201 Created`**

```json
{
  "success": true,
  "message": "Payment successful"
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `400` | `Invalid JSON body` | JSON invalide. |
| `400` | `Invalid payload` | Corps non conforme, avec `details` (voir [Erreurs](../guides/erreurs.md#erreurs-de-validation)). |
| `400` | `Solde insuffisant` | Solde de `senderId` trop faible. |
| `400` | `Transfert impossible vers soi-même` | `senderId` = `receiverId`. |
| `400` | `Utilisateur introuvable` | `senderId` ou `receiverId` inconnu. |
| `400` | `Votre compte est désactivé` / `Le compte destinataire est désactivé` | Compte émetteur ou destinataire désactivé. |
| `400` | `Votre compte est supprimé` / `Le compte destinataire est supprimé` | Compte émetteur ou destinataire supprimé. |
| `400` | `Idempotency key already used for a different request` | Clé d'idempotence réutilisée avec un autre corps. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `409` | `Request already in progress` | Requête avec la même `Idempotency-Key` en cours. |
| `429` | `Too Many Requests` | Limite atteinte. |
| `500` | `Internal Server Error` | Erreur inattendue. Aucun virement n'a eu lieu. |
