# Gadzby Developer API

L'API Gadzby permet aux applications tierces de s'intégrer au système financier et aux services liés aux utilisateurs de Gadzby.

## Sommaire
- [Génération de Clé API](#génération-de-clé-api)
- [Authentification](#authentification)
- [Rate Limiting (Limites de Requêtes)](#rate-limiting)
- [Endpoints Disponibles](#endpoints-disponibles)

---

## Génération de Clé API
Les clés API sont générées par les administrateurs Gadzby directement depuis le tableau de bord (`/admin/settings`).
Lors de la création, la clé générée (commençant par `gadzby_`) s'affichera à l'écran **une seule fois**. Vous devez la conserver en lieu sûr. Si elle est perdue, vous devrez la révoquer et en recréer une nouvelle.

---

## Authentification
L'API Gadzby utilise l'authentification par Token Bearer.

Toutes les requêtes vers l'API doivent inclure l'en-tête HTTP suivant :
```http
Authorization: Bearer gadzby_votrecletreslongue...
```

**Erreurs possibles :**
- `401 Unauthorized` : La clé API est manquante, invalide ou a été révoquée par un administrateur.

---

## Rate Limiting
Une limite de requêtes est appliquée par token API (ou par adresse IP en second recours).

| Endpoint | Limite par défaut | Période |
|----------|-------------------|---------|
| Tout Endpoint | 100 requêtes | 1 minute |
| Création Paiement | 30 requêtes | 1 minute |

**En cas de dépassement :**
L'API renverra un code HTTP `429 Too Many Requests`.

---

## Endpoints Disponibles

### 1. Vérification de contexte / Ping

Permet de vérifier que la clé API fonctionne correctement et retourne ses informations globales.

**Endpoint :** `GET /api/v1/auth/context`  

**Requête d'exemple :**
```bash
curl -X GET https://votre-domaine.com/api/v1/auth/context \
  -H "Authorization: Bearer gadzby_xxx"
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "key": {
    "id": "123e4567-e89b-12d3... ",
    "name": "Clé Test",
    "scopes": ["*"],
    "createdAt": "2026-03-29T10:00:00.000Z"
  }
}
```

---

### 2. Initier une demande de paiement

Permet de transférer un montant en euros d'un compte Gadzby vers un autre. Le solde du compte expéditeur doit être suffisant, sinon la transaction est refusée.

**Endpoint :** `POST /api/v1/payments/initiate`  

**Corps de la requête (JSON) :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `senderId` | UUID | L'identifiant (UUID) de l'utilisateur qui paye. |
| `receiverId`| UUID | L'identifiant (UUID) de l'utilisateur ou entité qui reçoit l'argent. |
| `amountInEuros`| Float | Le montant **strictement positif** en euros (ex: `15.50` pour 15,50 €). |
| `description` | String (Opt) | Un libellé qui apparaîtra dans l'historique de transaction. |

**Requête d'exemple :**
```bash
curl -X POST https://votre-domaine.com/api/v1/payments/initiate \
  -H "Authorization: Bearer gadzby_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "user1-uuid...",
    "receiverId": "user2-uuid...",
    "amountInEuros": 10.50,
    "description": "Paiement API"
  }'
```

**Réponses possibles :**

- **Succès (201 Created) :**
```json
{
  "success": true,
  "message": "Payment successful"
}
```

- **Erreur (400 Bad Request) - Solde insuffisant :**
```json
{
  "error": "Solde insuffisant"
}
```

- **Erreur de payload (400 Bad Request) :**
```json
{
  "error": "Invalid payload",
  "details": { ... détails Zod ... }
}
```

---

### 3. Recherche d'Utilisateurs

Permet de rechercher des utilisateurs Gadzby actifs selon leur bucque/nom, nums ou promss. N'expose aucune adresse email ni mot de passe. Il est obligatoire de fournir au moins un paramètre de recherche.

**Endpoint :** `GET /api/v1/users`

**Paramètres de requête (Query Params) :**
- `name` (Optionnel) : Recherche partielle dans le nom, prénom, bucque, ou nom d'utilisateur.
- `nums` (Optionnel) : Recherche exacte sur le numéro (numss).
- `promss` (Optionnel) : Recherche exacte sur la promotion (ex: 219, 218).

**Requête d'exemple :**
```bash
curl -X GET "https://votre-domaine.com/api/v1/users?name=test&promss=219" \
  -H "Authorization: Bearer gadzby_xxx"
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "users": [
    {
      "id": "123e4567-e89b-12d3...",
      "nom": "Dupont",
      "prenom": "Jean",
      "username": "jdupont",
      "bucque": "Zag",
      "nums": "100",
      "promss": "219",
      "tabagnss": "CL",
      "image": null
    }
  ]
}
```

---

### 4. Historique des Transactions par Boutique

Permet de récupérer l'historique détaillé des transactions (achats, annulations, etc.) effectuées dans une boutique spécifique.

**Endpoint :** `GET /api/v1/shops/[shopId]/transactions`

**Paramètres de requête (Query Params) :**
- `userId` (Optionnel) : UUID de l'utilisateur concerné par l'achat.
- `productId` (Optionnel) : UUID d'un produit spécifique.
- `categoryId` (Optionnel) : UUID d'une catégorie.
- `startDate` (Optionnel) : Date de début ISO 8601 (ex: `2026-03-01T00:00:00Z`).
- `endDate` (Optionnel) : Date de fin ISO 8601.
- `limit` (Optionnel) : Nombre maximum de résultats (défaut 50, max 200).
- `offset` (Optionnel) : Pour la pagination (défaut 0).

**Requête d'exemple :**
```bash
curl -X GET "https://votre-domaine.com/api/v1/shops/shop-uuid/transactions?limit=10&categoryId=category-uuid" \
  -H "Authorization: Bearer gadzby_xxx"
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "limit": 10,
  "offset": 0,
  "transactions": [
    {
      "id": "tx-1234...",
      "amount": -500,
      "type": "PURCHASE",
      "status": "COMPLETED",
      "createdAt": "2026-03-29T10:00:00.000Z",
      "targetUser": {
        "id": "...",
        "username": "jdoe",
        "nom": "Doe",
        "prenom": "John",
        "bucque": "Zag",
        "promss": "219"
      },
      "product": {
        "id": "...",
        "name": "Pinte",
        "price": 500
      }
    }
  ]
}
```

---

### 5. Liste des Boutiques (Shops)

Permet de récupérer la liste des boutiques actives sur Gadzby. Peut être utile pour déterminer le `shopId` des transactions.

**Endpoint :** `GET /api/v1/shops`

**Paramètres de requête (Query Params) :**
- `name` (Optionnel) : Recherche partielle par nom.
- `slug` (Optionnel) : Recherche exacte par slug.
- `limit` (Optionnel) : Nombre maximum de résultats (défaut 50, max 100).
- `offset` (Optionnel) : Pagination (défaut 0).

**Requête d'exemple :**
```bash
curl -X GET "https://votre-domaine.com/api/v1/shops?name=foys" \
  -H "Authorization: Bearer gadzby_xxx"
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "limit": 50,
  "offset": 0,
  "shops": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Le Foys",
      "slug": "foyss",
      "description": "Le Foyer",
      "isSelfServiceEnabled": true,
      "createdAt": "2026-03-29T08:00:00.000Z"
    }
  ]
}
```

---

### 6. Liste des Produits d'une Boutique

Permet de récupérer le catalogue complet (non-archivé) des produits proposés par une boutique spécifique.

**Endpoint :** `GET /api/v1/shops/[shopId]/products`

**Paramètres de requête (Query Params) :**
- `categoryId` (Optionnel) : UUID d'une catégorie pour filtrer les produits d'un même type.

**Requête d'exemple :**
```bash
curl -X GET "https://votre-domaine.com/api/v1/shops/shop-uuid/products?categoryId=cat-uuid" \
  -H "Authorization: Bearer gadzby_xxx"
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "products": [
    {
      "id": "prod-1234...",
      "shopId": "shop-uuid",
      "name": "Pinte de bière",
      "description": "Bière blonde",
      "price": 500,
      "stock": 20,
      "unit": "unit",
      "categoryId": "cat-uuid",
      "isArchived": false,
      "category": {
        "id": "cat-uuid",
        "name": "Boissons"
      }
    }
  ]
}
```

---

### 7. Créer une Transaction (Achat) Externe

Permet de passer une commande dans une boutique en débitant le solde de l'utilisateur concerné ou de sa Fam'ss. Cette opération metira automatiquement à jour les stocks des produits achetés et enregistrera la transaction dans l'historique financier. Le nom de la clé API ayant initié la requête apparaîtra comme référence dans l'intitulé de la transaction.

**Endpoint :** `POST /api/v1/shops/[shopId]/purchases`

**Corps de la requête (JSON Payload) :**
- `targetUserId` (Requis, UUID) : L'utilisateur effectuant l'achat.
- `items` (Requis, Liste) :
  - `productId` (Requis, UUID)
  - `quantity` (Requis, Entier positif)
  - `variantId` (Optionnel, UUID) : Si une variante (ex: Demi, Pinte) est vendue.
- `paymentSource` (Optionnel) : `"PERSONAL"` par défaut. Définir sur `"FAMILY"` pour utiliser le solde de la Fam'ss.
- `famsId` (Requis si `paymentSource` est `"FAMILY"`)
- `descriptionPrefix` (Optionnel) : Remplace le préfixe généré automatiquement `[API - NomApp] Achat`.

**Requête d'exemple :**
```bash
curl -X POST "https://votre-domaine.com/api/v1/shops/shop-uuid/purchases" \
  -H "Authorization: Bearer gadzby_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "user-uuid",
    "items": [
      { "productId": "prod-uuid", "quantity": 2 }
    ],
    "paymentSource": "PERSONAL"
  }'
```

**Réponse en cas de succès (201 Created) :**
```json
{
  "success": true,
}
```

**Réponse en cas d'échec métier ("Solde insuffisant", etc.) (400 Bad Request) :**
```json
{
  "error": "Solde insuffisant"
}
```
