/**
 * Crea Product/Price su Stripe e aggiorna moduli.stripe_price_id + stampa env vars.
 * Uso: npx tsx scripts/stripe-setup-products.ts
 */
import 'dotenv/config';
import Stripe from 'stripe';
import { prisma } from '../lib/db';
import { STRIPE_CATALOG } from '../lib/stripe-prices';

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    console.error('Imposta STRIPE_SECRET_KEY nel file .env');
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
  const envLines: string[] = [];

  for (const item of STRIPE_CATALOG) {
    const product = await stripe.products.create({
      name: item.name,
      description: item.description,
      metadata: item.metadata,
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: Math.round(item.amountEur * 100),
      recurring: { interval: 'month' },
      metadata: item.metadata,
    });

    console.log(`✓ ${item.name} → ${price.id}`);

    if (item.moduleCode) {
      await prisma.moduli.updateMany({
        where: { code: item.moduleCode },
        data: { stripe_price_id: price.id },
      });
      const envKey = `STRIPE_PRICE_MODULE_${item.moduleCode.toUpperCase()}`;
      envLines.push(`${envKey}=${price.id}`);
    } else if (item.metadata.product_type === 'user_bundle') {
      envLines.push(`STRIPE_PRICE_BUNDLE_USER=${price.id}`);
    } else if (item.metadata.product_type === 'cat_base') {
      envLines.push(`STRIPE_PRICE_CAT_BASE=${price.id}`);
    } else if (item.metadata.product_type === 'cat_extra') {
      envLines.push(`STRIPE_PRICE_CAT_EXTRA=${price.id}`);
    }
  }

  console.log('\n--- Aggiungi al .env ---');
  for (const line of envLines) {
    console.log(line);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
