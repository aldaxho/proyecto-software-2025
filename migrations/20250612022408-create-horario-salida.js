'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('horariosalidas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_ruta: {
        type: Sequelize.INTEGER
      },
      id_bus: {
        type: Sequelize.INTEGER
      },
      fecha_salida: {
        type: Sequelize.DATE
      },
      hora_salida: {
        type: Sequelize.TIME
      },
      precio_base: {
        type: Sequelize.DECIMAL
      },
      estado: {
        type: Sequelize.BOOLEAN
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
    await queryInterface.addConstraint('horariosalidas', {
      fields: ['id_ruta'],
      type: 'foreign key',
      name: 'fk_horario_ruta',
      references: {
        table: 'ruta',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('horariosalidas', {
      fields: ['id_bus'],
      type: 'foreign key',
      name: 'fk_horario_bus',
      references: {
        table: 'buses',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('horariosalidas');
  }
};