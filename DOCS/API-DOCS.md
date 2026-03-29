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
