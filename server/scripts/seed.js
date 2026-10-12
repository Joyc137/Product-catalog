/**
 * Seeds the database with demo users and N products (default 50,000).
 *
 *   npm run seed                 # 50,000 products, drops existing products first
 *   npm run seed -- --count=100000
 *   npm run seed -- --if-empty   # no-op when products already exist (used by docker compose)
 *
 * Products are generated deterministically (seeded PRNG) so every run produces
 * the same catalog, which makes performance numbers reproducible.
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { CATEGORIES } from '../src/constants/categories.js';
import { ROLES } from '../src/constants/roles.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';

const DEFAULT_COUNT = 50_000;
const BATCH_SIZE = 5_000;

const countArg = process.argv.find((a) => a.startsWith('--count='));
const IF_EMPTY = process.argv.includes('--if-empty');
const COUNT = Number(countArg?.split('=')[1] ?? process.env.SEED_COUNT ?? DEFAULT_COUNT);

if (!Number.isInteger(COUNT) || COUNT < 1) {
  console.error('--count must be a positive integer');
  process.exit(1);
}

// mulberry32 — tiny deterministic PRNG
function createRandom(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(42);
const pick = (arr) => arr[Math.floor(random() * arr.length)];
const between = (min, max) => min + random() * (max - min);

// Per-category vocabulary and price band so data looks plausible.
const CATALOG = {
  Electronics: {
    nouns: ['Headphones', 'Smartwatch', 'Bluetooth Speaker', 'Laptop Stand', 'Webcam', 'Power Bank', 'Keyboard', 'Mouse', 'Monitor', 'Earbuds', 'Tablet', 'Router'],
    traits: ['Wireless', 'Noise-Cancelling', 'Portable', 'Ultra-Slim', '4K', 'Fast-Charging', 'Ergonomic', 'Smart'],
    price: [9, 1500],
  },
  Books: {
    nouns: ['Novel', 'Cookbook', 'Biography', 'Field Guide', 'Poetry Collection', 'Textbook', 'Graphic Novel', 'Travel Guide', 'Workbook'],
    traits: ['Illustrated', 'Hardcover', 'Paperback', 'Collector\'s', 'Annotated', 'Bestselling', 'Classic', 'Beginner\'s'],
    price: [5, 80],
  },
  Clothing: {
    nouns: ['T-Shirt', 'Hoodie', 'Jeans', 'Jacket', 'Sneakers', 'Dress', 'Sweater', 'Cap', 'Scarf', 'Shorts'],
    traits: ['Cotton', 'Slim-Fit', 'Oversized', 'Waterproof', 'Organic', 'Vintage', 'Lightweight', 'Thermal'],
    price: [8, 250],
  },
  'Home & Kitchen': {
    nouns: ['Chef Knife', 'Blender', 'Coffee Maker', 'Frying Pan', 'Cutting Board', 'Table Lamp', 'Throw Blanket', 'Storage Jar', 'Kettle', 'Air Fryer'],
    traits: ['Stainless Steel', 'Non-Stick', 'Ceramic', 'Bamboo', 'Compact', 'Premium', 'Cast Iron', 'Minimalist'],
    price: [6, 600],
  },
  'Sports & Outdoors': {
    nouns: ['Yoga Mat', 'Tent', 'Water Bottle', 'Dumbbell Set', 'Hiking Backpack', 'Bike Helmet', 'Running Belt', 'Sleeping Bag', 'Jump Rope'],
    traits: ['Lightweight', 'Insulated', 'Adjustable', 'Foldable', 'All-Weather', 'Pro', 'Trail', 'Compact'],
    price: [7, 900],
  },
  'Toys & Games': {
    nouns: ['Puzzle', 'Board Game', 'Building Blocks', 'Plush Toy', 'RC Car', 'Card Game', 'Action Figure', 'Kite', 'Drawing Kit'],
    traits: ['Educational', 'Classic', 'Family', 'Wooden', 'Glow-in-the-Dark', 'Deluxe', 'Mini', 'Creative'],
    price: [4, 200],
  },
  Beauty: {
    nouns: ['Face Serum', 'Lip Balm', 'Shampoo', 'Moisturizer', 'Hair Dryer', 'Perfume', 'Sunscreen', 'Face Mask', 'Nail Kit'],
    traits: ['Hydrating', 'Vegan', 'Fragrance-Free', 'Organic', 'Travel-Size', 'Professional', 'Gentle', 'Revitalizing'],
    price: [3, 180],
  },
  Grocery: {
    nouns: ['Olive Oil', 'Coffee Beans', 'Green Tea', 'Dark Chocolate', 'Honey', 'Granola', 'Pasta', 'Spice Mix', 'Almonds'],
    traits: ['Organic', 'Fair-Trade', 'Extra Virgin', 'Raw', 'Gluten-Free', 'Artisan', 'Single-Origin', 'Family-Size'],
    price: [2, 60],
  },
  Automotive: {
    nouns: ['Car Charger', 'Dash Cam', 'Tire Inflator', 'Seat Cover', 'Floor Mats', 'Jump Starter', 'Phone Mount', 'Wiper Blades'],
    traits: ['Heavy-Duty', 'Universal', 'All-Season', 'Compact', 'Smart', 'Premium', 'Quick-Install', 'Rugged'],
    price: [8, 400],
  },
  Health: {
    nouns: ['Vitamin D', 'Protein Powder', 'First Aid Kit', 'Thermometer', 'Massage Gun', 'Fish Oil', 'Blood Pressure Monitor', 'Electrolyte Mix'],
    traits: ['Daily', 'Clinical-Grade', 'Sugar-Free', 'Advanced', 'Natural', 'Extra-Strength', 'Digital', 'Plant-Based'],
    price: [4, 300],
  },
};

const BRANDS = ['Acme', 'Nova', 'Zenith', 'Orbit', 'Lumen', 'Atlas', 'Pioneer', 'Vertex', 'Nimbus', 'Aurora', 'Summit', 'Echo', 'Harbor', 'Ember', 'Cobalt'];
const COLORS = ['Black', 'White', 'Navy', 'Forest Green', 'Crimson', 'Slate Grey', 'Sand', 'Teal', 'Charcoal', 'Ivory'];

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Uneven category mix (relative weights) so filters and analytics look realistic.
const CATEGORY_WEIGHTS = {
  Electronics: 18,
  Clothing: 16,
  'Home & Kitchen': 14,
  Books: 12,
  'Sports & Outdoors': 10,
  Beauty: 8,
  'Toys & Games': 7,
  Grocery: 6,
  Health: 5,
  Automotive: 4,
};
const TOTAL_WEIGHT = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);

function pickCategory() {
  let r = random() * TOTAL_WEIGHT;
  for (const category of CATEGORIES) {
    r -= CATEGORY_WEIGHTS[category];
    if (r < 0) return category;
  }
  return CATEGORIES[0];
}

function buildProduct(i, now) {
  const category = pickCategory();
  const { nouns, traits, price } = CATALOG[category];
  const brand = pick(BRANDS);
  const trait = pick(traits);
  const noun = pick(nouns);
  const color = pick(COLORS);

  // Skew prices toward the low end of each band, like a real catalog.
  const [min, max] = price;
  const unitPrice = Math.round((min + (max - min) * random() ** 2.2) * 100) / 100;

  // ~8% out of stock, otherwise 1–500.
  const stock = random() < 0.08 ? 0 : Math.floor(between(1, 500));
  const createdAt = new Date(now - Math.floor(random() * ONE_YEAR_MS));

  return {
    name: `${brand} ${trait} ${noun}`,
    description: `The ${brand} ${trait.toLowerCase()} ${noun.toLowerCase()} in ${color.toLowerCase()}. A dependable pick in ${category.toLowerCase()}, built for everyday use and backed by a 1-year warranty.`,
    category,
    price: unitPrice,
    stock,
    sku: `SKU-${String(i + 1).padStart(7, '0')}`,
    rating: Math.round(between(2.5, 5) * 10) / 10,
    imageUrl: '',
    createdAt,
    updatedAt: createdAt,
  };
}

async function seedUsers() {
  const users = [
    {
      name: 'Admin',
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      role: ROLES.ADMIN,
    },
    {
      name: 'Demo User',
      email: process.env.SEED_USER_EMAIL,
      password: process.env.SEED_USER_PASSWORD,
      role: ROLES.USER,
    },
  ].filter((u) => u.email && u.password);

  if (users.length === 0) {
    console.warn('No SEED_*_EMAIL / SEED_*_PASSWORD set — skipping demo users.');
    return [];
  }

  const created = [];
  for (const data of users) {
    // Upsert by email so re-running the seed resets the demo accounts.
    let user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user) user = new User(data);
    else Object.assign(user, data);
    await user.save(); // goes through the pre-save hook → password is hashed
    created.push(user);
    console.log(`  ✓ ${data.role.padEnd(5)} ${data.email}`);
  }
  return created;
}

async function seedProducts(adminId) {
  // Drop instead of deleteMany: faster, and lets us build indexes after the bulk load.
  const exists = await mongoose.connection.db.listCollections({ name: Product.collection.name }).hasNext();
  if (exists) await Product.collection.drop();

  const now = Date.now();
  const started = Date.now();

  for (let offset = 0; offset < COUNT; offset += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, COUNT - offset);
    const batch = Array.from({ length: size }, (_, k) => ({
      ...buildProduct(offset + k, now),
      ...(adminId && { createdBy: adminId }),
    }));
    // Raw driver insert skips per-document Mongoose overhead; data is generated
    // by us and already matches the schema.
    await Product.collection.insertMany(batch, { ordered: false });
    process.stdout.write(`\r  inserted ${offset + size}/${COUNT}`);
  }
  process.stdout.write('\n');

  console.log('  building indexes…');
  await Product.syncIndexes();
  console.log(`  ✓ ${COUNT} products in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

async function main() {
  console.log(`Connecting to MongoDB…`);
  await connectDB(env.mongoUri);
  await User.syncIndexes();

  if (IF_EMPTY && (await Product.estimatedDocumentCount()) > 0) {
    console.log('Products already exist and --if-empty was passed — nothing to do.');
    return;
  }

  console.log('Seeding users');
  const users = await seedUsers();
  const admin = users.find((u) => u.role === ROLES.ADMIN);

  console.log(`Seeding ${COUNT} products`);
  await seedProducts(admin?._id);
}

main()
  .then(() => console.log('Done.'))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
