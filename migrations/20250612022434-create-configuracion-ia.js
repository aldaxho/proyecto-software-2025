'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('configuracionia', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER
      },
      habilitado: {
        type: Sequelize.BOOLEAN
      },
      precio_minimo: {
        type: Sequelize.DECIMAL
      },
      precio_maximo: {
        type: Sequelize.DECIMAL
      },
      usar_modelo_bus: {
        type: Sequelize.BOOLEAN
      },
      usar_festivos: {
        type: Sequelize.BOOLEAN
      },
      usar_datos_climaticos: {
        type: Sequelize.BOOLEAN
      },
      usar_demanda_historial: {
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
    await queryInterface.addConstraint('configuracionia', {
      fields: ['id_empresa'],
      type: 'foreign key',
      name: 'fk_configuarionia_empresa',
      references: {
        table: 'empresas',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('configuracionia');
  }
};