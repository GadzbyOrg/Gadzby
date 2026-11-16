# Utilisateur connecté

Endpoints qui agissent **au nom de l'utilisateur** connecté via [`POST /auth/login`](./authentification.md#connecter-un-utilisateur). Ils demandent la clé API **et** l'en-tête `X-User-Token`.

- [Récupérer l'utilisateur connecté](#récupérer-lutilisateur-connecté) — `GET /me`
- [Acheter en libre-service](#acheter-en-libre-service) — `POST /me/purchases`

Voir aussi le [tutoriel borne en libre-service](../guides/application-tierce.md).

---

## Récupérer l'utilisateur connecté

Renvoie le profil et le solde à jour de l'utilisateur connecté.

```
GET /api/v1/me
```

| | |
|---|---|
| **Auth** | Clé API + jeton utilisateur |
| **Limite** | 100 / min par clé API |
| **Idempotent** | Oui (lecture) |

### Exemple

```bash
curl https://<votre-instance>/api/v1/me \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "X-User-Token: $USER_TOKEN"
```

**`200 OK`**

```json
{
  "success": true,
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

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `401` | `Missing X-User-Token header` | Jeton absent. |
| `401` | `Invalid or expired user token` | Jeton expiré, falsifié ou émis pour une autre clé API. |
| `401` | `User account is disabled` | Compte désactivé ou supprimé depuis la connexion. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `404` | `User not found` | Utilisateur supprimé de la base. |
| `429` | `Too Many Requests` | Limite atteinte. |

---

## Acheter en libre-service

Débite le solde **personnel** de l'utilisateur connecté pour des produits d'une boutique. Les règles sont les mêmes que sur la page libre-service de Gadzby :

- la boutique doit être active et avoir le **libre-service activé** ;
- chaque produit doit appartenir à cette boutique et être **autorisé en libre-service** (`allowSelfService`) ;
- le solde doit couvrir le total.

Le stock est décrémenté et un événement [`shop.purchase.created`](../guides/webhooks.md) est envoyé.

```
POST /api/v1/me/purchases
```

| | |
|---|---|
| **Auth** | Clé API + jeton utilisateur |
| **Limite** | 30 / min par clé API |
| **Idempotent** | Avec l'en-tête `Idempotency-Key` (recommandé), voir [Idempotence](../guides/idempotence.md) |

### Corps

| Champ | Type | Requis | Description |
|---|---|---|---|
| `shopId` | UUID | Oui | Boutique. |
| `items` | array | Oui | Au moins un article. |
| `items[].productId` | UUID | Oui | Produit. |
| `items[].quantity` | integer | Oui | Quantité, entier strictement positif. |
| `items[].variantId` | UUID | Non | Variante du produit (ex. demi, pinte). |

Le paiement par Fam'ss n'est pas disponible sur cet endpoint.

### Exemple

```bash
curl -X POST https://<votre-instance>/api/v1/me/purchases \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "X-User-Token: $USER_TOKEN" \
  -H "Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "1520a378-63aa-4667-86f7-d106f618ee68",
    "items": [
      { "productId": "01fceb19-01fa-4776-a802-4be5ca76a4cb", "quantity": 2 }
    ]
  }'
```

**`201 Created`**

```json
{
  "success": true,
  "balance": 2126
}
```

| Champ | Type | Description |
|---|---|---|
| `balance` | integer | Nouveau solde de l'utilisateur, en centimes. |

Dans l'historique, chaque ligne a pour libellé `[API - <nom de la clé>] Achat <produit> x<quantité>`.

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `400` | `Invalid JSON body` | JSON invalide. |
| `400` | `Invalid payload` | Corps non conforme, avec `details` (voir [Erreurs](../guides/erreurs.md#erreurs-de-validation)). |
| `400` | `Certains produits ne sont pas disponibles en self-service` | Produit inexistant, d'une autre boutique ou non autorisé en libre-service. |
| `400` | `Variante invalide pour <produit>` | `variantId` qui n'appartient pas au produit. |
| `400` | `Solde insuffisant` | Solde trop faible. |
| `400` | `Idempotency key already used for a different request` | Clé d'idempotence réutilisée avec un autre corps. |
| `401` | `Missing X-User-Token header` / `Invalid or expired user token` / `User account is disabled` | Voir [Authentification](../guides/authentification.md#erreurs-dauthentification). |
| `403` | `Ce shop est fermé` | Boutique désactivée. |
| `403` | `Self-service désactivé pour ce shop` | Libre-service désactivé sur la boutique. |
| `404` | `Shop introuvable` | `shopId` inconnu. |
| `409` | `Request already in progress` | Requête avec la même `Idempotency-Key` en cours. |
| `429` | `Too Many Requests` | Limite atteinte. |
| `500` | `Internal Server Error` | Erreur inattendue. Aucun débit n'a eu lieu. |

---

## Objet `UtilisateurConnecte`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant de l'utilisateur. |
| `username` | string | Identifiant de connexion. |
| `prenom` | string | Prénom. |
| `nom` | string | Nom. |
| `bucque` | string \| null | Surnom. |
| `balance` | integer | Solde personnel, en centimes. Peut être négatif. |
