# Webhooks

Les webhooks évitent d'interroger l'API en boucle : Gadzby envoie une requête `POST` à votre serveur dès qu'un événement se produit.

La gestion des abonnements (créer, lister, supprimer) est décrite dans la [référence Webhooks](../reference/webhooks.md).

## Événements

| Événement | Déclenché quand |
|---|---|
| `shop.purchase.created` | Un achat en boutique est validé, quelle que soit son origine : caisse web, libre-service web, `POST /shops/{shopId}/purchases` ou `POST /me/purchases`. |

Un abonnement reçoit les événements de **toute l'instance**, pas seulement ceux déclenchés par sa propre clé API.

## Requête envoyée

```http
POST /votre/endpoint HTTP/1.1
Content-Type: application/json
X-Gadzby-Signature: 5d41402abc4b2a76b9719d911017c592ae2f5a1c3f7e6b8e8f9c3a6b1d2e4f60

{
  "event": "shop.purchase.created",
  "timestamp": "2026-09-29T07:32:54.702Z",
  "payload": {
    "shopId": "1520a378-63aa-4667-86f7-d106f618ee68",
    "targetUserId": "a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    "paymentSource": "PERSONAL",
    "transactions": [
      {
        "productId": "01fceb19-01fa-4776-a802-4be5ca76a4cb",
        "variantId": null,
        "quantity": 1,
        "amount": -35,
        "description": "[API - Borne Foy's] Achat Granité coca cola (25cl) x1"
      }
    ]
  }
}
```

### Enveloppe

| Champ | Type | Description |
|---|---|---|
| `event` | string | Nom de l'événement. |
| `timestamp` | string (ISO 8601) | Date d'envoi. |
| `payload` | object | Données de l'événement. |

### `payload` de `shop.purchase.created`

| Champ | Type | Description |
|---|---|---|
| `shopId` | UUID | Boutique de l'achat. |
| `targetUserId` | UUID | Utilisateur pour qui l'achat a été fait. |
| `paymentSource` | `"PERSONAL"` \| `"FAMILY"` | Solde débité. |
| `famsId` | UUID \| null | Fam'ss débitée. Absent ou `null` si `paymentSource` vaut `PERSONAL`. |
| `transactions` | array | Une ligne par article. |
| `transactions[].productId` | UUID | Produit vendu. |
| `transactions[].variantId` | UUID \| null | Variante vendue. |
| `transactions[].quantity` | number | Quantité. |
| `transactions[].amount` | integer | Montant en centimes, **négatif** (débit). |
| `transactions[].description` | string | Libellé tel qu'il apparaît dans l'historique. |

## Vérifier la signature

Chaque requête porte l'en-tête `X-Gadzby-Signature`. C'est un HMAC-SHA256, en hexadécimal, du **corps brut** de la requête, calculé avec le `secret` du webhook (`wh_sec_…`, renvoyé à sa création).

Vérifiez-la systématiquement : sans cela, n'importe qui peut envoyer de faux événements à votre URL. Calculez le HMAC sur les octets reçus, **avant** de parser le JSON, et comparez en temps constant.

**Node.js (Express)**

```js
import crypto from "node:crypto";
import express from "express";

const app = express();

app.post("/webhooks/gadzby", express.raw({ type: "application/json" }), (req, res) => {
  const expected = crypto
    .createHmac("sha256", process.env.GADZBY_WEBHOOK_SECRET)
    .update(req.body) // Buffer brut
    .digest("hex");
  const received = req.get("X-Gadzby-Signature") ?? "";

  const valid =
    received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) return res.sendStatus(401);

  const { event, payload } = JSON.parse(req.body.toString("utf8"));
  // … traiter l'événement
  res.sendStatus(200);
});
```

**Python (Flask)**

```python
import hashlib, hmac, os
from flask import Flask, request, abort

app = Flask(__name__)

@app.post("/webhooks/gadzby")
def gadzby_webhook():
    expected = hmac.new(
        os.environ["GADZBY_WEBHOOK_SECRET"].encode(),
        request.get_data(),  # corps brut
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("X-Gadzby-Signature", "")):
        abort(401)

    event = request.get_json()
    # … traiter l'événement
    return "", 200
```

## Garanties de livraison

Les limites actuelles sont importantes à connaître :

- **Une seule tentative.** Si votre serveur est injoignable, lent ou répond en erreur, l'événement est perdu. Aucun renvoi n'est prévu.
- **Pas d'historique de livraison** consultable.
- **Ordre non garanti** entre deux événements proches.
- Pas d'identifiant unique d'événement : si vous avez besoin de dédoublonner, utilisez la combinaison `timestamp` + `targetUserId` + `transactions`.

Traitez donc les webhooks comme une **notification rapide**, pas comme une source de vérité. Pour une comptabilité exacte, rapprochez régulièrement vos données avec [`GET /shops/{shopId}/transactions`](../reference/transactions.md#lister-les-transactions-dune-boutique).

Répondez vite (moins de quelques secondes) avec un `2xx`, puis faites les traitements lourds en arrière-plan.
