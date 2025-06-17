'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class HorarioSalida extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      HorarioSalida.belongsTo(models.Ruta, {
        foreignKey: 'id_ruta',
        as: 'ruta'
      });

      HorarioSalida.belongsTo(models.Bus, {
        foreignKey: 'id_bus',
        as: 'bus'
      });

      HorarioSalida.hasMany(models.Boleto, {
        foreignKey: 'id_horario',
        as: 'boletos'
      });

      HorarioSalida.hasMany(models.HistorialPrecio, {
        foreignKey: 'id_horario',
        as: 'historial_precios'
      });
    }
  }
  HorarioSalida.init({
    id_ruta: DataTypes.INTEGER,
    id_bus: DataTypes.INTEGER,
    fecha_salida: DataTypes.DATE,
    hora_salida: DataTypes.TIME,
    precio_base: DataTypes.DECIMAL, // This will be the final selling price
    estado: DataTypes.BOOLEAN,
    precio_sugerido_ia: { // New field
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    precio_final_fue_ajustado_manual: { // New field
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'HorarioSalida',
    tableName: 'horariosalidas' 
  });
  return HorarioSalida;
};