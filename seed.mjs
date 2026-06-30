import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({});

async function main() {
  // Clear existing
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Categories
  const catCarnes = await prisma.category.create({ data: { name: 'Carnes y Aves' } });
  const catAccesorios = await prisma.category.create({ data: { name: 'Accesorios Mascotas' } });

  // Users
  const user = await prisma.user.create({
    data: {
      email: 'cotizador@empresa.com',
      password: 'password123',
      name: 'Joaquín García',
      role: 'EDITOR'
    }
  });

  // Products
  await prisma.product.createMany({
    data: [
      {
        name: 'Patas de Pollo Deshidratadas 500g',
        categoryId: catCarnes.id,
        version: 3,
        updatedBy: user.id
      },
      {
        name: 'Pechuga de Pavo en Cubos 1kg',
        categoryId: catCarnes.id,
        version: 1,
        updatedBy: user.id
      },
      {
        name: 'Correa Reflectante para Perro - PetSmart',
        categoryId: catAccesorios.id,
        version: 2,
        updatedBy: user.id
      }
    ]
  });

  console.log('Seed exitoso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
