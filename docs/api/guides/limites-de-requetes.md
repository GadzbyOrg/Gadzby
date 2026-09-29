# Limites de requêtes

Pour protéger l'instance, chaque clé API peut envoyer un nombre limité de requêtes par **fenêtre d'une minute**.

## Limites par endpoint

| Endpoint | Limite | Compteur |
|---|---|---|
| `GET /auth/context` | 100 / min | par adresse IP |
| `POST /auth/login` | 10 / min | par adresse IP |
| `POST /auth/login` | 5 / min | par identifiant (`username`) |
| `GET /users` | 60 / min | par clé API |
| `POST /shops/{shopId}/purchases` | 30 / min | par clé API |
| `POST /me/purchases` | 30 / min | par clé API |
| `POST /payments/initiate` | 30 / min | par clé API |
| `GET /webhooks`, `POST /webhooks`, `DELETE /webhooks/{id}` | aucune | — |
| Tous les autres endpoints | 100 / min | par clé API |

## Fonctionnement

- La fenêtre démarre à la première requête et dure 60 secondes. Le compteur repart ensuite de zéro.
- **Le compteur « par clé API » est partagé entre tous les endpoints.** Le plafond vérifié est celui de l'endpoint appelé. Exemple : après 30 lectures du catalogue dans la minute, un appel à `POST /shops/{shopId}/purchases` (plafond 30) est refusé, même si c'est le premier achat de la minute. Répartissez les lectures ou mettez-les en cache (voir [Problèmes connus](../problemes-connus.md)).
- La limite par identifiant de `/auth/login` protège les comptes contre le brute force, quelle que soit l'adresse IP d'origine.

## Dépassement

Au-delà de la limite, l'API répond :

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{ "error": "Too Many Requests" }
```

Aucun en-tête `Retry-After` ni `X-RateLimit-*` n'est envoyé. Attendez 60 secondes avant de réessayer, idéalement avec un délai exponentiel (1 s, 2 s, 4 s… jusqu'à 60 s).

## Réduire le nombre d'appels

- Mettez en cache les données qui changent peu : liste des boutiques, catégories, catalogue (quelques minutes suffisent).
- Utilisez les [webhooks](./webhooks.md) plutôt que d'interroger régulièrement `GET /shops/{shopId}/transactions`.
