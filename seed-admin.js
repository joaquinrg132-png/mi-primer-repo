const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminUsername = 'admin';
  const adminPassword = 'Rosales45'; // En producción esto debería estar hasheado con bcrypt

  // Buscar si ya existe
  const existing = await prisma.user.findUnique({
    where: { username: adminUsername }
  });

  if (existing) {
    console.log('El usuario admin ya existe. Actualizando contraseña y rol...');
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: adminPassword,
        role: 'ADMIN',
        name: 'Administrador'
      }
    });
  } else {
    console.log('Creando usuario admin inicial...');
    await prisma.user.create({
      data: {
        username: adminUsername,
        password: adminPassword,
        role: 'ADMIN',
        name: 'Administrador',
        bio: 'Cuenta de administración del sistema.',
        coverImage: 'https://images.unsplash.com/photo-1707605929285-8f4b0086ff54?q=80&w=2070&auto=format&fit=crop',
        image: 'https://api.dicebear.com/7.x/notionists/svg?seed=admin&backgroundColor=ffdfbf'
      }
    });
  }

  console.log('¡Usuario admin listo!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
