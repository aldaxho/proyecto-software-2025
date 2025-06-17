'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Bus extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Bus.belongsTo(models.Empresa, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });

      Bus.hasMany(models.Asiento, {
        foreignKey: 'id_bus',
        as: 'asientos'
      });

      Bus.hasMany(models.HorarioSalida, {
        foreignKey: 'id_bus',
        as: 'horarios'
      });
    }
  }
  Bus.init({
    id_empresa: DataTypes.INTEGER,
    placa: DataTypes.STRING,
    modelo: DataTypes.STRING,
    año_modelo: DataTypes.INTEGER,
    capacidad: DataTypes.INTEGER,
    tipo_asiento: DataTypes.STRING,
    comodidades: DataTypes.JSON,
    estado: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Bus',
    tableName: 'buses'
  });
  return Bus;
};