'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class HistorialPrecio extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      HistorialPrecio.belongsTo(models.HorarioSalida, {
        foreignKey: 'id_horario',
        as: 'horario'
      });
    }
  }
  HistorialPrecio.init({
    id_horario: DataTypes.INTEGER,
    precio_predicho: DataTypes.DECIMAL,
    precio_final_usado: DataTypes.DECIMAL,
    fecha: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'HistorialPrecio',
    tableName: 'historialprecios' 
  });
  return HistorialPrecio;
};