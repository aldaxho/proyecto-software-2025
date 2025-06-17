'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Boleto extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Boleto.belongsTo(models.Pasajero, {
        foreignKey: 'id_pasajero',
        as: 'pasajero'
      });

      Boleto.belongsTo(models.HorarioSalida, {
        foreignKey: 'id_horario',
        as: 'horario'
      });

      Boleto.belongsTo(models.Asiento, {
        foreignKey: 'id_asiento',
        as: 'asiento'
      });

      Boleto.belongsTo(models.Compra, {
        foreignKey: 'id_compra',
        as: 'compra'
      });

      Boleto.hasOne(models.UsoTerminal, {
        foreignKey: 'id_boleto',
        as: 'uso_terminal'
      });
    }
  }
  Boleto.init({
    id_pasajero: DataTypes.INTEGER,
    id_horario: DataTypes.INTEGER,
    id_asiento: DataTypes.INTEGER,
    id_compra: DataTypes.INTEGER,
    precio_final: DataTypes.DECIMAL,
    fecha_compra: DataTypes.DATE,
    codigo_qr: DataTypes.STRING,
    estado: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Boleto',
    tableName: 'boletos'
  });
  return Boleto;
};