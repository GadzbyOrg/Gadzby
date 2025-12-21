// Run with: npx tsx scripts/seed-products.ts

import { db } from "@/db";
import { shops, productCategories, products } from "@/db/schema";
import { eq } from "drizzle-orm";

async function seedShopProducts(
  shopSlug: string,
  categoriesData: { name: string; products: any[] }[]
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
      const existing = await db.query.products.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.shopId, shop.id), eq(t.name, prodData.name)),
      });

      if (!existing) {
        await db.insert(products).values({
          shopId: shop.id,
          categoryId: category.id,
          ...prodData,
        });
        console.log(`    + Product created: ${prodData.name}`);
      } else {
        console.log(`    = Product exists: ${prodData.name}`);
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
        {
          name: "Meteor Lager",
          price: 130, // 1.30€
          stock: 100,
          allowSelfService: true,
          description: "La classique",
        },
        {
          name: "Meteor Blanche",
          price: 150,
          stock: 50,
          allowSelfService: false,
        },
      ],
    },
    {
      name: "Softs",
      products: [
        {
          name: "Coca Cola",
          price: 80,
          stock: 48,
          allowSelfService: true,
        },
        {
          name: "Ice Tea",
          price: 80,
          stock: 48,
          allowSelfService: true,
        },
      ],
    },
    {
      name: "Snacks",
      products: [
        {
          name: "Snickers",
          price: 100,
          stock: 200,
          allowSelfService: true,
        },
        {
          name: "Chips",
          price: 50,
          stock: 20,
          allowSelfService: true,
        },
      ],
    },
  ]);

  // --- AUBERGE ---
  await seedShopProducts("obrg", [
    {
      name: "Plats",
      products: [
        {
          name: "Burger Frites",
          price: 450,
          stock: 50,
          allowSelfService: true,
        },
        {
          name: "Panini",
          price: 350,
          stock: 30,
          allowSelfService: true,
        },
      ],
    },
    {
        name: "Boissons",
        products: [
          {
            name: "Cannette 33cl",
            price: 100,
            stock: 100,
            allowSelfService: true,
          },
        ],
      },
  ]);

  console.log("✅ Product seeding complete.");
  process.exit(0);
}

main();
