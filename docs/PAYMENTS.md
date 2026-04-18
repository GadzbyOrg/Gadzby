# Système de paiement

Ce document décrit l'architecture du système de rechargement par un service tiers, le cycle de vie d'une transaction, et la procédure pour intégrer un nouveau prestataire de paiement.

---

## Architecture

```
src/lib/payments/
├── types.ts          # Interfaces PaymentProvider, PaymentResult, WebhookResult
├── factory.ts        # Sélectionne l'adaptateur selon le slug en BDD
└── adapters/
    ├── helloasso.ts
    ├── lydia.ts
    └── sumup.ts
```

Le **factory** (`factory.ts`) lit la table `payment_methods` pour trouver le prestataire actif correspondant au slug demandé, puis instancie l'adaptateur avec la config et les frais stockés en BDD.

La **route webhook** (`src/app/api/webhooks/payment/route.ts`) reçoit les notifications entrantes de tous les prestataires via `POST /api/webhooks/payment?provider=<slug>`.

L'**action de rechargement** (`src/features/payments/actions.ts`) orchestre la création de la transaction et l'appel au prestataire.

---

## Cycle de vie d'un rechargement

```
Utilisateur              Gadzby                    Prestataire
    |                      |                            |
    |-- initiateTopUp() -->|                            |
    |                      |-- INSERT transaction ----->|
    |                      |   status: PENDING          |
    |                      |-- createPayment() -------->|
    |<-- redirectUrl -------|<-- { id, redirectUrl } ---|
    |                      |                            |
    |-- (paiement sur le site du prestataire) --------->|
    |                      |                            |
    |<-- backUrl/errorUrl --|<-- webhook POST -----------|
    |   (/topup/fail)       |   verifyWebhook()         |
    |                  si PENDING:                      |
    |              UPDATE CANCELLED                     |
    |                      |                            |
    |             ou si Authorized:                     |
    |              UPDATE COMPLETED                     |
    |              UPDATE balance += amount             |
```

### États d'une transaction TOPUP

| Statut | Déclencheur |
|--------|-------------|
| `PENDING` | Créée au moment de l'appel à `initiateTopUp` |
| `COMPLETED` | Webhook valide reçu (paiement confirmé par le prestataire) |
| `FAILED` | Erreur lors de la création du paiement côté prestataire |
| `CANCELLED` | Utilisateur redirigé vers `/topup/fail?txId=<id>` (abandon ou refus) |

> Le solde de l'utilisateur n'est crédité qu'au passage à `COMPLETED`, dans la même transaction DB que la mise à jour du statut (verrou de ligne `FOR UPDATE` pour éviter le double crédit).

---

## Calcul des frais

Les frais sont configurés par prestataire dans la colonne `fees` de `payment_methods` :

```json
{ "fixed": 10, "percentage": 1.2 }
```

- `fixed` : frais fixe en **centimes**
- `percentage` : frais variable en **pourcentage**

Le montant facturé à l'utilisateur est calculé de façon à ce que l'association reçoive exactement le montant demandé (net) :

```
Montant facturé = (Montant net + Frais fixes) / (1 - Pourcentage / 100)
```

Exemple : pour recevoir 10 €, avec 10 cts de frais fixes et 1,2 % :
```
(1000 + 10) / (1 - 0.012) = 1023 centimes → facturé 10,23 €
```

---

## Gestion des webhooks

Tous les prestataires envoient leurs notifications à :
```
POST /api/webhooks/payment?provider=<slug>
```

La route appelle `verifyWebhook(request)` sur l'adaptateur. Deux cas :

| Résultat de `verifyWebhook` | Réponse HTTP | Action |
|-----------------------------|-------------|--------|
| `{ isValid: true, transactionId }` | `200 { success: true }` | Transaction → `COMPLETED`, solde crédité |
| `{ isValid: false }` | `200 { received: true }` | Aucune action |

> **Important :** retourner `200` pour les webhooks non actionnables (événement ignoré, paiement refusé, etc.) est intentionnel. Un `4xx` provoque des relances infinies de la part du prestataire et flood les logs.

---

## Prestataires existants

### HelloAsso

| Clé config BDD | Description |
|----------------|-------------|
| `clientId` | Client ID OAuth2 HelloAsso |
| `clientSecret` | Client Secret OAuth2 HelloAsso |
| `organizationSlug` | Slug de l'organisation sur HelloAsso |

