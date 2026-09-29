# API Gadzby — v1

L'API Gadzby permet à une application tierce (app, borne, script, tableau de bord…) de lire les données d'une instance Gadzby et d'y enregistrer des achats ou des paiements.

C'est une API REST : les requêtes et les réponses sont en JSON, l'authentification se fait par clé API, et chaque ressource a une URL stable sous `/api/v1`.

## Sommaire

**Guides**

- [Authentification](./guides/authentification.md) : clés API et jetons utilisateur
- [Erreurs](./guides/erreurs.md) : format des erreurs et codes HTTP
- [Limites de requêtes](./guides/limites-de-requetes.md)
- [Pagination](./guides/pagination.md)
- [Idempotence](./guides/idempotence.md) : rejouer une requête sans double débit
- [Webhooks](./guides/webhooks.md) : recevoir les événements en temps réel
- [Tutoriel : borne en libre-service](./guides/application-tierce.md)

**Référence**

- [Authentification](./reference/authentification.md)
- [Utilisateur connecté](./reference/utilisateur-connecte.md)
- [Utilisateurs](./reference/utilisateurs.md)
- [Boutiques](./reference/boutiques.md)
- [Achats](./reference/achats.md)
- [Transactions](./reference/transactions.md)
- [Paiements](./reference/paiements.md)
- [Fam'ss](./reference/famss.md)
- [Webhooks](./reference/webhooks.md)

**[Problèmes connus](./problemes-connus.md)** : écarts actuels entre le comportement attendu et le comportement réel.

---

## URL de base

Chaque tbk héberge sa propre instance. Toutes les URL de cette documentation sont relatives à :

```
https://<votre-instance>/api/v1
```

le plus souvent :
```
https://<tbk>.gadzby-app.com/api/v1
```

## Démarrage rapide

1. Demandez une clé API à un administrateur de votre instance (voir [Authentification](./guides/authentification.md#obtenir-une-clé-api)). Elle commence par `gadzby_` et n'est affichée qu'une seule fois.
2. Vérifiez que la clé fonctionne :

   ```bash
   export GADZBY_API_KEY="gadzby_..."

   curl https://<votre-instance>/api/v1/auth/context \
     -H "Authorization: Bearer $GADZBY_API_KEY"
   ```

3. Listez les boutiques actives :

   ```bash
   curl "https://<votre-instance>/api/v1/shops?limit=5" \
     -H "Authorization: Bearer $GADZBY_API_KEY"
   ```

4. Récupérez le catalogue d'une boutique :

   ```bash
   curl https://<votre-instance>/api/v1/shops/<shopId>/products \
     -H "Authorization: Bearer $GADZBY_API_KEY"
   ```

## Conventions

| Sujet | Convention |
|---|---|
| Format | JSON (`Content-Type: application/json`) pour les corps de requête et de réponse. |
| Identifiants | UUID v4 (`1520a378-63aa-4667-86f7-d106f618ee68`). |
| Montants | **Entiers en centimes d'euro** (`150` = 1,50 €). Seule exception : `amountInEuros` sur [`POST /payments/initiate`](./reference/paiements.md). |
| Signe des montants | Sur une transaction, un montant négatif débite le compte et un montant positif le crédite. |
| Succès | Les réponses réussies contiennent `"success": true` et la ressource sous une clé nommée (`user`, `shops`…). |
| Erreurs | `{ "error": "message" }`, parfois avec `details`. Voir [Erreurs](./guides/erreurs.md). |
| Langue | Les messages d'erreur techniques sont en anglais, les erreurs métier (solde insuffisant…) en français. |

## Index des endpoints

Auth : 🔑 = clé API seule, 🔑👤 = clé API + jeton utilisateur.

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| `GET` | [`/auth/context`](./reference/authentification.md#vérifier-une-clé-api) | 🔑 | Vérifier une clé API |
| `POST` | [`/auth/login`](./reference/authentification.md#connecter-un-utilisateur) | 🔑 | Connecter un utilisateur (identifiant + mot de passe) |
| `GET` | [`/me`](./reference/utilisateur-connecte.md#récupérer-lutilisateur-connecté) | 🔑👤 | Profil et solde de l'utilisateur connecté |
| `POST` | [`/me/purchases`](./reference/utilisateur-connecte.md#acheter-en-libre-service) | 🔑👤 | Achat en libre-service par l'utilisateur connecté |
| `GET` | [`/users`](./reference/utilisateurs.md#rechercher-des-utilisateurs) | 🔑 | Rechercher des utilisateurs |
| `GET` | [`/users/{userId}`](./reference/utilisateurs.md#récupérer-un-utilisateur) | 🔑 | Récupérer un utilisateur |
| `GET` | [`/shops`](./reference/boutiques.md#lister-les-boutiques) | 🔑 | Lister les boutiques actives |
| `GET` | [`/shops/{shopId}`](./reference/boutiques.md#récupérer-une-boutique) | 🔑 | Récupérer une boutique |
| `GET` | [`/shops/{shopId}/categories`](./reference/boutiques.md#lister-les-catégories-dune-boutique) | 🔑 | Catégories de produits d'une boutique |
| `GET` | [`/shops/{shopId}/products`](./reference/boutiques.md#lister-les-produits-dune-boutique) | 🔑 | Catalogue d'une boutique |
| `POST` | [`/shops/{shopId}/purchases`](./reference/achats.md#créer-un-achat) | 🔑 | Débiter un utilisateur pour un achat en boutique |
| `GET` | [`/shops/{shopId}/transactions`](./reference/transactions.md#lister-les-transactions-dune-boutique) | 🔑 | Historique des transactions d'une boutique |
| `POST` | [`/payments/initiate`](./reference/paiements.md#effectuer-un-virement) | 🔑 | Virement entre deux utilisateurs |
| `GET` | [`/famss`](./reference/famss.md#lister-les-famss) | 🔑 | Lister les Fam'ss |
| `GET` | [`/famss/{famsId}/members`](./reference/famss.md#lister-les-membres-dune-famss) | 🔑 | Membres d'une Fam'ss |
| `GET` | [`/webhooks`](./reference/webhooks.md#lister-les-webhooks) | 🔑 | Lister vos webhooks |
| `POST` | [`/webhooks`](./reference/webhooks.md#créer-un-webhook) | 🔑 | Créer un webhook |
| `DELETE` | [`/webhooks/{webhookId}`](./reference/webhooks.md#supprimer-un-webhook) | 🔑 | Supprimer un webhook |
