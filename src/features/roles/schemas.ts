
import { z } from "zod";

export const AVAILABLE_PERMISSIONS = [
    "ADMIN_ACCESS", 
    "MANAGE_USERS", 
    "MANAGE_ROLES", 
    "MANAGE_FAMSS",
    "CREATE_FAMSS",
    "MANAGE_PAYMENTS",
    "MANAGE_SHOPS", 
    "VIEW_TRANSACTIONS", 
    "CANCEL_TRANSACTION",
    "TOPUP_USER",
    "MANAGE_MANDATS",
];

export const PERMISSIONS_META: Record<string, { label: string, description: string }> = {
    "ADMIN_ACCESS": { label: "Accès global", description: "Accès administrateur complet et sans restriction à toutes les fonctionnalités." },
    "MANAGE_USERS": { label: "Gérer les utilisateurs", description: "Créer, modifier, désactiver et superviser les utilisateurs de l'application." },
    "MANAGE_ROLES": { label: "Gérer les rôles", description: "Créer, configurer et attribuer des rôles et leurs permissions." },
    "MANAGE_FAMSS": { label: "Gérer les Fam'ss", description: "Accès administratif aux Fam'ss." },
    "CREATE_FAMSS": { label: "Créer une Fam'ss", description: "autorise les utilisateurs à créer une nouvelle Fam'ss." },
    "MANAGE_PAYMENTS": { label: "Gérer les paiements", description: "Superviser le système de paiement global." },
    "MANAGE_SHOPS": { label: "Gérer les boutiques", description: "Créer, modifier et supprimer des boutiques, catégories et produits." },
    "VIEW_TRANSACTIONS": { label: "Voir les transactions", description: "Accès en lecture à l'historique complet de toutes les transactions." },
    "CANCEL_TRANSACTION": { label: "Annuler des transactions", description: "Permet d'annuler une transaction financière existante." },
    "TOPUP_USER": { label: "Recharger un compte", description: "Permet de recréditer le solde d'un utilisateur." },
    "MANAGE_MANDATS": { label: "Gérer les mandats", description: "Gérer les mandats." }
};

export const roleSchema = z.object({
    name: z.string().min(1, "Nom requis"),
    permissions: z.array(z.string()).default([]),
});

export const updateRoleSchema = roleSchema.extend({
    id: z.string().min(1, "ID requis"),
});

export const deleteRoleSchema = z.object({
    id: z.string().min(1, "ID requis"),
});
