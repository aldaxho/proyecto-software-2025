'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usoterminals', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_boleto: {
        type: Sequelize.INTEGER
      },
      monto_pagado: {
        type: Sequelize.DECIMAL
      },
      validado: {
        type: Sequelize.BOOLEAN
      },
      fecha_validacion: {
        type: Sequelize.DATE
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
    await queryInterface.addConstraint('usoterminals', {
      fields: ['id_boleto'],
      type: 'foreign key',
      name: 'fk_usoterminal_boleto',
      references: {
        table: 'boletos',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('usoterminals');
  }
};