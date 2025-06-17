'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Insertar roles necesarios (solo si no existen)
    const roles = [
      'AdministradorTerminal',
      'AdministradorEmpresa',
      'Cajero',
      'Cliente',
      'SupervisorAcceso',
      'VerificadorDocumento'
    ];

    for (const nombre of roles) {
      const [exist] = await queryInterface.sequelize.query(
        `SELECT id FROM rols WHERE nombre = '${nombre}' LIMIT 1`
      );
      if (!exist.length) {
        await queryInterface.bulkInsert('rols', [{
          nombre,
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      }
    }

    // 2. Crear superusuario si no existe
    const [adminExist] = await queryInterface.sequelize.query(
      `SELECT id FROM usuarios WHERE correo = 'admin@terminal.com' LIMIT 1`
    );

    let userId;

    if (!adminExist.length) {
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const [usuarioInsert] = await queryInterface.bulkInsert('usuarios', [{
        nombre: 'Admin',
        apellido: 'Terminal',
        correo: 'admin@terminal.com',
        contraseña: hashedPassword,
        tipo_documento: 'CI',
        numero_documento: '00000001',
        fecha_nacimiento: new Date(1985, 0, 1),
        id_empresa: null,
        estado: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }], { returning: true });

      userId = usuarioInsert?.id || 1;
    } else {
      userId = adminExist[0].id;
    }

    // 3. Asignar rol AdministradorTerminal si aún no está asignado
    const [rolData] = await queryInterface.sequelize.query(
      `SELECT id FROM rols WHERE nombre = 'AdministradorTerminal' LIMIT 1`
    );
    const rolId = rolData[0]?.id;

    const [relExist] = await queryInterface.sequelize.query(
      `SELECT * FROM usuario_rols WHERE id_usuario = ${userId} AND id_rol = ${rolId} LIMIT 1`
    );

    if (!relExist.length) {
      await queryInterface.bulkInsert('usuario_rols', [{
        id_usuario: userId,
        id_rol: rolId,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('usuario_rols', null, {});
    await queryInterface.bulkDelete('usuarios', { correo: 'admin@terminal.com' });
    await queryInterface.bulkDelete('rols', {
      nombre: [
        'AdministradorTerminal',
        'AdministradorEmpresa',
        'Cajero',
        'Cliente',
        'SupervisorAcceso',
        'VerificadorDocumento'
      ]
    });
  }
};
