# Guide d'hébergement de Gadzby 

Ce document décrit les étapes nécessaires pour déployer et héberger l'application sur un serveur de production.
Utiliser un service comme Vercel, Netlify ou **Coolify** est recommandé pour héberger Gadzby.

## 1. Prérequis

*   **Serveur (VPS ou Dédié)** : Instance tournant sous Ubuntu 22.04+ ou Debian 12. Minimum recommandé pour Next.js et PostgreSQL : 2 vCPU, 4 Go de RAM.
*   **Nom de domaine** : Accès à la gestion DNS du domaine souhaité (ex: `gadzby-app.com`).
*   **Accès SSH** : Accès root à votre serveur.

à ce jour la taille max de la BDD n'est pas connue, mais il faut prévoir large.

## 2. Installation de Coolify sur le serveur

Connectez-vous à votre serveur via SSH :

```bash
ssh root@votre_ip_serveur
```

Exécutez le script d'installation officiel de Coolify (voir [la documentation de Coolify pour plus d'infos](https://coolify.io/docs/get-started/installation)) :

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Une fois l'installation terminée, l'interface réseau affichera les accès de connexion. Par défaut, accédez à `http://<votre_ip_serveur>:8000` via votre navigateur pour configurer votre compte administrateur.

## 3. Configuration des DNS

Dans l'interface de gestion de votre nom de domaine (OVH, Cloudflare, etc.) :
1. Créez un enregistrement DNS de type **A** pour votre panel Coolify (ex: `coolify.gadzby.com`) pointant vers l'IP de votre serveur.
2. Créez un autre enregistrement de type **A** pour votre application (ex: `app.gadzby.com` ou `gadzby.com`) pointant également vers la même IP.

Si votre serveur est derrière un Reverse Proxy, faitent pointer les enregistrements vers l'adresse du Reverse Proxy. Il faudra configurer le Reverse Proxy pour qu'il redirige les requêtes vers Coolify.

Dans l'interface de Coolify (onglet *Settings*), vous pouvez configurer votre domaine pour l'URL système afin d'accéder à Coolify de manière sécurisée.

![parametres Coolify](./assets/Coolify-settings.png)

## 4. Création de la Base de Données

Avant de déployer l'application, configurons la base de données :

1. Dans Coolify, rendez-vous dans la section **Projects** puis cliquez sur **+ Add**. Nommez-le "Gadzby".
2. Une fois votre projet créé, l'environement **Production** est créé automatiquement, cliquez sur **+ Add Resource**.
3. Sous **Database** choisissez **PostgreSQL** (pas de version specifique, laissez la derniere version disponible).
4. Vous pouvez laisser les paramètres générés automatiquement ou définir vos propres identifiants (Db Name, Db User, Db Password).
5. Cliquez sur **Start** pour lancer la base de données.
6. Une fois le statut *Running* affiché, allez dans la section **Network**. Copiez l'URL de connexion interne (Postgres URL (internal)), par ex: `postgresql://user:pass@postgresql-id:5432/db`). Cette URL servira pour configurer Gadzby.

![parametres Postgres](./assets/postgres-settings.png)

## 5. Déploiement de l'Application Gadzby

1. Au sein du même projet/environnement sur Coolify, cliquez sur **+ New** pour ajouter une nouvelle ressource.
2. Sous **Application / Git Based** choisissez public Repository.
3. Entrez l'URL du dépôt GitHub : `https://github.com/GadzbyOrg/Gadzby`. Laisser les paramétres par défaut (branche `main`, port 3000).
4. **Configuration Générale de la ressource :**
    *   **Build Pack** : Laisser l'option par défaut **Nixpacks**. Elle s'occupera d'identifier Gadzby comme projet Node/Next.js et de tout installer correctement.
    *   **Domains** : Indiquez le domaine de votre app, par ex: `https://gadzby-app.com`. Coolify s'occupera automatiquement et de la génération du certificat SSL Let's Encrypt.

> Si vous avez un reverse-proxy, ne mettez pas de https ici, laisser votre reverse-proxy gérer le https. Votre config doit ressembrer à :
> *   **Dans Coolify** : `http://gadzby-app.com`
> *   **Dans votre reverse-proxy** : `https://gadzby-app.com` -> `http://<ip-de-votre-serveur>:80` (le reverse-proxy interne à Coolify gére la redirection 3000 -> 80)
> *   **Dans votre reverse-proxy** : Scheme: `http` ; **Activer le support pour les Websockets!!** et configurer le certificat https.

5. **Configuration des Variables d'Environnement :**
    *   Allez dans l'onglet **Environment Variables**.
    *   Ajoutez-y toutes les variables suivantes :
    ```
    DATABASE_URL="url de connexion à PostgreSQL (cf partie 4.)"
    JWT_SECRET="a-string-secret-at-least-256-bits-long"
    NEXT_PUBLIC_APP_URL="https://domaine-de-votre-app.exemple"
    CAMPUS_NAME="nom du campus"
    ```
6. **Lancer le déploiement :**
    *   Cliquez sur le bouton **Deploy**.
    *   Laissez Coolify cloner le code, installer les librairies, faire un "build" de production et démarrer votre application. Vous pouvez consulter l'onglet **Deployments** pour suivre l'avancée et voir les logs de build.

## 6. Initialisation de l'application

*   Une fois l'application déployée vous devez appliquer le schéma de base de donnée. Pour ce faire 
    ```bash
    npx drizzle-kit generate
    npx drizzle-kit push
    ```
* Si vous souhaitez migrer les utilisateurs depuis Borgia il faut cloner le repo [BtoG](https://github.com/GadzbyOrg/BtoG) et suivres [les instructions](https://github.com/GadzbyOrg/BtoG/blob/main/README.md)

*   Puis executer le script d'initialisation pour la production :
    ```bash
    npx tsx scripts/setup-prod.ts
    ```
    Ce script vas, entre autre, créer l'utilisateur admin.

## 7. Mises à Jour Automatisées

Pour que Gadzby se mette à jour dès qu'un push est fait sur Github :
1. Dans votre ressource Gadzby sur Coolify, rendez-vous dans l'onglet **Webhooks**.
2. Assurez-vous que l'intégration GitHub est active.
3. À chaque "Push", Coolify déclenchera un redéploiement complet en mode *Zero-Downtime* en arrière plan.

## 8. Backups et maintenance

Une strategie de backup est indispensable si vous souhaitez déployer Gadzby en production.
Heureusement, Coolify intègre un système de backup automatisé pour les bases de données.

### Stratégie de backup (Règle du 3-2-1)

Il est fortement recommandé d'appliquer la règle d'or **3-2-1** pour la sauvegarde de la base de données :
*   **3 copies** de vos données : les données de production + 2 sauvegardes.
*   **2 supports différents** : par exemple, le disque local de votre serveur et un stockage cloud (S3).
*   **1 copie hors site** : une sauvegarde hébergée géographiquement loin de votre serveur de production (par exemple sur AWS S3 ou autre).

**Mise en pratique avec Coolify :**
1. Configurez une sauvegarde "Local" sur le serveur via Coolify (par exemple de manière journalière pendant 7 jours).
2. Configurez une deuxième destination de sauvegarde en ajoutant un **S3 Storage** (dans le menu *Destinations* de Coolify), et planifiez une sauvegarde distincte vers cet espace distant.

### Configurer les backups de la base de données

1. Dans votre projet Coolify, cliquez sur votre ressource **PostgreSQL** (créée à l'étape 4).
2. Allez dans l'onglet **Backups**.
3. Dans la section **Backup Destinations**, vous pouvez configurer où les sauvegardes seront stockées (localement sur le serveur, ou sur un bucket S3 compatible tel que AWS S3, MinIO, Scaleway, etc. ce qui est fortement recommandé).
4. Dans la section **Scheduled Backups**, cliquez sur **+ Add**.
5. Définissez :
   - **Database**: Laissez par defaut le nom de votre DB.
   - **Schedule**: Utilisez une expression Cron ou `daily`. Par exemple, `0 5 * * *` pour une sauvegarde tous les jours à 5h00 du matin (UTC).
   - **Number of backups to keep**: Indiquez combien d'archives conserver (ex: 7 pour garder les 7 derniers jours).
6. Cliquez sur **Save**. Vous pouvez tester la sauvegarde immédiate en cliquant sur **Backup Now**.

### Maintenance du Serveur

Il est également recommandé de maintenir le système d'exploitation de votre VPS à jour. Connectez-vous régulièrement en SSH pour appliquer les mises à jour de sécurité Ubuntu/Debian :
```bash
sudo apt update && sudo apt upgrade -y
```
