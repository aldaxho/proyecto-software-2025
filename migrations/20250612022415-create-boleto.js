'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('boletos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_pasajero: {
        type: Sequelize.INTEGER
      },
      id_horario: {
        type: Sequelize.INTEGER
      },
      id_asiento: {
        type: Sequelize.INTEGER
      },
      id_compra: {
        type: Sequelize.INTEGER
      },
      precio_final: {
        type: Sequelize.DECIMAL
      },
      fecha_compra: {
        type: Sequelize.DATE
      },
      codigo_qr: {
        type: Sequelize.STRING
      },
      estado: {
        type: Sequelize.STRING
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
    await queryInterface.addConstraint('boletos', {
      fields: ['id_pasajero'],
      type: 'foreign key',
      name: 'fk_pasajero_boleto',
      references: {
        table: 'pasajeros',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('boletos', {
      fields: ['id_horario'],
      type: 'foreign key',
      name: 'fk_horario_boleto',
      references: {
        table: 'horariosalidas',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('boletos', {
      fields: ['id_asiento'],
      type: 'foreign key',
      name: 'fk_asiento_boleto',
      references: {
        table: 'asientos',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('boletos', {
      fields: ['id_compra'],
      type: 'foreign key',
      name: 'fk_compra_boleto',
      references: {
        table: 'compras',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('boletos');
  }
};