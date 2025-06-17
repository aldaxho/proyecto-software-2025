const { UsoTerminal, Boleto, HorarioSalida, Ruta, sequelize } = require('../models'); // Added Boleto, HorarioSalida, Ruta
const { Op } = require('sequelize');

exports.getIngresosTerminalDiarios = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const whereClause = {
      validado: true, // Only include validated payments
    };

    // Add date filtering if provided
    if (fecha_inicio && fecha_fin) {
      // Basic validation for date format can be added here if needed
      // For example, ensuring they are in 'YYYY-MM-DD' format
      whereClause.fecha_validacion = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin + 'T23:59:59.999Z')], // Include the whole end day
      };
    } else if (fecha_inicio) {
      whereClause.fecha_validacion = {
        [Op.gte]: new Date(fecha_inicio),
      };
    } else if (fecha_fin) {
      whereClause.fecha_validacion = {
        [Op.lte]: new Date(fecha_fin + 'T23:59:59.999Z'),
      };
    }

    const ingresos = await UsoTerminal.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('fecha_validacion')), 'fecha'],
        [sequelize.fn('SUM', sequelize.col('monto_pagado')), 'total_ingresos'],
      ],
      where: whereClause,
      group: [sequelize.fn('DATE', sequelize.col('fecha_validacion'))],
      order: [[sequelize.fn('DATE', sequelize.col('fecha_validacion')), 'ASC']],
      raw: true, // Get plain JSON results
    });

    res.status(200).json(ingresos);

  } catch (error) {
    console.error('Error al generar reporte de ingresos de terminal:', error);
    // Basic error handling, can be expanded
    if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    res.status(500).json({ message: 'Error interno del servidor al generar el reporte.', error: error.message });
  }
};

// Get aggregated sales report for the company
exports.getVentasEmpresaAgregado = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }

    const { id_ruta, fecha_desde, fecha_hasta, agrupar_por = 'dia' } = req.query; // Default agrupar_por to 'dia'

    const attributes = [
      [sequelize.fn('SUM', sequelize.col('Boleto.precio_final')), 'total_ventas'],
      [sequelize.fn('COUNT', sequelize.col('Boleto.id_boleto')), 'cantidad_boletos'],
    ];
    const group = [];
    const order = [];
    const whereBoleto = {
        // Podríamos añadir un filtro por estado del boleto si es necesario, ej:
        // estado: 'VENDIDO'
    };

    // Date filtering on Boleto.fecha_compra
    if (fecha_desde && fecha_hasta) {
      whereBoleto.fecha_compra = {
        [Op.between]: [new Date(fecha_desde), new Date(fecha_hasta + 'T23:59:59.999Z')],
      };
    } else if (fecha_desde) {
      whereBoleto.fecha_compra = { [Op.gte]: new Date(fecha_desde) };
    } else if (fecha_hasta) {
      whereBoleto.fecha_compra = { [Op.lte]: new Date(fecha_hasta + 'T23:59:59.999Z') };
    }

    // Grouping logic
    if (agrupar_por === 'dia') {
      attributes.push([sequelize.fn('DATE', sequelize.col('Boleto.fecha_compra')), 'fecha_agrupada']);
      group.push(sequelize.fn('DATE', sequelize.col('Boleto.fecha_compra')));
      order.push([sequelize.fn('DATE', sequelize.col('Boleto.fecha_compra')), 'ASC']);
    } else if (agrupar_por === 'mes') {
      // PostgreSQL specific: TO_CHAR(date, 'YYYY-MM'). For MySQL: DATE_FORMAT(date, '%Y-%m')
      // This example uses PostgreSQL syntax. Adapt if using another dialect.
      const monthFunction = sequelize.dialect === 'postgres'
        ? sequelize.fn('TO_CHAR', sequelize.col('Boleto.fecha_compra'), 'YYYY-MM')
        : sequelize.fn('DATE_FORMAT', sequelize.col('Boleto.fecha_compra'), '%Y-%m');
      attributes.push([monthFunction, 'mes_agrupado']);
      group.push(monthFunction); // Group by the result of the function
      order.push([monthFunction, 'ASC']);
    } else if (agrupar_por === 'ruta') {
      // Ensure Ruta.nombre_ruta is included in attributes and group by Ruta.id_ruta (or nombre_ruta)
      // The include itself will bring Ruta.nombre_ruta. We need to add it to select and group.
      attributes.push([sequelize.col('horario.ruta.id_ruta'), 'id_ruta_agrupada']); // For grouping
      attributes.push([sequelize.col('horario.ruta.nombre_ruta'), 'nombre_ruta_agrupada']); // For display
      group.push(sequelize.col('horario.ruta.id_ruta'));
      group.push(sequelize.col('horario.ruta.nombre_ruta'));
      order.push([sequelize.col('horario.ruta.nombre_ruta'), 'ASC']);
    } else {
        // Default or if invalid agrupar_por, maybe just overall totals (no date/route grouping in attributes/group)
        // Or return a 400 error for invalid agrupar_por value
        return res.status(400).json({ message: "Valor de 'agrupar_por' inválido. Permitidos: 'dia', 'mes', 'ruta'."});
    }


    const includeOptions = [
      {
        model: HorarioSalida,
        as: 'horario',
        attributes: [], // Don't need attributes from HorarioSalida itself unless specifically requested
        required: true,
        include: [
          {
            model: Ruta,
            as: 'ruta',
            attributes: [], // Only include for filtering/grouping, actual attributes for grouping added above
            where: { id_empresa: id_empresa_from_token },
            required: true,
          },
        ],
      },
    ];

    if (id_ruta) {
      if (isNaN(parseInt(id_ruta, 10))) {
        return res.status(400).json({ message: 'id_ruta debe ser un número.' });
      }
      // This adds the where clause to the Ruta include defined above
      if (!includeOptions[0].include[0].where) includeOptions[0].include[0].where = {};
      includeOptions[0].include[0].where.id_ruta = parseInt(id_ruta, 10);
    }

    const ventasAgregadas = await Boleto.findAll({
      attributes: attributes,
      include: includeOptions,
      where: whereBoleto,
      group: group,
      order: order,
      raw: true, // Useful for aggregated results to avoid complex nested objects
    });

    res.status(200).json(ventasAgregadas);

  } catch (error) {
    console.error('Error en getVentasEmpresaAgregado:', error);
    if (error.name === 'SequelizeDatabaseError' && error.original) {
        // Catch specific SQL errors, e.g., ER_TRUNCATED_WRONG_VALUE for dates
        if (error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
            return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
        }
        // Catch errors related to undefined functions (like DATE_FORMAT on PostgreSQL if not handled)
        if (error.message.includes("function date_format") && sequelize.dialect === 'postgres') {
            return res.status(500).json({ message: "Error de configuración de base de datos: función DATE_FORMAT no disponible para PostgreSQL. Use TO_CHAR."});
        }
         if (error.message.includes("function to_char") && sequelize.dialect !== 'postgres') {
            return res.status(500).json({ message: `Error de configuración de base de datos: función TO_CHAR no disponible para ${sequelize.dialect}. Use la función de formato de fecha apropiada.`});
        }
    }
    res.status(500).json({ message: 'Error interno del servidor al generar el reporte de ventas.', error: error.message });
  }
};
