const { Boleto, HorarioSalida, Ruta, Bus, Pasajero, Compra, sequelize } = require('../models');
const { Op } = require('sequelize');

// List sold tickets for the company
exports.listarBoletosVendidosEmpresa = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }

    const { id_ruta, id_horario, fecha_desde, fecha_hasta } = req.query;
    const whereClauseBoleto = {
      // Consider filtering by Boleto.estado if applicable, e.g., 'VENDIDO'
      // estado: 'VENDIDO'
    };
    let whereClauseHorario = {}; // For HorarioSalida model, if date filtering is on fecha_salida
    let whereClauseRuta = {}; // For Ruta model

    const includeOptions = [
      {
        model: HorarioSalida,
        as: 'horario',
        required: true, // INNER JOIN: Only boletos with a horario
        include: [
          {
            model: Ruta,
            as: 'ruta',
            where: { ...whereClauseRuta, id_empresa: id_empresa_from_token },
            required: true, // INNER JOIN: Only horarios with a ruta of this empresa
            attributes: ['id_ruta', 'nombre_ruta', 'origen', 'destino'],
          },
          {
            model: Bus,
            as: 'bus',
            required: true,
            attributes: ['id_bus', 'placa', 'modelo', 'tipo_asiento'],
          },
        ],
        attributes: ['id_horario_salida', 'fecha_salida', 'hora_salida'], // PK is id_horario_salida in HorarioSalida model
      },
      {
        model: Pasajero,
        as: 'pasajero',
        attributes: ['id_pasajero', 'nombre', 'apellido', 'tipo_documento', 'numero_documento'],
        required: false, // LEFT JOIN, show boleto even if pasajero somehow is not linked
      },
      {
        model: Compra,
        as: 'compra',
        attributes: ['id_compra', 'fecha_compra', 'metodo_pago', 'total_compra'], // Assuming 'total_compra' if want to show transaction total
        required: false, // LEFT JOIN
      }
    ];

    // --- Apply Filters ---
    if (id_ruta) {
      if (isNaN(parseInt(id_ruta, 10))) {
        return res.status(400).json({ message: 'id_ruta debe ser un número.' });
      }
      // This filter is now directly applied in the includeOptions for Ruta
      includeOptions[0].include[0].where.id_ruta = parseInt(id_ruta, 10);
    }

    if (id_horario) {
      if (isNaN(parseInt(id_horario, 10))) {
        return res.status(400).json({ message: 'id_horario debe ser un número.' });
      }
      // Filter directly on Boleto's foreign key to HorarioSalida
      whereClauseBoleto.id_horario = parseInt(id_horario, 10);
    }

    // Date filtering: Apply to Boleto.fecha_compra for this example
    // Could also be HorarioSalida.fecha_salida by populating whereClauseHorario
    if (fecha_desde && fecha_hasta) {
      whereClauseBoleto.fecha_compra = { // Assuming Boleto has fecha_compra
        [Op.between]: [new Date(fecha_desde), new Date(fecha_hasta + 'T23:59:59.999Z')],
      };
    } else if (fecha_desde) {
      whereClauseBoleto.fecha_compra = { [Op.gte]: new Date(fecha_desde) };
    } else if (fecha_hasta) {
      whereClauseBoleto.fecha_compra = { [Op.lte]: new Date(fecha_hasta + 'T23:59:59.999Z') };
    }
    // --- End Filters ---

    const boletos = await Boleto.findAll({
      where: whereClauseBoleto,
      include: includeOptions,
      attributes: ['id_boleto', 'numero_asiento', 'precio_final', 'estado', 'fecha_compra', 'codigo_qr'], // PK is id_boleto in Boleto model
      order: [
        [{ model: HorarioSalida, as: 'horario' }, 'fecha_salida', 'DESC'],
        [{ model: HorarioSalida, as: 'horario' }, 'hora_salida', 'DESC'],
        ['numero_asiento', 'ASC']
      ],
    });

    res.status(200).json(boletos);

  } catch (error) {
    console.error('Error en listarBoletosVendidosEmpresa:', error);
    if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    res.status(500).json({ message: 'Error interno del servidor al listar los boletos.', error: error.message });
  }
};