- Authentification par token OAuth2 (rafraîchi automatiquement avec buffer de 60 s).
- En développement (`NODE_ENV !== "production"`) le sandbox est utilisé automatiquement.
- Événements webhook traités : `Payment` avec state `Authorized` uniquement.

### Lydia

| Clé config BDD | Description |
|----------------|-------------|
| `vendorToken` | Token vendeur Lydia |
| `privateToken` | Token privé pour la vérification de signature |

- Nécessite le numéro de téléphone de l'utilisateur (stocké sur son profil).
- La signature des webhooks est vérifiée par hash MD5 des champs de la notification.

### SumUp

| Clé config BDD | Description |
|----------------|-------------|
| `sumup_api_key` | Clé API SumUp |
| `merchantCode` | Code marchand SumUp |

- Utilise le Hosted Checkout (redirection vers une page de paiement SumUp).
- La vérification du webhook se fait en récupérant le statut du checkout directement via l'API SumUp (pas de vérification de signature).

---

## Ajouter un nouveau prestataire

### 1. Créer l'adaptateur

Créer `src/lib/payments/adapters/<slug>.ts` en implémentant l'interface `PaymentProvider` :

```typescript
import { PaymentProvider, PaymentResult, WebhookResult } from "../types";

interface MonPrestaireConfig {
    apiKey: string;
    // ...
}

export class MonPrestaireAdapter implements PaymentProvider {
    constructor(
        private config: MonPrestaireConfig,
        private fees: { fixed: number; percentage: number }
    ) {}

    async createPayment(
        amountCents: number,
        description: string,
        internalTransactionId: string,
        _providerOptions?: Record<string, string>
    ): Promise<PaymentResult> {
        const total = this.calculateTotalCharge(amountCents);

        // Appel à l'API du prestataire...
        // Les URLs de retour doivent inclure txId pour l'abandon :
        const failUrl = `${appUrl}/topup/fail?txId=${internalTransactionId}`;

        return {
            paymentId: "...",       // ID côté prestataire
            redirectUrl: "...",     // URL vers laquelle rediriger l'utilisateur
            totalAmountCents: total,
        };
    }

    async verifyWebhook(request: Request): Promise<WebhookResult> {
        // Valider la signature et extraire les données...

        // Retourner isValid: false pour tout événement non actionnable
        // (la route répondra 200 automatiquement, sans action)
        return { isValid: false };

        // Pour un paiement confirmé :
        return {
            isValid: true,
            transactionId: "...",           // ID interne (notre UUID)
            amount: amountCents,            // Montant en centimes
            providerTransactionId: "...",   // ID côté prestataire
        };
    }

    private calculateTotalCharge(desiredAmountCents: number): number {
        const p = this.fees.percentage / 100;
        return Math.ceil((desiredAmountCents + this.fees.fixed) / (1 - p));
    }
}
```

### 2. Enregistrer dans le factory

Dans `src/lib/payments/factory.ts`, ajouter un `case` dans le switch :

```typescript
import { MonPrestaireAdapter } from "./adapters/mon-prestaire";

// Dans getPaymentProvider() :
case "mon-prestaire":
    return new MonPrestaireAdapter(
        {
            apiKey: config.apiKey,
            // ...
        },
        fees
    );
```

### 3. Créer la ligne en base de données

```sql
INSERT INTO payment_methods (slug, name, description, is_enabled, fees, config)
VALUES (
    'mon-prestaire',
    'Mon Prestataire',
    'Paiement via Mon Prestataire',
    true,
    '{"fixed": 0, "percentage": 1.5}',
    '{"apiKey": "votre-clé-api"}'
);
```

Ou via l'interface d'administration si elle expose la gestion des moyens de paiement.

### 4. Configurer l'URL du webhook chez le prestataire

L'URL à déclarer dans le tableau de bord du prestataire :

```
https://<votre-domaine>/api/webhooks/payment?provider=mon-prestaire
```

### 5. Écrire les tests

Créer `src/lib/payments/adapters/__tests__/mon-prestaire.test.ts`. Couvrir a minima :

- `verifyWebhook` : événement confirmé → `isValid: true` avec les bons champs
- `verifyWebhook` : événement refusé/ignoré → `isValid: false`
- `createPayment` : l'URL d'échec contient `txId=<internalTransactionId>`

Voir les tests existants dans `src/lib/payments/adapters/__tests__/` pour des exemples.
