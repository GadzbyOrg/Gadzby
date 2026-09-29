# Webhooks

Gérer les abonnements aux événements. Le format des événements, la vérification de signature et les garanties de livraison sont décrits dans le [guide Webhooks](../guides/webhooks.md).

Un webhook est rattaché à la clé API qui l'a créé. Chaque clé ne voit et ne supprime que ses propres webhooks.

- [Lister les webhooks](#lister-les-webhooks) — `GET /webhooks`
- [Créer un webhook](#créer-un-webhook) — `POST /webhooks`
- [Supprimer un webhook](#supprimer-un-webhook) — `DELETE /webhooks/{webhookId}`

---

## Lister les webhooks

Renvoie les webhooks de la clé API. Le `secret` n'est pas renvoyé.

```
GET /api/v1/webhooks
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | Aucune |
| **Idempotent** | Oui (lecture) |

### Exemple

```bash
curl https://<votre-instance>/api/v1/webhooks \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "webhooks": [
    {
      "id": "5a3c9f0e-2b7d-4e1a-9c8f-6d4b2a1e0f3c",
      "url": "https://exemple.fr/webhooks/gadzby",
      "events": ["shop.purchase.created"],
      "isActive": true,
      "createdAt": "2026-09-29T08:00:00.000Z"
    }
  ]
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `401` | `Invalid API Key` / … | Clé API invalide. |

---

## Créer un webhook

Abonne une URL à un ou plusieurs événements. L'abonnement est actif immédiatement.

```
POST /api/v1/webhooks
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | Aucune |
| **Idempotent** | Non : chaque appel crée un nouvel abonnement, même pour une URL déjà abonnée. |

### Corps

| Champ | Type | Requis | Description |
|---|---|---|---|
| `url` | string | Oui | URL **HTTPS** qui recevra les événements. |
| `events` | string[] | Oui | Au moins un événement. Valeurs possibles : `shop.purchase.created`. |

### Exemple

```bash
curl -X POST https://<votre-instance>/api/v1/webhooks \
  -H "Authorization: Bearer $GADZBY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://exemple.fr/webhooks/gadzby",
    "events": ["shop.purchase.created"]
  }'
```

**`201 Created`**

```json
{
  "success": true,
  "webhook": {
    "id": "5a3c9f0e-2b7d-4e1a-9c8f-6d4b2a1e0f3c",
    "url": "https://exemple.fr/webhooks/gadzby",
    "events": ["shop.purchase.created"],
    "secret": "wh_sec_8f14e45fceea167a5a36dedd4bea2543a1b2c3d4e5f6a7b8",
    "isActive": true,
    "createdAt": "2026-09-29T08:00:00.000Z"
  }
}
```

**Conservez le `secret` :** il n'est renvoyé qu'à la création et sert à [vérifier la signature](../guides/webhooks.md#vérifier-la-signature) des événements. Pour en changer, supprimez le webhook et recréez-le.

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `400` | `Invalid payload` | URL invalide ou non HTTPS, `events` vide ou événement inconnu, avec `details` (voir [Erreurs](../guides/erreurs.md#erreurs-de-validation)). |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `500` | `Internal Server Error` | Corps qui n'est pas du JSON valide (voir [Problèmes connus](../problemes-connus.md)). |

---

## Supprimer un webhook

Supprime définitivement l'abonnement. Aucun événement n'est envoyé après la suppression.

```
DELETE /api/v1/webhooks/{webhookId}
```

| | |
|---|---|
| **Auth** | Clé API |
| **Limite** | Aucune |
| **Idempotent** | Oui : un deuxième appel renvoie `404` sans autre effet. |

### Paramètres de chemin

| Paramètre | Type | Description |
|---|---|---|
| `webhookId` | UUID | Identifiant du webhook. |

### Exemple

```bash
curl -X DELETE https://<votre-instance>/api/v1/webhooks/5a3c9f0e-2b7d-4e1a-9c8f-6d4b2a1e0f3c \
  -H "Authorization: Bearer $GADZBY_API_KEY"
```

**`200 OK`**

```json
{
  "success": true,
  "message": "Webhook deleted"
}
```

### Erreurs

| Statut | `error` | Cause |
|---|---|---|
| `404` | `Webhook not found or unauthorized` | Webhook inexistant ou appartenant à une autre clé API. |
| `401` | `Invalid API Key` / … | Clé API invalide. |
| `500` | `Internal Server Error` | `webhookId` qui n'est pas un UUID valide (voir [Problèmes connus](../problemes-connus.md)). |

---

## Objet `Webhook`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant. |
| `url` | string | URL de destination (HTTPS). |
| `events` | string[] | Événements souscrits. |
| `secret` | string | Clé de signature HMAC, préfixée `wh_sec_`. **Uniquement dans la réponse de création.** |
| `isActive` | boolean | Abonnement actif. Toujours `true` : il n'existe pas encore d'endpoint pour le mettre en pause. |
| `createdAt` | string (ISO 8601) | Date de création. |
