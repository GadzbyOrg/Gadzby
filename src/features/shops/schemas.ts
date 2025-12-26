import { z } from "zod";

export const getShopBySlugSchema = z.object({
  slug: z.string(),
});

export const searchUsersSchema = z.object({
  query: z.string().min(2, "La recherche doit contenir au moins 2 caractères"),
});

export const getUserFamssSchema = z.object({
  userId: z.string().optional(),
});

export const processSaleSchema = z.object({
  shopSlug: z.string(),
  targetUserId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().min(1),
    })
  ),
  paymentSource: z.enum(["PERSONAL", "FAMILY"]).default("PERSONAL"),
  famsId: z.string().optional(),
});

export const getShopTransactionsSchema = z.object({
  slug: z.string(), // Shop Identifier
  page: z.number().default(1),
  limit: z.number().default(50),
  search: z.string().optional().default(""),
  type: z.string().default("ALL"),
  sort: z.string().default("DATE_DESC"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  eventId: z.string().optional(),
});

export const processSelfServicePurchaseSchema = z.object({
  shopSlug: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().min(1),
    })
  ),
  paymentSource: z.enum(["PERSONAL", "FAMILY"]).default("PERSONAL"),
  famsId: z.string().optional(),
});

export const deleteProductSchema = z.object({
  shopSlug: z.string(),
  productId: z.string(),
});

export const updateShopSchema = z.object({
  slug: z.string(),
  data: z.object({
    description: z.string().optional(),
    isSelfServiceEnabled: z.boolean().optional(),
    permissions: z.any().optional(), // Careful with ANY, but schemas might be complex
    defaultMargin: z.number().optional(),
  }),
});
