import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Creamos primero los roles
    const superRole = await prisma.rol.create({
      data: {
        name: 'superadmin',
        description: 'Super administrador con acceso total al sistema',
      },
    });

    const adminRole = await prisma.rol.create({
      data: {
        name: 'admin',
        description: 'Administrador con acceso limitado al sistema',
      },
    });

    // Creamos la opción de usuarios que se asignará a ambos roles
    const usersOption = await prisma.option.create({
      data:
      {
        name: 'users',
        description: 'Gestión de usuarios del sistema',
      },
    });

    const rolOption = await prisma.optionRol.createMany({
      data: [
        {
          rolId: superRole.id,
          optionId: usersOption.id
        },
        {
          rolId: adminRole.id,
          optionId: usersOption.id
        }
      ]

    });

    // Creamos el usuario super
    const hashedPassword = await bcrypt.hash('superpass123', 10);

    const superUser = await prisma.user.create({
      data: {
        email: 'super@mail.com',
        name: 'super',
        names: 'Super',
        lastnames: 'Administrator',
        password: hashedPassword,
        rolId: superRole.id,
      },
    });

    console.log('Seeding completado exitosamente');
    console.log('Usuario super creado:', superUser);
    console.log('Roles creados:', { superRole, adminRole });
    console.log('Opciones creadas para ambos roles');

  } catch (error) {
    console.error('Error durante el seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });