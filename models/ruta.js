'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Ruta extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Ruta.belongsTo(models.Empresa, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });

      Ruta.hasMany(models.HorarioSalida, {
        foreignKey: 'id_ruta',
        as: 'horarios'
      });
    }
  }
  Ruta.init({
    id_empresa: DataTypes.INTEGER,
    origen: DataTypes.STRING,
    destino: DataTypes.STRING,
    tiempo_estimado: DataTypes.TIME,
    estado: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Ruta',
    tableName: 'ruta'
  });
  return Ruta;
};