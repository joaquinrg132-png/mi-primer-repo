import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quotesys.com' },
    update: {
      password: 'admin', // En texto plano por simplicidad temporal
      role: 'ADMIN'
    },
    create: {
      email: 'admin@quotesys.com',
      name: 'Administrador Maestro',
      password: 'admin',
      role: 'ADMIN'
    },
  })
  console.log('Admin user created:', admin)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
