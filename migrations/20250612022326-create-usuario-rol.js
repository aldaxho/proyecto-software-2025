'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuario_rols', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_usuario: {
        type: Sequelize.INTEGER
      },
      id_rol: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    await queryInterface.addConstraint('usuario_rols', {
  fields: ['id_usuario'],
  type: 'foreign key',
  name: 'fk_usuario_rol_usuario',
  references: {
    table: 'usuarios',
    field: 'id'
  },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

await queryInterface.addConstraint('usuario_rols', {
  fields: ['id_rol'],
  type: 'foreign key',
  name: 'fk_usuario_rol_rol',
  references: {
    table: 'rols',
    field: 'id'
  },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('usuario_rols');
  }
};