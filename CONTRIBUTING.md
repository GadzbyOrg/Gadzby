# 🤝 Contribuer à Gadzby

> **Tu n'as pas besoin d'être un expert pour contribuer.** Une faute de frappe corrigée, un bouton mieux centré, un message d'erreur plus clair… chaque petite amélioration compte et est la bienvenue !

---

## Git

Tu n'as pas besoin d'être familié avec git pour participer, il suffit simplemenent de suivre le workflow ci-dessous.

![git](/docs/assets/git.png)

*[xkcd #1597](https://xkcd.com/1597/) — "Git")*


---

## 🗺️ Le workflow Git de Gadzby

Gadzby utilise **Gitflow**, un modèle de branches structuré qui permet à plusieurs personnes de travailler en parallèle sans se marcher dessus.

### Les branches principales

| Branche     | Rôle                                                              |
|-------------|-------------------------------------------------------------------|
| `main`      | Le code de **production**. Stable. Sacré. On ne pousse jamais directement dessus. |
| `develop`   | La branche d'**intégration**. C'est ici que toutes les features se retrouvent avant d'aller en prod. |

### Les branches de travail

| Type              | Convention de nommage          | Exemple                          |
|-------------------|-------------------------------|----------------------------------|
| Nouvelle feature  | `feature/<description>`       | `feature/ajout-filtre-produit`   |
| Correction de bug | `fix/<description>`           | `fix/solde-negatif-affichage`    |
| Hotfix urgent     | `hotfix/<description>`        | `hotfix/crash-login-mobile`      |

### Le cycle de vie d'une contribution

Voici les grandes étapes, dans l'ordre :

1. **Tu forkes** le dépôt sur GitHub → tu obtiens ta propre copie du projet
2. **Tu clones** ton fork sur ton ordinateur et tu configures le remote `upstream`
3. **Tu crées une branche** depuis `develop` : `git checkout -b feature/mon-truc`
4. **Tu codes** et tu fais tes commits au fur et à mesure
5. **Tu pousses** ta branche sur ton fork : `git push origin feature/mon-truc`
6. **Tu ouvres une Pull Request** sur GitHub, de ta branche vers `develop` du projet principal
7. **La PR est relue**, commentée si besoin, puis fusionnée dans `develop`
8. 🎉 **Ta contribution fait partie du projet !**

---

## 🍴 Étape 1 — Forker le dépôt

Un **fork** est une copie personnelle du projet dans ton propre compte GitHub. Tu peux y faire n'importe quoi sans risquer de casser quoi que ce soit sur le vrai projet.

1. Rends-toi sur la page GitHub du projet : [github.com/LouisChabanon/Gadzby](https://github.com/LouisChabanon/Gadzby)
2. Clique sur le bouton **"Fork"** en haut à droite
3. GitHub crée une copie dans ton compte : `github.com/<ton-pseudo>/Gadzby`

---

## 💻 Étape 2 — Cloner et configurer ton fork

```bash
# Clone ton fork (remplace <ton-pseudo> par ton nom d'utilisateur GitHub)
git clone https://github.com/<ton-pseudo>/Gadzby.git
cd Gadzby

# Ajoute le dépôt original comme "upstream" pour rester à jour
git remote add upstream https://github.com/LouisChabanon/Gadzby.git

# Vérifie que tout est bien configuré
git remote -v
# origin    https://github.com/<ton-pseudo>/Gadzby.git (fetch)
# origin    https://github.com/<ton-pseudo>/Gadzby.git (push)
# upstream  https://github.com/GadzbyOrg/Gadzby.git (fetch)
# upstream  https://github.com/GadzbyOrg/Gadzby.git (push)
```

---

## 🌿 Étape 3 — Créer ta branche de travail

**Ne travaille jamais directement sur `develop`.** Crée toujours une branche dédiée :

```bash
# Assure-toi d'être à jour avec le projet original
git fetch upstream
git checkout develop
git merge upstream/develop

# Crée ta branche
git checkout -b feature/ma-super-amelioration
```

---

## 🔧 Étape 4 — Installer et lancer le projet

Suis les instructions d'installation détaillées dans le [README](./README.md).

En résumé :

```bash
npm install
# Crée ton fichier .env.local (voir README)
npm run db:reset
npm run dev
```

---

## ✅ Étape 5 — Coder, commit, pousser

### Quelques règles de bonne conduite

- **Un commit = une intention claire.** Préfère plusieurs petits commits à un seul gros commit fourre-tout. (pas comme moi)
- **Des messages de commit en français ou en anglais**, mais cohérents et explicites. 

```bash
# ✅ Bon exemple
git commit -m "fix: corrige l'affichage du solde négatif en rouge"

# ❌ Mauvais exemple  
git commit -m "correction"
```

### Convention de préfixes (optionnel mais apprécié)

| Préfixe    | Quand l'utiliser                              |
|------------|-----------------------------------------------|
| `feat:`    | Nouvelle fonctionnalité                        |
| `fix:`     | Correction de bug                              |
| `docs:`    | Modifications de documentation uniquement      |
| `style:`   | Mise en forme (espaces, virgules…) sans impact fonctionnel |
| `refactor:`| Refactoring sans changement de comportement    |
| `chore:`   | Maintenance (mise à jour de dépendances, etc.) |

### Pousser ta branche

```bash
git push origin feature/ma-super-amelioration
```

---

## 🔁 Étape 6 — Ouvrir une Pull Request

Avant de créer une PR, assure-toi que ton code compile correctement et que les tests passent :

```bash
npm run build
npm run test
```

1. Rends-toi sur la page GitHub de **ton fork**
2. GitHub affichera une bannière *"Compare & pull request"* — clique dessus
3. Vérifie que la PR pointe bien vers `develop` (et pas `main`)
4. Remplis la description :
   - Qu'est-ce que tu as changé ?
   - Pourquoi ?
   - Comment tester tes modifications ?
5. Soumets la PR !

---

## 🔄 Rester à jour avec le projet

Au fil du temps, `develop` avancera. Pour éviter les conflits, mets régulièrement ton fork à jour :

```bash
git fetch upstream
git checkout develop
git merge upstream/develop

# Si tu travailles sur une feature en cours :
git checkout feature/ma-super-amelioration
git rebase develop
```

---

## 💡 Idées de contributions pour débuter

Tu ne sais pas par où commencer ? Voici quelques idées de contributions accessibles :

- 🐛 **Signaler un bug** : ouvre une [Issue](https://github.com/LouisChabanon/Gadzby/issues) avec une description claire
- 📝 **Améliorer la documentation** : des trucs pas clair, des étape manquante dans le README…
- 🎨 **Corriger un problème d'affichage** : un élément mal aligné, qui s'affiche mal sur mobile, une couleur moche etc...
- 💬 **Améliorer les messages** : erreurs plus claires, textes plus lisibles, fautes d'orthographes
- 🧪 **Ajouter des tests** : chaque test qui manque est une contribution potentielle

---

## 🤖 Utiliser un LLM (Gemini, ChatGPT, Claude…) pour contribuer

Les outils d'IA générative sont très utiles, surtout quand on débute. Voici comment les utiliser de manière responsable dans le cadre de Gadzby.

### ✅ Ce qui est encouragé

- **Comprendre du code inconnu** : *"Explique-moi ce que fait cette fonction"*
- **Déboguer** : coller un message d'erreur et demander une piste
- **Rédiger un premier jet** de code ou de message de commit, que tu relis et comprends ensuite
- **Améliorer la qualité** : demander une review de ton code avant de le soumettre
- **Prototyper l'interface** : on est ingés pas des designers, on peut donc utiliser des outils pour nous aider à créer des interfaces

### ⚠️ Ce qu'il faut éviter

- **Copier-coller du code généré sans le lire.** Si tu ne comprends pas ce que tu soumets, tu auras du mal à corriger certains bugs ou à améliorer le code par la suite.

En cas de doute sur un passage généré automatiquement, dis-le dans ta PR — c'est apprécié d'être honnête et ça permet une meilleure review.

Si tu utilises un assistant en ligne de commande comme [Claude Code](https://claude.ai/code), le fichier `CLAUDE.md` à la racine du projet lui fournit automatiquement le contexte de l'architecture et des conventions de Gadzby.

Gadzby a d'ailleurs été développé en grande partie avec [Google Antigravity](https://antigravity.google/) (un éditeur de texte avec Gemini intégré). Ça m'as permis d'aller vite et loins tout seul mais ça laisse quelques cicatrices dans le code :

| Problème hérité | Ce que tu peux faire |
|---|---|
| Composants UI custom en pagaille avec peu de réutilisation | Ajouter des composants uniques |
| Types `any` utilisés partout | Typer proprement avec TypeScript |
| Commentaires en anglais assez verbeux | Uniformiser |
| Tests inexistants sur beaucoups de fonctions | En ajouter ! |

> Ces "dettes techniques" font partie de l'histoire du projet. Les corriger progressivement est exactement le genre de contribution qui est la bienvenue ici, même si ça ne change rien pour l'utilisateur final.

---

## ❓ Des questions ?

N'hésite pas à ouvrir une [Issue](https://github.com/LouisChabanon/Gadzby/issues) pour poser tes questions. Il n'y a pas de question bête.

Tu peux aussi me contacter directement (+33 7 68 64 65 81)

---

*Merci de contribuer à Gadzby ! Chaque contribution, même minuscule, aide à faire de cet outil quelque chose de mieux pour tout le monde*
