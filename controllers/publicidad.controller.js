const { Publicidad, Empresa } = require('../models'); // Assuming Publicidad and Empresa are in /models
const { Op } = require('sequelize');

const validEstados = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];

// Update the approval status of an advertisement
exports.updateEstadoPublicidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_aprobacion } = req.body;

    if (!estado_aprobacion) {
      return res.status(400).json({ message: "El campo 'estado_aprobacion' es obligatorio." });
    }

    if (!validEstados.includes(estado_aprobacion.toUpperCase())) {
      return res.status(400).json({ message: `Estado de aprobación inválido. Valores permitidos: ${validEstados.join(', ')}` });
    }

    const publicidad = await Publicidad.findByPk(id);

    if (!publicidad) {
      return res.status(404).json({ message: 'Publicidad no encontrada.' });
    }

    publicidad.estado_aprobacion = estado_aprobacion.toUpperCase();
    await publicidad.save();

    res.status(200).json(publicidad);

  } catch (error) {
    console.error('Error en updateEstadoPublicidad:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// --- Funciones para AdministradorEmpresa ---

// Create a new advertisement campaign for the company
exports.createPublicidadEmpresa = async (req, res) => {
  try {
    const id_empresa_admin = req.user && req.user.id_empresa;

    if (!id_empresa_admin) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada a su usuario.' });
    }

    const {
      titulo,
      descripcion,
      fecha_inicio, // YYYY-MM-DD
      fecha_fin,    // YYYY-MM-DD
      imagen_url,   // Optional
      costo,        // Number
    } = req.body;

    // Validations
    if (!titulo || !descripcion || !fecha_inicio || !fecha_fin || costo === undefined) {
      return res.status(400).json({ message: 'Campos obligatorios: titulo, descripcion, fecha_inicio, fecha_fin, costo.' });
    }

    const startDate = new Date(fecha_inicio);
    const endDate = new Date(fecha_fin);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Formato de fecha inválido para fecha_inicio o fecha_fin.' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ message: 'La fecha_fin debe ser posterior a la fecha_inicio.' });
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    if (startDate < today) {
        return res.status(400).json({ message: 'La fecha_inicio no puede ser en el pasado.' });
    }


    if (typeof costo !== 'number' || costo < 0) { // Costo puede ser 0 si la empresa lo decide
      return res.status(400).json({ message: 'El costo debe ser un número no negativo.' });
    }

    const nuevaPublicidad = await Publicidad.create({
      id_empresa: id_empresa_admin,
      titulo,
      descripcion,
      fecha_inicio,
      fecha_fin,
      imagen_url: imagen_url || null, // Handle optional imagen_url
      costo,
      // estado_aprobacion will default to 'PENDIENTE' as per model definition
    });

    res.status(201).json(nuevaPublicidad);

  } catch (error) {
    console.error('Error en createPublicidadEmpresa:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor al crear la publicidad.', error: error.message });
  }
};

// List advertisements for the company, optionally filtered by estado_aprobacion
exports.listarPublicidadesEmpresa = async (req, res) => {
  try {
    const id_empresa_admin = req.user && req.user.id_empresa;

    if (!id_empresa_admin) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada a su usuario.' });
    }

    const { estado } = req.query; // Filter by estado_aprobacion using 'estado' query param
    const whereClause = {
      id_empresa: id_empresa_admin,
    };

    if (estado) {
      if (!validEstados.includes(estado.toUpperCase())) { // validEstados defined globally in this file
        return res.status(400).json({ message: `Valor de 'estado' inválido. Valores permitidos: ${validEstados.join(', ')}` });
      }
      whereClause.estado_aprobacion = estado.toUpperCase();
    }

    const publicidades = await Publicidad.findAll({
      where: whereClause,
      order: [['fecha_inicio', 'DESC']],
      // No need to include Empresa model as we are already filtering by id_empresa
    });

    res.status(200).json(publicidades);

  } catch (error) {
    console.error('Error en listarPublicidadesEmpresa:', error);
    res.status(500).json({ message: 'Error interno del servidor al listar las publicidades.', error: error.message });
  }
};

