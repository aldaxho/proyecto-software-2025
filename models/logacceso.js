'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LogAcceso extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LogAcceso.belongsTo(models.Usuario, {
        foreignKey: 'id_usuario',
        as: 'usuario'
      });
    }
  }
  LogAcceso.init({
    id_usuario: DataTypes.INTEGER,
    fecha: DataTypes.DATE,
    ip: DataTypes.STRING,
    dispositivo: DataTypes.STRING,
    modulo: DataTypes.STRING,
    descripcion: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'LogAcceso',
    tableName: 'logaccesos' 
  });
  return LogAcceso;
};