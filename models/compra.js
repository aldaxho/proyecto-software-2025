'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Compra extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Compra.belongsTo(models.Usuario, {
        foreignKey: 'id_usuario',
        as: 'usuario'
      });

      Compra.hasMany(models.Boleto, {
        foreignKey: 'id_compra',
        as: 'boletos'
      });
    }
  }
  Compra.init({
    id_usuario: DataTypes.INTEGER,
    fecha: DataTypes.DATE,
    total_pagado: DataTypes.DECIMAL,
    metodo_pago: DataTypes.STRING,
    estado: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Compra',
    tableName: 'compras' 
  });
  return Compra;
};