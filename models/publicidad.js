'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Publicidad extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Publicidad.belongsTo(models.Empresa, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });
    }
  }
  Publicidad.init({
    id_empresa: DataTypes.INTEGER,
    titulo: DataTypes.STRING,
    descripcion: DataTypes.STRING,
    fecha_inicio: DataTypes.DATE,
    fecha_fin: DataTypes.DATE,
    imagen_url: DataTypes.STRING,
    costo: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'Publicidad',
    tableName: 'publicidads'
  });
  return Publicidad;
};