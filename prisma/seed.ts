import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@audiopins.app' },
    update: {},
    create: {
      email: 'demo@audiopins.app',
      name: 'Demo User',
      hashedPassword,
    },
  });

  console.log(`Created demo user: ${user.email}`);

  // Create sample collection
  const collection = await prisma.collection.upsert({
    where: { id: 'demo-toronto' },
    update: {},
    create: {
      id: 'demo-toronto',
      name: 'Toronto Pins',
      description: 'A collection of interesting spots in Toronto',
      userId: user.id,
      isPublic: true,
      centerLat: 43.6532,
      centerLng: -79.3832,
    },
  });

  console.log(`Created collection: ${collection.name}`);

  // Create sample pins
  const samplePins = [
    {
      title: 'St. Lawrence Market',
      description: 'Historic market with amazing peameal bacon sandwiches',
      lat: 43.6535,
      lng: -79.3714,
      category: 'FOOD' as const,
    },
    {
      title: 'CN Tower',
      description: 'Iconic Toronto landmark with stunning views',
      lat: 43.6426,
      lng: -79.3871,
      category: 'ARCHITECTURE' as const,
    },
    {
      title: 'High Park',
      description: 'Beautiful urban park with trails and a zoo',
      lat: 43.6465,
      lng: -79.4637,
      category: 'NATURE' as const,
    },
  ];

  for (const pinData of samplePins) {
    await prisma.pin.upsert({
      where: {
        id: `seed-${pinData.title.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {},
      create: {
        id: `seed-${pinData.title.toLowerCase().replace(/\s+/g, '-')}`,
        title: pinData.title,
        description: pinData.description,
        lat: pinData.lat,
        lng: pinData.lng,
        category: pinData.category,
        collectionId: collection.id,
        userId: user.id,
      },
    });
  }

  console.log(`Created ${samplePins.length} sample pins`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
