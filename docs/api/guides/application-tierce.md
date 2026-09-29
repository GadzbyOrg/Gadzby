# Tutoriel : borne en libre-service

Ce tutoriel construit le parcours d'une borne où un utilisateur se connecte, voit son solde et achète des produits pour lui-même. Il utilise les endpoints `/auth/login` et `/me`.

**Prérequis**
- Une clé API (voir [Authentification](./authentification.md#obtenir-une-clé-api)), stockée **côté serveur** de votre borne.
- Une boutique avec le **libre-service activé** (réglage de la boutique dans Gadzby), et des produits autorisés en libre-service.

```
Utilisateur ──► Borne (votre serveur) ──► API Gadzby
                 clé API + jeton utilisateur
```

## 1. Connecter l'utilisateur

```bash
curl -X POST https://<votre-instance>/api/v1/auth/login \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "jdupont", "password": "••••••••"}'
```

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiJ9…",
  "expiresAt": "2026-09-29T15:31:47.012Z",
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

Gardez `token` en mémoire pour la session et affichez le solde : `2196` centimes = **21,96 €**.

| Réponse | Message à afficher |
|---|---|
| `401` | « Identifiant ou mot de passe incorrect » |
| `403` | « Votre compte est désactivé, contactez un administrateur » |
| `429` | « Trop de tentatives, réessayez dans une minute » |

## 2. Afficher le catalogue

Le catalogue n'est pas propre à l'utilisateur : la clé API suffit. Mettez-le en cache quelques minutes.

```bash
curl https://<votre-instance>/api/v1/shops/$SHOP_ID/products \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

N'affichez que les produits avec `allowSelfService: true`. Les autres seront refusés à l'achat. Le prix à afficher est `price`, en centimes.

## 3. Acheter

Générez une `Idempotency-Key` par panier validé. En cas de coupure réseau, vous pourrez renvoyer la même requête sans risque de double débit (voir [Idempotence](./idempotence.md)).

```bash
curl -X POST https://<votre-instance>/api/v1/me/purchases \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "X-User-Token: $USER_TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "1520a378-63aa-4667-86f7-d106f618ee68",
    "items": [
      { "productId": "01fceb19-01fa-4776-a802-4be5ca76a4cb", "quantity": 2 }
    ]
  }'
```

```json
{ "success": true, "balance": 2126 }
```

Affichez le nouveau solde renvoyé : pas besoin de rappeler `/me`.

| Réponse | Cause probable | Action |
|---|---|---|
| `400` `Solde insuffisant` | Solde trop faible | Proposer de recharger. |
| `400` `Certains produits ne sont pas disponibles en self-service` | Produit non autorisé ou d'une autre boutique | Rafraîchir le catalogue. |
| `401` | Jeton expiré (2 h) ou compte désactivé | Revenir à l'écran de connexion. |
| `403` | Boutique fermée ou libre-service désactivé | Afficher « Boutique indisponible ». |
| `429` | Trop d'achats dans la minute | Réessayer après 60 s, avec la même `Idempotency-Key`. |

## 4. Rafraîchir et déconnecter

- Pour réafficher le solde plus tard, appelez [`GET /me`](../reference/utilisateur-connecte.md#récupérer-lutilisateur-connecté).
- Pour déconnecter l'utilisateur, **effacez le jeton** de la mémoire de la borne. Faites-le automatiquement après chaque achat ou après une période d'inactivité.

## Exemple complet (Node.js)

```js
const BASE_URL = "https://<votre-instance>/api/v1";
const API_KEY = process.env.GADZBY_API_KEY;

async function gadzby(path, { token, idempotencyKey, ...init } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(token && { "X-User-Token": token }),
      ...(idempotencyKey && { "Idempotency-Key": idempotencyKey }),
    },
  });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body.error), { status: res.status });
  return body;
}

const { token, user } = await gadzby("/auth/login", {
  method: "POST",
  body: JSON.stringify({ username, password }),
});

const { balance } = await gadzby("/me/purchases", {
  method: "POST",
  token,
  idempotencyKey: crypto.randomUUID(),
  body: JSON.stringify({ shopId, items: [{ productId, quantity: 1 }] }),
});
```
