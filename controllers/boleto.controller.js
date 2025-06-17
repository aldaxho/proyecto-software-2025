const { Boleto, HorarioSalida, Ruta, Bus, Pasajero, Compra, Asiento, Empresa, sequelize } = require('../models'); // Added Asiento, Empresa
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

// Get digital ticket for a client
exports.getBoletoDigitalCliente = async (req, res) => {
  try {
    const id_usuario_cliente = req.user && req.user.id; // Assuming JWT 'id' is the user's PK
    const { id_boleto } = req.params;

    if (!id_usuario_cliente) {
      return res.status(401).json({ message: 'Cliente no autenticado.' });
    }
    if (isNaN(parseInt(id_boleto, 10))) {
      return res.status(400).json({ message: 'ID de boleto inválido.' });
    }

    const boleto = await Boleto.findByPk(parseInt(id_boleto, 10), {
      include: [
        {
          model: Compra,
          as: 'compra',
          required: true, // Boleto must be part of a Compra
          attributes: ['id_compra', 'id_usuario', 'fecha_compra', 'metodo_pago', 'total_compra'],
        },
        {
          model: HorarioSalida,
          as: 'horario',
          required: true,
          attributes: ['id_horario_salida', 'fecha_salida', 'hora_salida'],
          include: [
            {
              model: Ruta,
              as: 'ruta',
              required: true,
              attributes: ['id_ruta', 'nombre_ruta', 'origen', 'destino', 'tiempo_estimado'],
              include: [{ model: Empresa, as: 'empresa', required: true, attributes: ['id_empresa', 'nombre'] }]
            },
            {
              model: Bus,
              as: 'bus',
              required: true,
              attributes: ['id_bus', 'placa', 'modelo', 'tipo_asiento']
            }
          ]
        },
        {
          model: Pasajero,
          as: 'pasajero',
          required: true, // A ticket should always have a passenger
          attributes: ['id_pasajero', 'nombre', 'apellido', 'tipo_documento', 'numero_documento']
        },
        {
          model: Asiento, // To get seat details like floor, characteristics
          as: 'asiento', // Make sure this alias matches Boleto model definition
          required: true, // A ticket must be for a specific seat configuration
          attributes: ['id_asiento', 'numero_asiento', 'piso', 'caracteristicas']
        }
      ],
      // Selected attributes for Boleto itself
      attributes: ['id_boleto', 'precio_final', 'estado', 'codigo_qr', 'numero_asiento', 'fecha_compra']
    });

    if (!boleto) {
      return res.status(404).json({ message: 'Boleto no encontrado.' });
    }

    // Validate ownership: Check if Compra.id_usuario matches the logged-in client's ID
    if (boleto.compra.id_usuario !== id_usuario_cliente) {
      return res.status(403).json({ message: 'Acceso denegado. Este boleto no le pertenece.' });
    }

    // Validate ticket status
    if (boleto.estado !== 'CONFIRMADO') { // Or any other valid, paid status
      return res.status(400).json({ message: `Este boleto no está confirmado. Estado actual: ${boleto.estado}` });
    }

    // Add estimated arrival time to the horario within the boleto
    // This is a bit redundant if horario object is already rich, but shown for completeness
    // if (boleto.horario && boleto.horario.ruta && boleto.horario.ruta.tiempo_estimado && boleto.horario.fecha_salida && boleto.horario.hora_salida) {
    //     try {
    //         const [hours, minutes] = boleto.horario.ruta.tiempo_estimado.split(':').map(Number);
    //         const departureDateTime = new Date(`${boleto.horario.fecha_salida.toISOString().split('T')[0]}T${boleto.horario.hora_salida}`);
    //         if (!isNaN(departureDateTime.getTime())) {
    //             const arrivalDateTime = new Date(departureDateTime.getTime() + (hours * 3600 + minutes * 60) * 1000);
    //             // Mutate the plain object if needed, or ensure it's part of the initial query selection
    //             // boleto.horario.dataValues.hora_llegada_estimada = arrivalDateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    //         }
    //     } catch(e) {
    //         console.warn("Could not parse tiempo_estimado for arrival time in getBoletoDigitalCliente: ", e);
    //     }
    // }


    res.status(200).json(boleto);

  } catch (error) {
    console.error('Error en getBoletoDigitalCliente:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener el boleto digital.', error: error.message });
  }
};

// List tickets purchased by the logged-in client
exports.listarMisBoletos = async (req, res) => {
  try {
    const id_usuario_cliente = req.user && req.user.id;

    if (!id_usuario_cliente) {
      return res.status(401).json({ message: 'Cliente no autenticado.' });
    }

    const { estado_boleto, fecha_desde, fecha_hasta } = req.query;
    const whereClauseBoleto = {}; // For Boleto model filters

    // Date filtering on Boleto.fecha_compra
    if (fecha_desde && fecha_hasta) {
      whereClauseBoleto.fecha_compra = {
        [Op.between]: [new Date(fecha_desde), new Date(fecha_hasta + 'T23:59:59.999Z')],
      };
    } else if (fecha_desde) {
      whereClauseBoleto.fecha_compra = { [Op.gte]: new Date(fecha_desde) };
    } else if (fecha_hasta) {
      whereClauseBoleto.fecha_compra = { [Op.lte]: new Date(fecha_hasta + 'T23:59:59.999Z') };
    }

    if (estado_boleto) {
        // TODO: Validate estado_boleto against allowed enum values if Boleto.estado is an ENUM
        whereClauseBoleto.estado = estado_boleto;
    }

    const boletos = await Boleto.findAll({
      where: whereClauseBoleto,
      include: [
        {
          model: Compra,
          as: 'compra',
          required: true, // INNER JOIN: Only boletos that are part of a Compra
          where: { id_usuario: id_usuario_cliente }, // Filter by the logged-in client
          attributes: ['id_compra', 'fecha_compra', 'metodo_pago', 'total_compra', 'estado_compra'],
        },
        {
          model: HorarioSalida,
          as: 'horario',
          required: true, // INNER JOIN: Only boletos with a Horario
          attributes: ['id_horario_salida', 'fecha_salida', 'hora_salida'],
          include: [
            {
              model: Ruta,
              as: 'ruta',
              required: true,
              attributes: ['id_ruta', 'nombre_ruta', 'origen', 'destino', 'tiempo_estimado'],
              include: [{ model: Empresa, as: 'empresa', required: true, attributes: ['id_empresa', 'nombre'] }]
            },
            {
              model: Bus,
              as: 'bus',
              required: true,
              attributes: ['id_bus', 'placa', 'modelo', 'tipo_asiento']
            }
          ]
        },
        {
          model: Pasajero,
          as: 'pasajero',
          required: true,
          attributes: ['id_pasajero', 'nombre', 'apellido', 'tipo_documento', 'numero_documento']
        },
        {
          model: Asiento,
          as: 'asiento',
          required: true,
          attributes: ['id_asiento', 'numero_asiento', 'piso', 'caracteristicas']
        }
      ],
      attributes: ['id_boleto', 'precio_final', 'estado', 'codigo_qr', 'numero_asiento', 'fecha_compra'],
      order: [['fecha_compra', 'DESC']], // Most recent purchases first
    });

    res.status(200).json(boletos);

  } catch (error) {
    console.error('Error en listarMisBoletos:', error);
    if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    res.status(500).json({ message: 'Error interno del servidor al listar los boletos.', error: error.message });
  }
};
