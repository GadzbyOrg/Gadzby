
import { z } from "zod";

export const AVAILABLE_PERMISSIONS = [
    "ADMIN_ACCESS", 
    "MANAGE_USERS", 
    "MANAGE_ROLES", 
    "MANAGE_FAMSS",
    "MANAGE_PAYMENTS",
    "MANAGE_SHOPS", 
    "VIEW_TRANSACTIONS", 
    "CANCEL_TRANSACTION",
    "TOPUP_USER",
    "MANAGE_MANDATS",
];

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
