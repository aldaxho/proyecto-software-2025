const { UsoTerminal, Boleto } = require('../models'); // Assuming these models are in /models

exports.validarPagoQr = async (req, res) => {
  try {
    const { id_boleto } = req.body;

    if (!id_boleto) {
      return res.status(400).json({ message: 'El campo id_boleto es obligatorio.' });
    }

    // Optional: Check if the boleto itself exists, though the main logic is on UsoTerminal
    // const boletoExistente = await Boleto.findByPk(id_boleto);
    // if (!boletoExistente) {
    //   return res.status(404).json({ message: 'Boleto no encontrado.' });
    // }

    const usoTerminal = await UsoTerminal.findOne({
      where: {
        id_boleto: id_boleto,
      },
    });

    if (!usoTerminal) {
      return res.status(404).json({ message: 'Registro de Uso de Terminal no encontrado para este boleto.' });
    }

    if (usoTerminal.validado) {
      return res.status(409).json({ // 409 Conflict might be more appropriate if already validated
        message: 'Este pago de Uso de Terminal ya ha sido validado.',
        fecha_validacion: usoTerminal.fecha_validacion,
      });
    }

    // Actualizar el registro
    usoTerminal.validado = true;
    usoTerminal.fecha_validacion = new Date();
    await usoTerminal.save();

    res.status(200).json({
      message: 'Pago de Uso de Terminal validado exitosamente.',
      usoTerminal,
    });

  } catch (error) {
    console.error('Error al validar pago de Uso de Terminal:', error);
    // Check for specific Sequelize errors if needed, e.g., validation errors
    // if (error.name === 'SequelizeValidationError') {
    //   return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    // }
    res.status(500).json({ message: 'Error interno del servidor al validar el pago.', error: error.message });
  }
};
