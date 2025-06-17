'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Empresa extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Empresa.hasMany(models.Usuario, {
        foreignKey: 'id_empresa',
        as: 'usuarios'
      });

      Empresa.hasMany(models.Bus, {
        foreignKey: 'id_empresa',
        as: 'buses'
      });

      Empresa.hasMany(models.Ruta, {
        foreignKey: 'id_empresa',
        as: 'rutas'
      });

      Empresa.hasMany(models.Publicidad, {
        foreignKey: 'id_empresa',
        as: 'publicidades'
      });

      Empresa.hasOne(models.ConfiguracionIa, {
        foreignKey: 'id_empresa',
        as: 'configuracion_ia'
      });
    }
  }
  Empresa.init({
    nombre: DataTypes.STRING,
    nit: DataTypes.STRING,
    contacto: DataTypes.STRING,
    correo: DataTypes.STRING,
    direccion: DataTypes.STRING,
    estado: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Empresa',
    tableName: 'empresas' 
  });
  return Empresa;
};