const { UsoTerminal, sequelize } = require('../models'); // Assuming UsoTerminal is in models and sequelize is exported from there
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
