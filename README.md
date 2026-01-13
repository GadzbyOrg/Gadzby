# Gadzby

Gadzby est une application web Fullstack conçue pour centraliser, simplifier et sécuriser la gestion financière et logistique des magasins ("Boquettes") des élèves ingénieurs (Arts et Métiers). Elle vise à remplacer l'ancien système [Borgia](https://github.com/borgia-app).

## Objectifs du Projet

Le but de Gadzby est d'offrir une solution robuste et "student-proof" permettant :

- **La gestion comptable** de multiples points de vente.
- **La fluidification des transactions** ("Débucquage") et des rechargements.
- **Un suivi précis des stocks** et des événements ("Manips").

## Fonctionnalités

### 1. Pour le Gadz (Utilisateur)
L'expérience utilisateur est centrée sur la rapidité et la transparence.

- **Débucquage Multi-Comptes** : Paiement via solde personnel ou via le compte commun de Fam'ss.
- **Rechargement Autonome** : Intégration API (Lydia/Sumup) avec calcul dynamique des frais à la charge de l'utilisateur (zéro coût pour l'asso).
- **Self-Service** : Possibilité de se servir soi-même dans les boquettes autorisées, avec contrôle de solde en temps réel.
- **Social & P2P** : Transfert d'argent instantané entre utilisateurs.

### 2. Pour les Gestionnaires de Boquette

- **Gestion des Stocks & Inventaires** : Suivi des unités et volumes, audits d'inventaire.
- **Comptabilité & Dépenses** : Calcul automatique du bénéfice, suivi des dépenses fournisseurs.
- **Analyses & Statistiques** : Tableaux de bord détaillés sur les ventes, produits phares et performances financières.
- **Rayons Dynamiques** : Organisation flexible des produits par catégories.
- **Gestion des Manips** : Création d'événements temporaires avec produits exclusifs et dates de validité.
- **Rôles Boutique** : Gestion fine des permissions pour chaque membre de l'équipe (Membre, VP, etc...).

### 3. Pour les Grip'ss (Admins)
Une supervision globale pour garantir la pérennité de l'AE.

- **Gestion Globale des Boutiques** : Création et administration de nouvelles boquettes en quelques clics.
- **Gestion des Utilisateurs & Rôles** : Un annuaire complet avec recherche, édition et attribution de rôles précis (Admin, Manager, etc.) pour chaque context (Boquette ou Global).
- **Opérations de Masse** : Débucquage groupé (import Excel) pour gérer les événements majeurs rapidement.
- **Gestion des Fam'ss** : Supervision des comptes communs et des membres associés.
- **Sécurité et Maintenance** : Logs d'activité, annulation de transactions,gestion des mandats et outils de suppression, désactivation d'utilisateurs.

## Stack Technique

Ce projet est construit avec des technologies modernes pour assurer performance et maintenabilité :

- **Framework** : [Next.js 16](https://nextjs.org/) (App Router)
- **Langage** : TypeScript
- **Base de données** : PostgreSQL avec [Drizzle ORM](https://orm.drizzle.team/)
- **UI/UX** : [Tailwind CSS](https://tailwindcss.com/)
- **Authentification** : Custom (JWT/Bcrypt)
- **Paiements** : Intégrations API externes (Lydia/Sumup)

## 📦 Installation et Démarrage

### 1. Prérequis

Avant de commencer, installez ces outils :
- [Node.js](https://nodejs.org/) (Version LTS recommandée)
- [Git](https://git-scm.com/)
- [PostgreSQL](https://www.postgresql.org/) (Ou utilisez Docker)

### 2. Cloner le projet

Ouvrez un terminal (PowerShell, Command Prompt ou Terminal) et lancez :

```bash
git clone https://github.com/LouisChabanon/Gadzby.git
cd Gadzby
```

### 3. Installer les dépendances

Installez les librairies nécessaires au fonctionnement du site :

```bash
npm install
```

### 4. Configuration

Créez votre fichier de configuration secret :

1. Copiez le fichier d'exemple :
   ```bash
   cp .env.example .env.local
   # Sur Windows (PowerShell) : copy .env.example .env.local
   ```
2. Ouvrez `.env.local` et vérifiez que `DATABASE_URL` pointe bien vers votre base de données locale.

### 5. Préparer la Base de Données

Cette commande va créer les tables et ajouter des données de test (utilisateurs, produits, promos) :

```bash
npm run db:reset
```
*Répondez "y" (yes) quand on vous demande confirmation.*

### 6. Lancer l'application

Démarrez le serveur de développement :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.
Connectez-vous avec un des comptes de test (ex: Admin généré par le script).
