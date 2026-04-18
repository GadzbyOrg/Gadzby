# Gadzby

Application web fullstack de gestion pour les associations étudiantes des Arts et Métiers. Vise à remplacer l'ancien système [Borgia](https://github.com/borgia-app).

## Stack

- **Framework** : [Next.js 16](https://nextjs.org/) (App Router)
- **Langage** : TypeScript
- **Base de données** : PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **UI** : Tailwind CSS
- **Auth** : JWT / Bcrypt (custom)
- **Paiements** : Lydia, SumUp, HelloAsso

## Installation (développement)

```bash
git clone https://github.com/GadzbyOrg/Gadzby.git
cd Gadzby
npm install
```

Créez `.env.local` :

```env
DATABASE_URL="postgres://postgres:password@localhost:5432/gadzby"
JWT_SECRET="a-string-secret-at-least-256-bits-long"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CAMPUS_NAME="developpement"
```

Initialisez la base de données et démarrez :

```bash
npx drizzle-kit generate
npm run db:reset
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) et connectez-vous avec un compte de test généré par le seed.

## Commandes utiles

```bash
npm run build          # Build de production
npm run lint           # ESLint
npm test               # Vitest
npx drizzle-kit push   # Appliquer les changements de schéma DB
```

## Documentation

**Administrateur applicatif** — configuration de l'app, moyens de paiement, rôles :
- [Guide administrateur](./docs/ADMIN-GUIDE.md)

**Sysadmin** — déploiement et hébergement :
- [Administration système](./docs/SYSADMIN.md)

**Développeur** — API externe et intégrations paiement :
- [API développeur](./docs/API-DOCS.md)
- [Système de paiement](./docs/PAYMENTS.md)
