'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('verificaciondocumentos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_usuario: {
        type: Sequelize.INTEGER
      },
      tipo_documento: {
        type: Sequelize.STRING
      },
      imagen_documento: {
        type: Sequelize.STRING
      },
      resultado_ocr: {
        type: Sequelize.STRING
      },
      edad_deducida: {
        type: Sequelize.INTEGER
      },
      validado_por_ia: {
        type: Sequelize.BOOLEAN
      },
      fecha_verificacion: {
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
    await queryInterface.addConstraint('verificaciondocumentos', {
      fields: ['id_usuario'],
      type: 'foreign key',
      name:'fk_usuario_verificacion_documento',
      references:{
        table:'usuarios',
        field: 'id'
      },
      onDelete:'SET NULL',
      onUpdate: 'CASCADE'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('verificaciondocumentos');
  }
};