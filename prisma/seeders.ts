import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Creamos primero los roles
    const superRole = await prisma.rol.create({
      data: {
        name: 'superadministrador',
        description: 'Super administrador con acceso total al sistema',
      },
    });

    const adminRole = await prisma.rol.create({
      data: {
        name: 'adminstrador',
        description: 'Administrador con acceso limitado sistema',
      },
    });
    
    const clientRole = await prisma.rol.create({
      data: {
        name: 'cliente',
        description: 'Cliente con acceso limitado a un prefix',
      },
    });

    const agentRole = await prisma.rol.create({
      data: {
        name: 'agente',
        description: 'Agente con acceso limitado a un prefix',
      },
    });

    const viwerRole = await prisma.rol.create({
      data: {
        name: 'espectador',
        description: 'Espectador con acceso limitado a un prefix',
      },
    });

    // Creamos las opciónes que se asignará a los roles
    const usersOption = await prisma.option.create({
      data:
      {
        name: 'users',
        description: 'Gestión de usuarios del sistema',
      },
    });

    // puede editar el nombre de las carpetas
    const folderCreate = await prisma.option.create({
      data:
      {
        name: 'folder_create',
        description: 'Crear carpetas',
      },
    });

    // puede editar el nombre de las carpetas
    const folderEdit = await prisma.option.create({
      data:
      {
        name: 'folder_edit',
        description: 'Editar el nombre de las carpetas',
      },
    });

    // puede eliminar las carpetas
    const folderDelete = await prisma.option.create({
      data:
      {
        name: 'folder_delete',
        description: 'Eliminar las carpetas',
      },
    });

    // puede editar el nombre de los archivos
    const fileEdit = await prisma.option.create({
      data:
      {
        name: 'file_edit',
        description: 'Editar el nombre de los archivos',
      },
    });

    // puede eliminar una carpetas
    const fileDelete = await prisma.option.create({
      data:
      {
        name: 'file_delete',
        description: 'Eliminar los archivos',
      },
    });

    // Compartir la url los archivos
    const fileShare = await prisma.option.create({
      data:
      {
        name: 'file_share',
        description: 'Compartir la url los archivos',
      },
    });

    // Descargar los archivos
    const fileDownload = await prisma.option.create({
      data:
      {
        name: 'file_download',
        description: 'Descargar los archivos',
      },
    });

    // Descargar los archivos
    const fileUpload = await prisma.option.create({
      data:
      {
        name: 'file_upload',
        description: 'Subir los archivos',
      },
    });

    const rolOption = await prisma.optionRol.createMany({
      data: [
        {
          rolId: superRole.id,
          optionId: usersOption.id
        },        
        {
          rolId: superRole.id,
          optionId: folderCreate.id
        },
        {
          rolId: superRole.id,
          optionId: folderEdit.id
        },
        {
          rolId: superRole.id,
          optionId: folderDelete.id
        },
        {
          rolId: superRole.id,
          optionId: fileEdit.id
        },
        {
          rolId: superRole.id,
          optionId: fileDelete.id
        },
        {
          rolId: superRole.id,
          optionId: fileShare.id
        },
        {
          rolId: superRole.id,
          optionId: fileDownload.id
        },
        {
          rolId: superRole.id,
          optionId: fileUpload.id
        },


        {
          rolId: adminRole.id,
          optionId: usersOption.id
        },
        {
          rolId: adminRole.id,
          optionId: folderCreate.id
        },
        {
          rolId: adminRole.id,
          optionId: folderEdit.id
        },
        {
          rolId: adminRole.id,
          optionId: folderDelete.id
        },
        {
          rolId: adminRole.id,
          optionId: fileEdit.id
        },
        {
          rolId: adminRole.id,
          optionId: fileDelete.id
        },
        {
          rolId: adminRole.id,
          optionId: fileShare.id
        },
        {
          rolId: adminRole.id,
          optionId: fileDownload.id
        },        
        {
          rolId: adminRole.id,
          optionId: fileUpload.id
        },


        {
          rolId: clientRole.id,
          optionId: folderCreate.id
        },
        {
          rolId: clientRole.id,
          optionId: folderEdit.id
        },
        {
          rolId: clientRole.id,
          optionId: folderDelete.id
        },
        {
          rolId: clientRole.id,
          optionId: fileEdit.id
        },
        {
          rolId: clientRole.id,
          optionId: fileDelete.id
        },
        {
          rolId: clientRole.id,
          optionId: fileShare.id
        },
        {
          rolId: clientRole.id,
          optionId: fileDownload.id
        },
        {
          rolId: clientRole.id,
          optionId: fileUpload.id
        },

        {
          rolId: agentRole.id,
          optionId: fileShare.id
        },
        {
          rolId: agentRole.id,
          optionId: fileDownload.id
        },
        {
          rolId: agentRole.id,
          optionId: fileUpload.id
        },

       
        {
          rolId: viwerRole.id,
          optionId: fileShare.id
        },
        {
          rolId: viwerRole.id,
          optionId: fileDownload.id
        },

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