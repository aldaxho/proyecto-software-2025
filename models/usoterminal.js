'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UsoTerminal extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UsoTerminal.belongsTo(models.Boleto, {
        foreignKey: 'id_boleto',
        as: 'boleto'
      });
    }
  }
  UsoTerminal.init({
    id_boleto: DataTypes.INTEGER,
    monto_pagado: DataTypes.DECIMAL,
    validado: DataTypes.BOOLEAN,
    fecha_validacion: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'UsoTerminal',
     tableName: 'usoterminals'
  });
  return UsoTerminal;
};