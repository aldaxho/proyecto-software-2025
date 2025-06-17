'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class VerificacionDocumento extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      VerificacionDocumento.belongsTo(models.Usuario, {
        foreignKey: 'id_usuario',
        as: 'usuario'
      });
    }
  }
  VerificacionDocumento.init({
    id_usuario: DataTypes.INTEGER,
    tipo_documento: DataTypes.STRING,
    imagen_documento: DataTypes.STRING,
    resultado_ocr: DataTypes.STRING,
    edad_deducida: DataTypes.INTEGER,
    validado_por_ia: DataTypes.BOOLEAN,
    fecha_verificacion: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'VerificacionDocumento',
    tableName: 'verificaciondocumentos'
  });
  return VerificacionDocumento;
};