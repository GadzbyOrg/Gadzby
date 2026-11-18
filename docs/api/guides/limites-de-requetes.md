# Limites de requêtes

Pour protéger l'instance, chaque clé API peut envoyer un nombre limité de requêtes par **fenêtre d'une minute**. Les endpoints sont regroupés en **quotas** indépendants : les lectures ne consomment pas le quota des achats.

## Quotas

| Quota | Limite | Compteur | Endpoints |
|---|---|---|---|
| Lecture | 100 / min | par clé API | `GET /me`, `/shops`, `/shops/{shopId}`, `/shops/{shopId}/categories`, `/shops/{shopId}/products`, `/shops/{shopId}/transactions`, `/users/{userId}`, `/famss`, `/famss/{famsId}/members` |
| Recherche d'utilisateurs | 60 / min | par clé API | `GET /users` |
| Écriture | 30 / min | par clé API | `POST /shops/{shopId}/purchases`, `POST /me/purchases`, `POST /payments/initiate` |
| Webhooks | 30 / min | par clé API | `GET /webhooks`, `POST /webhooks`, `DELETE /webhooks/{webhookId}` |
| Contexte | 100 / min | par adresse IP | `GET /auth/context` |
| Connexion (IP) | 10 / min | par adresse IP | `POST /auth/login` |
| Connexion (compte) | 5 / min | par identifiant (`username`) | `POST /auth/login` |

## Fonctionnement

- La fenêtre démarre à la première requête du quota et dure 60 secondes. Le compteur repart ensuite de zéro.
- Les endpoints d'un même quota partagent leur compteur : 60 lectures du catalogue et 40 lectures de boutiques épuisent le quota « Lecture ».
- La limite par identifiant de `/auth/login` protège les comptes contre le brute force, quelle que soit l'adresse IP d'origine.
- Une requête refusée par la limite n'est **pas** exécutée : vous pouvez la renvoyer telle quelle, avec la même `Idempotency-Key`.

## Dépassement

Au-delà de la limite, l'API répond :

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 42
X-RateLimit-Limit: 30
X-RateLimit-Reset: 1790688767

{ "error": "Too Many Requests" }
```

| En-tête | Description |
|---|---|
| `Retry-After` | Secondes à attendre avant que le quota soit réinitialisé. |
| `X-RateLimit-Limit` | Nombre de requêtes autorisées par fenêtre pour ce quota. |
| `X-RateLimit-Reset` | Date de réinitialisation, en secondes depuis l'époque Unix (UTC). |

Ces en-têtes ne sont envoyés que sur les réponses `429`. Attendez la durée indiquée par `Retry-After` avant de réessayer.

## Réduire le nombre d'appels

- Mettez en cache les données qui changent peu : liste des boutiques, catégories, catalogue (quelques minutes suffisent).
- Utilisez les [webhooks](./webhooks.md) plutôt que d'interroger régulièrement `GET /shops/{shopId}/transactions`.