// Update an advertisement campaign for the company
exports.updatePublicidadEmpresa = async (req, res) => {
  try {
    const id_empresa_admin = req.user && req.user.id_empresa;
    const { id_publicidad } = req.params;

    if (!id_empresa_admin) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada a su usuario.' });
    }
    if (isNaN(parseInt(id_publicidad, 10))) {
      return res.status(400).json({ message: 'El ID de la publicidad debe ser un número.' });
    }

    const publicidad = await Publicidad.findOne({
      where: {
        id_publicidad: parseInt(id_publicidad, 10), // Assuming PK is id_publicidad
        id_empresa: id_empresa_admin,
      },
    });

    if (!publicidad) {
      return res.status(404).json({ message: 'Publicidad no encontrada o no pertenece a esta empresa.' });
    }

    // Business logic: Only allow updates if status is 'PENDIENTE'
    if (publicidad.estado_aprobacion !== 'PENDIENTE') {
      return res.status(403).json({ message: `No se puede modificar una publicidad que está ${publicidad.estado_aprobacion.toLowerCase()}.` });
    }

    const {
      titulo,
      descripcion,
      fecha_inicio,
      fecha_fin,
      imagen_url,
      costo,
    } = req.body;

    // Validations for updatable fields
    if (fecha_inicio || fecha_fin) {
        const currentStartDate = new Date(publicidad.fecha_inicio);
        const currentEndDate = new Date(publicidad.fecha_fin);

        const newStartDateStr = fecha_inicio || publicidad.fecha_inicio.toISOString().split('T')[0];
        const newEndDateStr = fecha_fin || publicidad.fecha_fin.toISOString().split('T')[0];

        const newStartDate = new Date(newStartDateStr);
        const newEndDate = new Date(newEndDateStr);

        if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) {
            return res.status(400).json({ message: 'Formato de fecha inválido.' });
        }
        if (newEndDate <= newStartDate) {
            return res.status(400).json({ message: 'La fecha_fin debe ser posterior a la fecha_inicio.' });
        }
        const today = new Date();
        today.setHours(0,0,0,0);
        // Allow start date to remain in past if it was already, but not to be set to past if it was future.
        // Or if it's a new start date, it cannot be in the past.
        if (newStartDate.getTime() !== currentStartDate.getTime() && newStartDate < today) {
             return res.status(400).json({ message: 'La nueva fecha_inicio no puede ser en el pasado.' });
        }
        publicidad.fecha_inicio = newStartDateStr;
        publicidad.fecha_fin = newEndDateStr;
    }

    if (costo !== undefined) {
        if (typeof costo !== 'number' || costo < 0) {
          return res.status(400).json({ message: 'El costo debe ser un número no negativo.' });
        }
        publicidad.costo = costo;
    }

    if (titulo !== undefined) publicidad.titulo = titulo;
    if (descripcion !== undefined) publicidad.descripcion = descripcion;
    if (imagen_url !== undefined) publicidad.imagen_url = imagen_url || null;


    await publicidad.save();
    res.status(200).json(publicidad);

  } catch (error) {
    console.error('Error en updatePublicidadEmpresa:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor al actualizar la publicidad.', error: error.message });
  }
};

// Delete an advertisement campaign for the company
exports.deletePublicidadEmpresa = async (req, res) => {
  try {
    const id_empresa_admin = req.user && req.user.id_empresa;
    const { id_publicidad } = req.params;

    if (!id_empresa_admin) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada a su usuario.' });
    }
    if (isNaN(parseInt(id_publicidad, 10))) {
      return res.status(400).json({ message: 'El ID de la publicidad debe ser un número.' });
    }

    const publicidad = await Publicidad.findOne({
      where: {
        id_publicidad: parseInt(id_publicidad, 10), // Assuming PK is id_publicidad
        id_empresa: id_empresa_admin,
      },
    });

    if (!publicidad) {
      return res.status(404).json({ message: 'Publicidad no encontrada o no pertenece a esta empresa.' });
    }

    // Business logic: Only allow deletion if status is 'PENDIENTE'
    if (publicidad.estado_aprobacion !== 'PENDIENTE') {
      return res.status(403).json({ message: `No se puede eliminar una publicidad que está ${publicidad.estado_aprobacion.toLowerCase()}.` });
    }

    await publicidad.destroy();
    res.status(200).json({ message: 'Publicidad eliminada exitosamente.' });
    // Or res.status(204).send();

  } catch (error) {
    console.error('Error en deletePublicidadEmpresa:', error);
    res.status(500).json({ message: 'Error interno del servidor al eliminar la publicidad.', error: error.message });
  }
};

// Get all advertisements, optionally filtered by estado_aprobacion and id_empresa
exports.getAllPublicidades = async (req, res) => {
  try {
    const { estado, id_empresa } = req.query; // Using 'estado' as query param for estado_aprobacion
    const whereClause = {};

    if (estado) {
      if (!validEstados.includes(estado.toUpperCase())) {
        return res.status(400).json({ message: `Valor de 'estado' inválido. Valores permitidos: ${validEstados.join(', ')}` });
      }
      whereClause.estado_aprobacion = estado.toUpperCase();
    }

    if (id_empresa) {
      if (isNaN(parseInt(id_empresa, 10))) {
        return res.status(400).json({ message: 'id_empresa debe ser un número.' });
      }
      whereClause.id_empresa = parseInt(id_empresa, 10);
    }

    const publicidades = await Publicidad.findAll({
      where: whereClause,
      include: [{ model: Empresa, as: 'empresa', attributes: ['id_empresa', 'nombre'] }], // Include basic company info
      order: [['fecha_inicio', 'DESC']], // Example order
    });

    res.status(200).json(publicidades);

  } catch (error) {
    console.error('Error en getAllPublicidades:', error);
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};
