'use strict';
const { ConfiguracionIa, Empresa } = require('../models');

// Upsert (Create or Update) an AI Configuration
const upsertConfiguracionIa = async (req, res) => {
  try {
    const {
      id_empresa,
      habilitado,
      precio_minimo,
      precio_maximo,
      usar_modelo_bus,
      usar_festivos,
      usar_datos_climaticos,
      usar_demanda_historial,
    } = req.body;

    if (habilitado === undefined || typeof habilitado !== 'boolean') {
      return res.status(400).json({ message: "El campo 'habilitado' (boolean) es obligatorio." });
    }

    if (precio_minimo !== undefined && typeof precio_minimo !== 'number') {
      return res.status(400).json({ message: "El campo 'precio_minimo' debe ser un número." });
    }

    if (precio_maximo !== undefined && typeof precio_maximo !== 'number') {
      return res.status(400).json({ message: "El campo 'precio_maximo' debe ser un número." });
    }

    if (precio_minimo !== undefined && precio_maximo !== undefined && precio_minimo > precio_maximo) {
      return res.status(400).json({ message: "precio_minimo no puede ser mayor que precio_maximo." });
    }

    const searchCriteria = { id_empresa: id_empresa || null };
    let statusCode = 200;

    if (id_empresa) {
      const empresaExistente = await Empresa.findByPk(id_empresa);
      if (!empresaExistente) {
        return res.status(404).json({ message: `Empresa con id ${id_empresa} no encontrada.` });
      }
    }

    let configuracion = await ConfiguracionIa.findOne({ where: searchCriteria });

    const dataToUpsert = {
      id_empresa: id_empresa || null,
      habilitado,
      precio_minimo,
      precio_maximo,
      usar_modelo_bus,
      usar_festivos,
      usar_datos_climaticos,
      usar_demanda_historial,
    };

    if (configuracion) {
      await configuracion.update(dataToUpsert);
    } else {
      configuracion = await ConfiguracionIa.create(dataToUpsert);
      statusCode = 201;
    }

    res.status(statusCode).json(configuracion);

  } catch (error) {
    console.error('Error en upsertConfiguracionIa:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// Get one
const getConfiguracionIa = async (req, res) => {
  try {
    const { id_empresa_param } = req.params;

    let searchIdEmpresa = null;
    if (id_empresa_param && id_empresa_param.toLowerCase() !== 'global') {
      const parsed = parseInt(id_empresa_param, 10);
      if (isNaN(parsed)) {
        return res.status(400).json({ message: "Identificador de empresa inválido. Use 'global' o un ID numérico." });
      }
      searchIdEmpresa = parsed;
    }

    const configuracion = await ConfiguracionIa.findOne({ where: { id_empresa: searchIdEmpresa } });

    if (!configuracion) {
      return res.status(404).json({ message: 'Configuración de IA no encontrada.' });
    }

    res.status(200).json(configuracion);

  } catch (error) {
    console.error('Error en getConfiguracionIa:', error);
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// Get all
const getAllConfiguracionesIa = async (req, res) => {
  try {
    const configuraciones = await ConfiguracionIa.findAll();
    res.status(200).json(configuraciones);
  } catch (error) {
    console.error('Error en getAllConfiguracionesIa:', error);
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// Placeholder for historial (puedes implementar luego)
const getHistorialPreciosIa = async (req, res) => {
  res.status(200).json({ message: 'Historial de precios de IA (pendiente de implementar)' });
};

// EXPORT
module.exports = {
  upsertConfiguracionIa,
  getConfiguracionIa,
  getAllConfiguracionesIa,
  getHistorialPreciosIa
};
