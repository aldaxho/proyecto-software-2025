'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UsuarioRol extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
        UsuarioRol.belongsTo(models.Usuario, {
          foreignKey: 'id_usuario',
          as: 'usuario'
        });

        UsuarioRol.belongsTo(models.Rol, {
          foreignKey: 'id_rol',
          as: 'rol'
        });
    }
  }
  UsuarioRol.init({
    id_usuario: DataTypes.INTEGER,
    id_rol: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'UsuarioRol',
    tableName: 'usuario_rols'
  });
  return UsuarioRol;
};