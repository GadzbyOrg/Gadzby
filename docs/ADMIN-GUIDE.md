# Guide Administrateur Gadzby

Ce guide couvre la configuration de l'application et la gestion des rôles, accessibles depuis le panneau d'administration.

---

## Sommaire

- [1. Paramètres de l'application](#1-paramètres-de-lapplication)
  - [Campus](#campus)
  - [Fam'ss](#famss)
  - [Email](#email)
  - [Moyens de paiement](#moyens-de-paiement)
    - [Lydia](#lydia)
    - [SumUp](#sumup)
    - [HelloAsso](#helloasso)
  - [Clés API](#clés-api)
  - [Pennylane](#pennylane)
- [2. Rôles globaux](#2-rôles-globaux)
- [3. Rôles par boquette](#3-rôles-par-boquette)

---

## 1. Paramètres de l'application

**Accès :** Menu admin → Paramètres (`/admin/settings`)  
**Permission requise :** `ADMIN_ACCESS` ou `MANAGE_PAYMENTS`

### Campus

Personnalise l'affichage de la page de connexion.

| Champ | Description |
|---|---|
| Nom du campus | Affiché sur la page de connexion et dans l'app. |
| Message du jour (MOTD) | Texte court affiché sous le formulaire de connexion. Optionnel. |

### Fam'ss

Active ou désactive globalement la fonctionnalité Fam'ss pour tous les utilisateurs. Activée par défaut.

### Email

Configure le service d'envoi d'emails (utilisé pour la réinitialisation de mot de passe).

**Deux options disponibles :**

**SMTP (serveur mail personnalisé)**

| Champ | Requis |
|---|---|
| Hôte | Oui |
| Port | Oui |
| Nom d'utilisateur | Oui |
| Mot de passe | Oui |
| Email expéditeur | Oui |
| SSL/TLS | Non |

**Resend**

| Champ | Requis |
|---|---|
| Clé API | Oui |
| Email expéditeur | Oui |

Le bouton **Tester** envoie un email de test pour valider la configuration.

### Moyens de paiement

Gère les intégrations de paiement. Chaque provider est représenté par une carte affichant son statut et ses frais.

**Structure des frais :**
- **Frais fixes** : montant en centimes prélevé par transaction
- **Frais variables** : pourcentage du montant (0–100 %)
- Les frais sont à la charge de l'utilisateur lors du rechargement

**Configuration d'un provider :**

Chaque provider dispose d'un bloc de configuration clé/valeur contenant ses identifiants API. Les valeurs sont masquées à l'affichage. Les sections ci-dessous détaillent comment obtenir ces identifiants pour chaque provider.

#### Lydia

Lydia envoie une demande de paiement directement sur l'application mobile de l'utilisateur. Il doit renseigner son numéro de téléphone.

**Obtenir les identifiants :**

1. Connectez-vous à votre espace Lydia Pro
2. Allez dans **Paramètres → API**
3. Copiez le **Token vendeur** (clé publique) et le **Token privé** (clé secrète)

(sinon copier juste les valeurs depuis Borgia)

**Clés à saisir dans Gadzby :**

| Clé | Valeur |
|---|---|
| `vendorToken` | Token vendeur (clé publique) |
| `privateToken` | Token privé |


#### SumUp

SumUp redirige l'utilisateur vers une page de paiement hébergée.

**Obtenir les identifiants :**

1. Connectez-vous à votre compte SumUp
2. Allez dans **les paramètres développeurs de l'interface SumUp**
3. Générez une nouvelle clé API
4. Votre **code marchand** est visible dans le coin supérieur droit de l'interface SumUp, sous le nom de l'association

**Clés à saisir dans Gadzby :**

| Clé | Valeur |
|---|---|
| `sumup_api_key` | Clé API générée |
| `merchantCode` | Code marchand SumUp |


#### HelloAsso

**Obtenir les identifiants :**

1. Connectez-vous à votre espace HelloAsso
2. Allez dans **Mon compte → Intégrations et API**
3. Copiez le **Client ID** et le **Client Secret**
4. Votre **organization slug** est visible dans l'URL de votre espace admin :  
   `https://admin.helloasso.com/{organizationSlug}/accueil`

**Clés à saisir dans Gadzby :**

| Clé | Valeur |
|---|---|
| `clientId` | Client ID OAuth2 |
| `clientSecret` | Client Secret OAuth2 |
| `organizationSlug` | Slug de l'organisation dans l'URL HelloAsso |

**IMPORTANT : Configurer le webhook chez HelloAsso :**

Dans votre espace HelloAsso, renseignez l'URL de callback :
```
https://<votre-domaine>/api/webhooks/payment?provider=helloasso
```

> Sans cette URL, les paiements ne seront pas validés et les soldes ne seront jamais crédités.

### Clés API

Gère les clés d'accès pour les intégrations tierces.

- Les clés sont au format `gadzby_<64 caractères aléatoires>`
- La valeur brute n'est affichée **qu'une seule fois** à la création — à copier immédiatement
- La révocation est définitive

### Pennylane

Intégration avec le logiciel de comptabilité Pennylane pour la réception automatique des factures fournisseurs.

**Configuration principale :**

| Champ | Description |
|---|---|
| Activer l'intégration | Active la synchronisation avec Pennylane |
| Clé API | Format `sk_...` — à générer dans Pennylane (Connectivité → Développeurs) |

La clé API doit avoir les droits lecture/écriture sur : Factures Fournisseurs, Fichiers, Catégories.

**Mapping boquette → catégorie :**

Une fois l'intégration activée, il est possible d'associer chaque boquette à une ou plusieurs catégories de dépenses Pennylane. Ces catégories sont ensuite utilisées pour identifier les factures fournisseurs manquantes.

---

## 2. Rôles globaux

**Accès :** Menu admin → Rôles (`/admin/roles`)  
**Permission requise :** `ADMIN_ACCESS` ou `MANAGE_ROLES`

Les rôles globaux définissent les permissions d'un utilisateur à l'échelle de toute l'application. Un utilisateur a exactement un rôle global.

### Permissions disponibles

| Permission | Description |
|---|---|
| `ADMIN_ACCESS` | Accès complet sans restriction |
| `MANAGE_USERS` | Créer, modifier, désactiver des utilisateurs |
| `MANAGE_ROLES` | Créer et configurer des rôles |
| `MANAGE_FAMSS` | Accès admin aux Fam'ss |
| `CREATE_FAMSS` | Autoriser la création de Fam'ss |
| `MANAGE_PAYMENTS` | Superviser les systèmes de paiement |
| `MANAGE_SHOPS` | Créer, modifier, supprimer des boquettes et produits |
| `VIEW_TRANSACTIONS` | Lire l'historique complet des transactions |
| `CANCEL_TRANSACTION` | Annuler des transactions |
| `TOPUP_USER` | Créditer des comptes utilisateurs (via rechargement face-à-face ou cash) |
| `MANAGE_MANDATS` | Gérer les mandats |

### Créer un rôle

1. Renseigner un nom unique
2. Cocher les permissions à attribuer
3. Valider

### Modifier un rôle

Cliquer sur un rôle pour dérouler ses permissions.

### Supprimer un rôle

Un rôle assigné à des utilisateurs ne peut pas être supprimé — il faut d'abord réassigner ces utilisateurs à un autre rôle.

---

## 3. Rôles par boquette

**Accès :** Gestion de la boquette → Rôles (`/shops/[slug]/manage/roles`)  
**Permission requise :** permission `MANAGE_SETTINGS` sur la boquette concernée (ou `ADMIN_ACCESS` / `MANAGE_ROLES` global)

Les rôles de boquette définissent ce qu'un membre peut faire au sein d'une boquette spécifique. Ils sont indépendants des rôles globaux.

### Permissions disponibles

| Permission | Description |
|---|---|
| `SELL` | Effectuer des ventes |
| `MANAGE_PRODUCTS` | Créer, modifier, supprimer des produits |
| `MANAGE_INVENTORY` | Ajuster les stocks |
| `VIEW_STATS` | Consulter les statistiques |
| `MANAGE_SETTINGS` | Modifier la configuration de la boquette |
| `MANAGE_EVENTS` | Créer et gérer des événements (Manips) |
| `MANAGE_EXPENSES` | Enregistrer et suivre les dépenses |

### Rôle Grip'ss boquette

Le rôle **Grip'ss de boquette** est le rôle propriétaire de la boquette. Il est protégé : ses permissions ne peuvent pas être modifiées et il ne peut pas être supprimé.


