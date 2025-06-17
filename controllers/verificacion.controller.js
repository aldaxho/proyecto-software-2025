const { VerificacionDocumento, Usuario, sequelize } = require('../models'); // Assuming models are in /models
const { Op } = require('sequelize');

exports.getDocumentosValidadosIA = async (req, res) => {
  try {
    const { id_usuario, fecha_inicio, fecha_fin } = req.query;

    const whereClause = {
      validado_por_ia: true, // Always filter by IA validated documents
    };

    const includeOptions = [
      {
        model: Usuario,
        as: 'usuario', // This alias must match your model definition in VerificacionDocumento
        attributes: ['id_usuario', 'correo', 'nombre', 'apellido'], // Assuming 'id_usuario' is the PK for Usuario
      },
    ];

    // Filter by id_usuario
    if (id_usuario) {
      if (isNaN(parseInt(id_usuario, 10))) {
        return res.status(400).json({ message: 'id_usuario debe ser un número.' });
      }
      // Optional: Validate if user exists if desired, though the query will just return empty if not.
      // const usuarioExistente = await Usuario.findByPk(parseInt(id_usuario, 10));
      // if (!usuarioExistente) {
      //   return res.status(404).json({ message: `Usuario con id ${id_usuario} no encontrado.` });
      // }
      whereClause.id_usuario = parseInt(id_usuario, 10);
    }

    // Filter by date range (applied to VerificacionDocumento model's 'fecha_verificacion' field)
    if (fecha_inicio && fecha_fin) {
      whereClause.fecha_verificacion = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin + 'T23:59:59.999Z')],
      };
    } else if (fecha_inicio) {
      whereClause.fecha_verificacion = {
        [Op.gte]: new Date(fecha_inicio),
      };
    } else if (fecha_fin) {
      whereClause.fecha_verificacion = {
        [Op.lte]: new Date(fecha_fin + 'T23:59:59.999Z'),
      };
    }

    const documentosValidados = await VerificacionDocumento.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['fecha_verificacion', 'DESC']], // Newest first
    });

    res.status(200).json(documentosValidados);

  } catch (error) {
    console.error('Error al obtener documentos validados por IA:', error);
    if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    res.status(500).json({ message: 'Error interno del servidor al obtener los documentos.', error: error.message });
  }
};
