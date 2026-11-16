# Erreurs

L'API utilise les codes HTTP standards. Un code `2xx` signifie que la requête a réussi, `4xx` qu'elle doit être corrigée côté client, `5xx` qu'un problème est survenu côté Gadzby.

## Format

Toutes les erreurs ont la même enveloppe :

```json
{
  "error": "Solde insuffisant"
}
```

| Champ | Type | Description |
|---|---|---|
| `error` | string | Message lisible. Les erreurs techniques sont en anglais (`Invalid payload`), les erreurs métier en français (`Solde insuffisant`) et peuvent être affichées telles quelles à l'utilisateur. |
| `details` | array \| object | Présent uniquement sur les erreurs de validation (`Invalid payload`). Voir plus bas. |

Il n'y a pas encore de code d'erreur stable et lisible par une machine. Basez votre logique sur le **statut HTTP**, et utilisez `error` seulement pour l'affichage et les logs.

## Codes HTTP

| Statut | Signification | Que faire |
|---|---|---|
| `200 OK` | Lecture ou suppression réussie. | — |
| `201 Created` | Ressource créée (achat, paiement, webhook, jeton). | — |
| `400 Bad Request` | JSON invalide, paramètre manquant ou erroné, ou règle métier non respectée (solde insuffisant, produit introuvable…). | Corriger la requête ou informer l'utilisateur. Ne pas réessayer telle quelle. |
| `401 Unauthorized` | Clé API ou jeton utilisateur absent, invalide, expiré ou révoqué. Identifiants incorrects sur `/auth/login`. | Voir [Authentification](./authentification.md#erreurs-dauthentification). |
| `403 Forbidden` | Action interdite : compte désactivé, boutique fermée, libre-service désactivé. | Informer l'utilisateur. |
| `404 Not Found` | Ressource inexistante ou inactive. | Vérifier l'identifiant. |
| `409 Conflict` | Une requête avec la même `Idempotency-Key` est encore en cours. | Attendre puis réessayer avec la même clé. Voir [Idempotence](./idempotence.md). |
| `429 Too Many Requests` | Limite de requêtes atteinte. | Attendre la durée indiquée par l'en-tête `Retry-After`. Voir [Limites de requêtes](./limites-de-requetes.md). |
| `500 Internal Server Error` | Erreur inattendue côté Gadzby. L'incident est remonté automatiquement à l'équipe. L'opération n'a pas été enregistrée. | Réessayer plus tard. Pour une opération qui débite, utiliser une **nouvelle** `Idempotency-Key` (voir [Idempotence](./idempotence.md#comportement)). |

## Erreurs de validation

Quand le corps ou les paramètres ne respectent pas le schéma attendu, l'API répond `400` avec `"error": "Invalid payload"` et un champ `details` qui liste chaque problème :

```json
{
  "error": "Invalid payload",
  "details": [
    {
      "code": "invalid_format",
      "format": "uuid",
      "path": ["items", 0, "productId"],
      "message": "Invalid UUID"
    }
  ]
}
```

| Champ | Description |
|---|---|
| `path` | Chemin du champ fautif dans le corps (`["items", 0, "productId"]` = `items[0].productId`). |
| `message` | Description du problème, en anglais. |
| `code` | Type d'erreur de validation (`invalid_type`, `invalid_format`, `too_small`…). |

Ce format est commun à tous les endpoints qui acceptent un corps JSON.

### Paramètres de chemin et de requête

Les paramètres de l'URL sont validés avant tout accès aux données. Ils renvoient un `400` sans `details`, avec le nom du paramètre fautif :

| `error` | Cause |
|---|---|
| `Invalid <paramètre>` | Identifiant qui n'est pas un UUID (`Invalid shopId`, `Invalid categoryId`…) ou date invalide (`Invalid startDate`). |
| `Invalid limit` / `Invalid offset` | Pagination hors limites ou non entière (voir [Pagination](./pagination.md#validation)). |
| `Invalid JSON body` | Corps qui n'est pas du JSON valide. |

## Erreurs métier courantes

Ces erreurs viennent des règles de gestion de Gadzby. Elles ont le statut `400`, sauf indication contraire dans la référence de l'endpoint.

| `error` | Cause |
|---|---|
| `Solde insuffisant` | Le solde de l'utilisateur ne couvre pas le montant. |
| `Solde insuffisant (Fam'ss)` | Le solde de la Fam'ss ne couvre pas le montant. |
| `Compte désactivé` | Le compte débité est désactivé. |
| `Certains produits sont invalides ou introuvables` | Un `productId` n'existe pas ou n'appartient pas à la boutique. |
| `Variante invalide pour <produit>` | Le `variantId` n'appartient pas au produit. |
| `L'utilisateur n'est pas membre de cette famille` | Paiement Fam'ss par un non-membre. |
