# Problèmes connus

Cette page liste les écarts entre le comportement **actuel** de l'API et le comportement attendu. La documentation de référence décrit le comportement actuel. Quand un problème est corrigé, retirez-le d'ici et mettez à jour la page de référence concernée.

| # | Endpoint | Problème | Contournement |
|---|---|---|---|
| 1 | `POST /payments/initiate` | Les erreurs métier (solde insuffisant, compte désactivé, utilisateur introuvable, virement vers soi-même) renvoient **`500`** avec le message métier, au lieu de `400`. | Lire le champ `error`. Toute réponse `500` signifie qu'aucun débit n'a eu lieu. |
| 2 | `POST /payments/initiate` | Les erreurs de validation ont un `details` en objet imbriqué par champ, au lieu du tableau `[{ path, message, code }]` utilisé ailleurs. | Traiter ce format à part (voir [Paiements](./reference/paiements.md#erreurs)). |
| 3 | `GET /shops/{shopId}/products` | Aucune **variante** n'est renvoyée : impossible de découvrir les `variantId` acceptés par les achats. | Vendre les produits sans variante. |
| 4 | `GET /shops/{shopId}/products` | Renvoie des colonnes internes (`fcv`, `displayOrder`…) qui peuvent changer sans préavis. | S'en tenir aux champs décrits dans [l'objet `Produit`](./reference/boutiques.md#objet-produit). |
| 5 | `GET /shops/{shopId}/transactions` | Renvoie toutes les colonnes de la table. L'objet `product` décrit dans l'ancienne documentation n'est **pas** inclus. | Croiser `productId` avec le catalogue. |
| 6 | Tous les endpoints avec un identifiant dans le chemin | Un identifiant qui n'est pas un UUID valide (`/users/abc`) renvoie `500` au lieu de `400`/`404`. | Valider le format UUID côté client. |
| 7 | `GET /shops`, `GET /shops/{shopId}/transactions` | Un `limit` ou `offset` non numérique n'est pas rejeté. `?limit=abc` sur `/shops` renvoie **toutes** les boutiques avec `"limit": null`. | Toujours envoyer des entiers. |
| 8 | Limites de requêtes | Un seul compteur par clé API, partagé par tous les endpoints : les lectures consomment le quota des achats (30 / min). Pas d'en-tête `Retry-After`. | Mettre en cache les lectures, attendre 60 s après un `429`. Voir [Limites](./guides/limites-de-requetes.md). |
| 9 | `/webhooks` | Les endpoints de gestion des webhooks n'ont aucune limite de requêtes. | — |
| 10 | Webhooks | Une seule tentative de livraison, sans renvoi, historique ni identifiant d'événement. | Rapprocher périodiquement via `GET /shops/{shopId}/transactions`. Voir [Webhooks](./guides/webhooks.md#garanties-de-livraison). |
| 11 | Webhooks | Les webhooks d'une clé **révoquée** continuent de recevoir les événements. | Supprimer ses webhooks **avant** de faire révoquer la clé. |
| 12 | `POST /webhooks` | Un corps qui n'est pas du JSON valide renvoie `500` au lieu de `400`. | — |
| 13 | `POST /shops/{shopId}/purchases` | Ne vérifie pas que la boutique est active : on peut vendre dans une boutique désactivée. | Vérifier la boutique avec `GET /shops/{shopId}` avant de vendre. |
| 14 | Achats (API) | La période de disponibilité d'un produit (`activeFrom` / `activeUntil`) n'est pas contrôlée à l'achat. | Filtrer côté client. |
| 15 | `GET /users` | Pas de pagination : 50 résultats au maximum. | Affiner avec `name`, `nums` ou `promss`. |
