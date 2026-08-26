// Run with: npx tsx scripts/seed-products.ts

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { productCategories, products, productVariants, shops } from "@/db/schema";

type ProductVariantSeedData = {
  name: string;
  quantity: number;
  price?: number;
};

type ProductSeedData = {
  name: string;
  price: number;
  stock: number;
  allowSelfService?: boolean;
  description?: string;
  unit?: string;
  variants?: ProductVariantSeedData[];
};

async function seedShopProducts(
  shopSlug: string,
  categoriesData: { name: string; products: ProductSeedData[] }[]
) {
  const shop = await db.query.shops.findFirst({
    where: eq(shops.slug, shopSlug),
  });

  if (!shop) {
    console.log(`⚠️ Shop '${shopSlug}' not found. Skipping.`);
    return;
  }

  console.log(`📦 Seeding products for ${shop.name} (${shopSlug})...`);

  for (const catData of categoriesData) {
    // 1. Create or get Category
    let category = await db.query.productCategories.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.shopId, shop.id), eq(t.name, catData.name)),
    });

    if (!category) {
      const [newCat] = await db
        .insert(productCategories)
        .values({
          shopId: shop.id,
          name: catData.name,
        })
        .returning();
      category = newCat;
      console.log(`  + Category created: ${catData.name}`);
    } else {
      console.log(`  = Category exists: ${catData.name}`);
    }

    // 2. Create Products
    for (const prodData of catData.products) {
      const { variants, ...productData } = prodData;

      const existing = await db.query.products.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.shopId, shop.id), eq(t.name, prodData.name)),
      });

      let productId = existing?.id;

      if (!existing) {
        const [newProduct] = await db
          .insert(products)
          .values({
            shopId: shop.id,
            categoryId: category.id,
            ...productData,
          })
          .returning();
        productId = newProduct.id;
        console.log(`    + Product created: ${prodData.name}`);
      } else {
        console.log(`    = Product exists: ${prodData.name}`);
      }

      // 3. Create Variants (e.g. Pinte / Demi)
      if (variants && variants.length > 0 && productId) {
        for (const variant of variants) {
          const existingVariant = await db.query.productVariants.findFirst({
            where: (t, { and, eq }) =>
              and(eq(t.productId, productId!), eq(t.name, variant.name)),
          });

          if (!existingVariant) {
            await db.insert(productVariants).values({
              productId: productId,
              name: variant.name,
              quantity: variant.quantity,
              price: variant.price,
            });
            console.log(
              `      + Variant created: ${prodData.name} - ${variant.name}`
            );
          }
        }
      }
    }
  }
}

async function main() {
  console.log("🌱 Starting product seed...");

  // --- FOY'SS ---
  await seedShopProducts("foyer", [
    {
      name: "Bières Pression",
      products: [
        { name: "Meteor Lager", price: 130, stock: 100, allowSelfService: true, description: "La classique", variants: [
          { name: "Pinte (50cl)", quantity: 1, price: 130 },
          { name: "Demi (25cl)", quantity: 0.5, price: 80 },
        ] },
        { name: "Meteor Blanche", price: 150, stock: 50, allowSelfService: false, variants: [
          { name: "Pinte (50cl)", quantity: 1, price: 150 },
          { name: "Demi (25cl)", quantity: 0.5, price: 90 },
        ] },
        { name: "Kronenbourg", price: 120, stock: 100, allowSelfService: true },
        { name: "Triple Karmeliet", price: 180, stock: 60, allowSelfService: true },
        { name: "Limonade", price: 60, stock: 200, allowSelfService: true },
      ],
    },
    {
       name: "Sirops",
       products: [
           { name: "Sirop Grenadine", price: 20, stock: 500, allowSelfService: true, unit: "dose" },
           { name: "Sirop Menthe", price: 20, stock: 500, allowSelfService: true, unit: "dose" },
           { name: "Diabolo (Limonade + Sirop)", price: 80, stock: 100, allowSelfService: true },
       ]
    },
    {
      name: "Softs",
      products: [
        { name: "Coca Cola", price: 80, stock: 48, allowSelfService: true },
        { name: "Ice Tea", price: 80, stock: 48, allowSelfService: true },
      ],
    },
    {
      name: "Snacks",
      products: [
        { name: "Snickers", price: 100, stock: 200, allowSelfService: true },
        { name: "Chips", price: 50, stock: 20, allowSelfService: true },
      ],
    },
  ]);

  // --- BR ---
  await seedShopProducts("br", [
      {
          name: "Confiserie",
          products: [
              { name: "Haribo Dragibus", price: 150, stock: 50, allowSelfService: true },
              { name: "Kinder Bueno", price: 120, stock: 60, allowSelfService: true },
              { name: "Mars", price: 100, stock: 40, allowSelfService: true },
          ]
      },
      {
          name: "Boissons",
          products: [
              { name: "Coca Cola", price: 100, stock: 50, allowSelfService: true },
              { name: "Oasis Tropical", price: 100, stock: 50, allowSelfService: true },
          ]
      },
      {
          name: "Snacks",
          products: [
              { name: "Chips Lay's Nature", price: 150, stock: 30, allowSelfService: true },
              { name: "Chips Lay's Barbecue", price: 150, stock: 30, allowSelfService: true },
          ]
      }
  ]);

  // --- AUBERGE ---
  await seedShopProducts("obrg", [
    {
      name: "Plats",
      products: [
        { name: "Burger Frites", price: 450, stock: 50, allowSelfService: true },
        { name: "Panini 3 Fromages", price: 350, stock: 30, allowSelfService: true },
        { name: "Wrap Poulet", price: 400, stock: 30, allowSelfService: true },
      ],
    },
    {
        name: "Bières Canettes",
        products: [
          { name: "8.6 Original", price: 150, stock: 100, allowSelfService: true },
          { name: "Bavaria 8.6", price: 150, stock: 50, allowSelfService: true },
        ],
      },
    {
        name: "Boissons",
        products: [
          { name: "Cannette 33cl", price: 100, stock: 100, allowSelfService: true },
        ],
      },
  ]);

  console.log("✅ Product seeding complete.");
  process.exit(0);
}

main();
