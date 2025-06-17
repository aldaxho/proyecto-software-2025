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
      // New association for who made the adjustment
      HistorialPrecio.belongsTo(models.Usuario, {
        foreignKey: 'id_usuario_ajuste',
        as: 'usuarioQueAjusto' // User who made the manual adjustment
      });
    }
  }
  HistorialPrecio.init({
    id_horario: DataTypes.INTEGER,
    precio_predicho: DataTypes.DECIMAL,
    precio_final_usado: DataTypes.DECIMAL,
    fecha: DataTypes.DATE, // This field was called 'fecha_prediccion' in ia.controller for HistorialPrecio. Keeping 'fecha' as per model.
    tipo_ajuste: { // New field
      type: DataTypes.ENUM('IA', 'MANUAL_ADMIN_EMPRESA', 'MANUAL_ADMIN_TERMINAL', 'OFERTA'),
      allowNull: false,
      defaultValue: 'IA'
    },
    id_usuario_ajuste: { // New field
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios', // Table name for Usuario model (verify if different, e.g., 'Usuarios')
        key: 'id_usuario'  // Primary key of Usuario model (verify if 'id')
      }
    }
  }, {
    sequelize,
    modelName: 'HistorialPrecio',
    tableName: 'historialprecios' 
  });
  return HistorialPrecio;
};