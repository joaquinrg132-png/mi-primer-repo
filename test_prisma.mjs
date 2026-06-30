import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const u = await prisma.user.findUnique({ where: { email: 'admin@quotesys.com' } })
  console.log('User password is:', u?.password)
}
main().finally(() => prisma.$disconnect())
