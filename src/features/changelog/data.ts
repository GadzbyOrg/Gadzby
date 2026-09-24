export type ChangeKind = "feature" | "improvement" | "fix";

export interface ChangelogEntry {
	kind: ChangeKind;
	text: string;
}

export interface Release {
	version: string;
	/** YYYY-MM-DD */
	date: string;
	title?: string;
	changes: readonly ChangelogEntry[];
}

export function compareVersions(a: string, b: string): number {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

/** Plus récente en premier. À compléter à chaque release (le test vérifie la version de package.json). */
export const CHANGELOG: readonly Release[] = [
	{
		version: "1.7.3",
		date: "2026-09-22",
		changes: [
			{
				kind: "improvement",
				text: "Les messages d'erreur indiquent maintenant la vraie raison d'un échec au lieu d'un message générique.",
			},
			{
				kind: "fix",
				text: "Couleurs de texte corrigées sur le thème clair (textes illisibles dans certains menus et tableaux).",
			},
		],
	},
	{
		version: "1.7.2",
		date: "2026-09-16",
		changes: [
			{
				kind: "feature",
				text: "Option pour masquer les noms et photos des utilisateurs dans la recherche de la page de connexion.",
			},
			{ kind: "fix", text: "Affichage cohérent des événements publics." },
		],
	},
	{
		version: "1.7.1",
		date: "2026-08-26",
		changes: [
			{
				kind: "improvement",
				text: "Bouton pour choisir entre dépense libre et quantité lors d'une vente.",
			},
			{ kind: "fix", text: "Corrections d'affichage diverses." },
		],
	},
	{
		version: "1.7.0",
		date: "2026-08-26",
		changes: [
			{
				kind: "feature",
				text: "Catalogue des shops : consultez les produits et les prix de chaque boquette.",
			},
			{ kind: "improvement", text: "Refonte du panneau d'administration." },
			{ kind: "fix", text: "Correction de textes erronés." },
		],
	},
	{
		version: "1.6.5",
		date: "2026-07-23",
		changes: [
			{
				kind: "feature",
				text: "Deux nouveaux graphiques sur le tableau de bord.",
			},
			{ kind: "feature", text: "Nouveaux tris des produits dans les shops." },
			{
				kind: "improvement",
				text: "Les cartes du tableau de bord renvoient vers la page correspondante.",
			},
			{
				kind: "improvement",
				text: "Après connexion, retour automatique sur la page demandée.",
			},
			{
				kind: "improvement",
				text: "Confirmation avant la suppression d'une dépense et avant un débucquage de masse.",
			},
			{
				kind: "improvement",
				text: "La recherche d'utilisateur conserve la saisie en cours.",
			},
			{
				kind: "fix",
				text: "Erreurs d'arrondi corrigées sur les montants et les rechargements.",
			},
			{
				kind: "fix",
				text: "Contrôle de permission renforcé sur la suppression définitive d'un utilisateur.",
			},
		],
	},
	{
		version: "1.6.0",
		date: "2026-05-04",
		changes: [
			{
				kind: "feature",
				text: "Page d'administration dédiée pour chaque utilisateur.",
			},
			{
				kind: "improvement",
				text: "Moyens de paiement traduits en français dans l'historique.",
			},
			{
				kind: "improvement",
				text: "Recherche d'utilisateur dès le premier caractère, avec les pseudos les plus proches en premier.",
			},
			{
				kind: "fix",
				text: "Statistiques de dépenses et graphiques de l'accueil corrigés.",
			},
			{
				kind: "fix",
				text: "Affichage mobile de l'administration des utilisateurs.",
			},
		],
	},
	{
		version: "1.5.5",
		date: "2026-04-28",
		changes: [
			{
				kind: "feature",
				text: "Possibilité de modifier le montant d'un rechargement.",
			},
			{
				kind: "improvement",
				text: "Tableau des transactions enrichi : émetteur, portefeuilles de fam'ss et export CSV plus lisible.",
			},
			{ kind: "improvement", text: "Formulaire de rechargement amélioré." },
			{ kind: "fix", text: "Fiabilisation des paiements Lydia." },
		],
	},
	{
		version: "1.5.4",
		date: "2026-04-24",
		changes: [
			{
				kind: "feature",
				text: "Saisie d'une quantité personnalisée sur la page de vente.",
			},
			{ kind: "improvement", text: "Compatibilité avec iOS 14 et plus." },
			{
				kind: "fix",
				text: "Plus de zoom automatique sur les champs de saisie sur mobile.",
			},
			{
				kind: "fix",
				text: "Un membre ne peut plus être ajouté deux fois à une fam'ss.",
			},
			{
				kind: "fix",
				text: "Il est de nouveau possible de se sélectionner soi-même dans les shops.",
			},
		],
	},
	{
		version: "1.5.2",
		date: "2026-04-19",
		changes: [
			{
				kind: "improvement",
				text: "Interface des moyens de paiement simplifiée.",
			},
			{
				kind: "fix",
				text: "Clignotement de la recherche d'utilisateur corrigé.",
			},
		],
	},
	{
		version: "1.5.1",
		date: "2026-04-19",
		changes: [
			{
				kind: "fix",
				text: "Espacements et barre de navigation mobile corrigés pour les utilisateurs non-admin.",
			},
		],
	},
	{
		version: "1.5.0",
		date: "2026-04-18",
		changes: [
			{
				kind: "feature",
				text: "Nouveau système de paiement en ligne (HelloAsso et Lydia).",
			},
			{ kind: "improvement", text: "Barre de navigation mobile repensée." },
			{
				kind: "improvement",
				text: "Sélecteur de prom'ss amélioré et résultats de recherche triés par prom'ss.",
			},
			{
				kind: "improvement",
				text: "Meilleurs messages d'erreur dans les shops.",
			},
			{
				kind: "fix",
				text: "Les paiements restés en attente sont désormais annulés automatiquement.",
			},
		],
	},
	{
		version: "1.4.0",
		date: "2026-04-06",
		changes: [
			{
				kind: "feature",
				text: "Thèmes de couleurs : choisissez votre apparence dans « Mon Profil ».",
			},
			{
				kind: "feature",
				text: "Nouveaux sélecteurs de dates et listes déroulantes dans toute l'application.",
			},
			{
				kind: "improvement",
				text: "Contact par email ou WhatsApp et signalement de bug intégré depuis le pied de page.",
			},
			{
				kind: "fix",
				text: "Format des montants uniformisé dans les graphiques.",
			},
		],
	},
	{
		version: "1.3.1",
		date: "2026-04-05",
		changes: [
			{ kind: "improvement", text: "Prise en charge des images SVG." },
			{
				kind: "fix",
				text: "Corrections du chargement des images et des redirections.",
			},
		],
	},
	{
		version: "1.3.0",
		date: "2026-04-04",
		changes: [
			{ kind: "feature", text: "Il est possible de quitter une fam'ss." },
			{
				kind: "improvement",
				text: "Catégorie des produits affichée dans les transactions et les exports.",
			},
			{
				kind: "improvement",
				text: "Graphique des dépenses par shop amélioré.",
			},
			{
				kind: "fix",
				text: "Solde restant du client correctement affiché côté shop.",
			},
			{
				kind: "fix",
				text: "Les noms de fam'ss avec caractères spéciaux fonctionnent dans les liens.",
			},
			{ kind: "fix", text: "Calcul des dépenses mensuelles corrigé." },
		],
	},
	{
		version: "1.2.1",
		date: "2026-04-02",
		changes: [
			{
				kind: "improvement",
				text: "Recherche de client unifiée dans les shops.",
			},
		],
	},
	{
		version: "1.2.0",
		date: "2026-04-02",
		changes: [
			{
				kind: "feature",
				text: "Statistiques de ventes par catégorie et nouveaux graphiques sur le tableau de bord.",
			},
			{
				kind: "feature",
				text: "Message d'accueil configurable sur la page de connexion.",
			},
			{
				kind: "fix",
				text: "Validation des emails et des champs utilisateur plus stricte.",
			},
			{ kind: "fix", text: "Recherche d'utilisateur corrigée." },
		],
	},
	{
		version: "1.1.1",
		date: "2026-03-30",
		changes: [
			{
				kind: "fix",
				text: "Import de produits dans un shop de nouveau accessible aux gestionnaires.",
			},
		],
	},
	{
		version: "1.1.0",
		date: "2026-03-30",
		changes: [
			{
				kind: "feature",
				text: "API publique (utilisateurs, shops, produits, transactions, fam'ss) avec gestion des clés d'API.",
			},
			{ kind: "improvement", text: "Ajustements de l'interface mobile." },
			{ kind: "fix", text: "Code de tabagn'ss KIN ajouté." },
		],
	},
	{
		version: "1.0.0",
		date: "2026-03-25",
		title: "Lancement",
		changes: [
			{
				kind: "feature",
				text: "Gestion des boquettes : produits, catégories, stocks, inventaires et statistiques.",
			},
			{
				kind: "feature",
				text: "Vente en libre-service avec déconnexion automatique après achat.",
			},
			{
				kind: "feature",
				text: "Événements avec prix et marges personnalisés.",
			},
			{ kind: "feature", text: "Fam'ss et portefeuilles partagés." },
			{
				kind: "feature",
				text: "Rechargement en ligne via Lydia, SumUp et HelloAsso.",
			},
			{
				kind: "feature",
				text: "Rôles et permissions, administration des utilisateurs et import Excel.",
			},
			{
				kind: "feature",
				text: "Application installable sur mobile, avec navigation dédiée.",
			},
		],
	},
];
