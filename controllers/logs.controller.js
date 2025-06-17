const { LogAcceso, Usuario, sequelize } = require('../models'); // Assuming LogAcceso, Usuario are in /models
const { Op } = require('sequelize');

exports.getLogAccesos = async (req, res) => {
  try {
    const { id_usuario, fecha_inicio, fecha_fin } = req.query;
    const whereClause = {};
    const includeOptions = [
      {
        model: Usuario,
        as: 'usuario', // This alias must match your model definition
        attributes: ['id_usuario', 'correo', 'nombre', 'apellido'], // Corrected to id_usuario if that's the PK
      },
    ];

    // Filter by id_usuario
    if (id_usuario) {
      if (isNaN(parseInt(id_usuario, 10))) {
        return res.status(400).json({ message: 'id_usuario debe ser un número.' });
      }
      // Optional: Validate if user exists before adding to where clause
      // const usuarioExistente = await Usuario.findByPk(parseInt(id_usuario, 10));
      // if (!usuarioExistente) {
      //   return res.status(404).json({ message: `Usuario con id ${id_usuario} no encontrado.` });
      // }
      whereClause.id_usuario = parseInt(id_usuario, 10);
    }

    // Filter by date range (applied to LogAcceso model's 'fecha' field)
    if (fecha_inicio && fecha_fin) {
      // Basic validation for date format can be added here
      whereClause.fecha = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin + 'T23:59:59.999Z')], // Include the whole end day
      };
    } else if (fecha_inicio) {
      whereClause.fecha = {
        [Op.gte]: new Date(fecha_inicio),
      };
    } else if (fecha_fin) {
      whereClause.fecha = {
        [Op.lte]: new Date(fecha_fin + 'T23:59:59.999Z'),
      };
    }

    const logs = await LogAcceso.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['fecha', 'DESC']], // Newest logs first
    });

    res.status(200).json(logs);

  } catch (error) {
    console.error('Error al obtener logs de acceso:', error);
    if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    // Add more specific error handling if needed (e.g., for foreign key constraint if user validation is added)
    res.status(500).json({ message: 'Error interno del servidor al obtener los logs.', error: error.message });
  }
};
