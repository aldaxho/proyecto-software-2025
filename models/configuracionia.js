'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ConfiguracionIa extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ConfiguracionIa.belongsTo(models.Empresa, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });
    }
  }
  ConfiguracionIa.init({
    id_empresa: DataTypes.INTEGER,
    habilitado: DataTypes.BOOLEAN,
    precio_minimo: DataTypes.DECIMAL,
    precio_maximo: DataTypes.DECIMAL,
    usar_modelo_bus: DataTypes.BOOLEAN,
    usar_festivos: DataTypes.BOOLEAN,
    usar_datos_climaticos: DataTypes.BOOLEAN,
    usar_demanda_historial: DataTypes.BOOLEAN,
    rutas_config_json: { // Nuevo campo
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ConfiguracionIa',
    tableName: 'configuracionia' 
  });
  return ConfiguracionIa;
};