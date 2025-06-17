'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Relación: Usuario pertenece a una Empresa
      Usuario.belongsTo(models.Empresa, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });

      // Relación: Usuario tiene muchos roles (muchos a muchos con tabla intermedia UsuarioRol)
      Usuario.belongsToMany(models.Rol, {
        through: models.UsuarioRol,
        foreignKey: 'id_usuario',
        otherKey: 'id_rol',
        as: 'roles'
      });

      // Relación: Usuario tiene muchas Compras
      Usuario.hasMany(models.Compra, {
        foreignKey: 'id_usuario',
        as: 'compras'
      });

      // Relación: Usuario tiene muchas verificaciones de documentos
      Usuario.hasMany(models.VerificacionDocumento, {
        foreignKey: 'id_usuario',
        as: 'verificaciones'
      });

      // Relación: Usuario tiene muchos logs de acceso
      Usuario.hasMany(models.LogAcceso, {
        foreignKey: 'id_usuario',
        as: 'logs'
      });
    }
  }
  Usuario.init({
    nombre: DataTypes.STRING,
    apellido: DataTypes.STRING,
    correo: DataTypes.STRING,
    contraseña: DataTypes.STRING,
    foto_perfil: DataTypes.STRING,
    tipo_documento: DataTypes.STRING,
    numero_documento: DataTypes.STRING,
    fecha_nacimiento: DataTypes.DATE,
    id_empresa: DataTypes.INTEGER,
    estado: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Usuario',
    tableName: 'usuarios'
  });
  return Usuario;
};