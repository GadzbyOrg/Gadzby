# Idempotence

Une coupure réseau pendant un achat laisse votre application dans le doute : le débit a-t-il eu lieu ? Si vous réessayez, vous risquez de débiter l'utilisateur deux fois.

L'en-tête `Idempotency-Key` règle ce problème. Si vous envoyez deux fois la même requête avec la même clé, elle n'est exécutée **qu'une seule fois**, et le deuxième appel renvoie la réponse du premier.

## Endpoints concernés

| Endpoint |
|---|
| [`POST /shops/{shopId}/purchases`](../reference/achats.md#créer-un-achat) |
| [`POST /me/purchases`](../reference/utilisateur-connecte.md#acheter-en-libre-service) |
| [`POST /payments/initiate`](../reference/paiements.md#effectuer-un-virement) |

L'en-tête est facultatif, mais **fortement recommandé** sur ces trois endpoints.

## Utilisation

Générez un identifiant unique (un UUID v4) **par opération**, pas par tentative, et renvoyez-le à chaque nouvel essai :

```bash
curl -X POST https://<votre-instance>/api/v1/me/purchases \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "X-User-Token: $USER_TOKEN" \
  -H "Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7" \
  -H "Content-Type: application/json" \
  -d '{"shopId": "…", "items": [{"productId": "…", "quantity": 1}]}'
```

## Comportement

| Situation | Réponse |
|---|---|
| Première requête avec cette clé | Exécutée normalement. En-tête de réponse `X-Idempotency-Cache: MISS`. |
| Même clé, même chemin, même corps, requête terminée | Réponse d'origine renvoyée à l'identique (statut et corps), **sans nouvelle exécution**. En-tête `X-Idempotency-Cache: HIT`. |
| Même clé, requête d'origine encore en cours | `409 Conflict`, `"Request already in progress"`. Attendez puis réessayez avec la même clé. |
| Même clé, chemin ou corps différent | `400 Bad Request`, `"Idempotency key already used for a different request"`. |

Précisions :
- Les clés sont propres à chaque clé API : deux applications peuvent utiliser la même valeur sans interférer.
- L'ordre des champs dans le JSON n'a pas d'importance. Deux corps avec les mêmes valeurs sont considérés comme identiques.
- **Les erreurs aussi sont mémorisées, `500` compris.** Si la première tentative a renvoyé `400 Solde insuffisant` ou `500`, le rejeu renvoie la même erreur, même si la situation a changé entre-temps. Une opération en erreur n'a débité personne : les écritures sont annulées en bloc. Pour réessayer volontairement après une erreur, générez donc une **nouvelle** clé.

## Recommandation

```
opération = nouvel achat → clé = uuid()
répéter jusqu'à 3 fois :
    envoyer la requête avec la clé
    si 2xx ou 4xx (sauf 409, 429) → terminé
    si erreur réseau ou timeout (aucune réponse) → attendre (1 s, 2 s, 4 s) puis réessayer avec LA MÊME clé
    si 409 → attendre puis réessayer avec LA MÊME clé
    si 429 → attendre 60 s puis réessayer avec LA MÊME clé (la requête n'a pas été enregistrée)
    si 5xx → l'opération a échoué sans débit ; nouvelle tentative = NOUVELLE clé
```
