'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Asiento extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Asiento.belongsTo(models.Bus, {
        foreignKey: 'id_bus',
        as: 'bus'
      });

      Asiento.hasMany(models.Boleto, {
        foreignKey: 'id_asiento',
        as: 'boletos'
      });
    }
  }
  Asiento.init({
    id_bus: DataTypes.INTEGER,
    numero_asiento: DataTypes.INTEGER,
    tipo: DataTypes.STRING,
    estado: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Asiento',
    tableName: 'asientos'
  });
  return Asiento;
};