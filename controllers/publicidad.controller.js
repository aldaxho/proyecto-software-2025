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
