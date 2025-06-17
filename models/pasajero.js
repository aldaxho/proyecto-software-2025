'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pasajero extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Pasajero.hasMany(models.Boleto, {
        foreignKey: 'id_pasajero',
        as: 'boletos'
      });
    }
  }
  Pasajero.init({
    nombre: DataTypes.STRING,
    apellido: DataTypes.STRING,
    tipo_documento: DataTypes.STRING,
    numero_documento: DataTypes.STRING,
    fecha_nacimiento: DataTypes.DATE,
    foto: DataTypes.STRING,
    documento_imagen_url: DataTypes.STRING,
    validado_por_ia: DataTypes.BOOLEAN,
    edad_deducida: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Pasajero',
    tableName: 'pasajeros'
  });
  return Pasajero;
};