const { Compra, Boleto, Pasajero, HorarioSalida, Asiento, Usuario, Ruta, Bus, Empresa, ConfiguracionIa, UsoTerminal, sequelize } = require('../models'); // Added UsoTerminal
const { Op } = require('sequelize');

// Helper function to calculate current selling price (similar to rutaspublicas.controller)
async function getCurrentSellingPrice(horario, configMap) {
    let precio_actual_venta = horario.precio_base; // Default to base price
    const configEmpresa = configMap.get(horario.ruta.id_empresa);

    if (horario.precio_final_fue_ajustado_manual) {
        precio_actual_venta = horario.precio_base;
    } else if (configEmpresa && configEmpresa.habilitado) {
        let iaHabilitadaParaRuta = true;
        if (configEmpresa.rutas_config_json && configEmpresa.rutas_config_json[horario.ruta.id_ruta]) {
            const configRutaEspecifica = configEmpresa.rutas_config_json[horario.ruta.id_ruta];
            if (configRutaEspecifica.habilitado === false) {
                iaHabilitadaParaRuta = false;
            }
        }
        if (iaHabilitadaParaRuta && horario.precio_sugerido_ia !== null) {
            precio_actual_venta = horario.precio_sugerido_ia;
        }
    }
    return parseFloat(precio_actual_venta);
}


exports.iniciarCompra = async (req, res) => {
  const t = await sequelize.transaction(); // Start a transaction

  try {
    const id_usuario_cliente = req.user && req.user.id;
    if (!id_usuario_cliente) {
      await t.rollback();
      return res.status(401).json({ message: 'Cliente no autenticado.' });
    }

    const {
      id_horario,
      numero_asiento_seleccionado,
      datos_pasajero, // { nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento }
    } = req.body;

    // --- Validations ---
    if (!id_horario || !numero_asiento_seleccionado || !datos_pasajero) {
      await t.rollback();
      return res.status(400).json({ message: 'Campos obligatorios faltantes: id_horario, numero_asiento_seleccionado, datos_pasajero.' });
    }
    if (isNaN(parseInt(id_horario, 10))) {
      await t.rollback();
      return res.status(400).json({ message: 'ID de horario inválido.' });
    }
     // Validate datos_pasajero structure
    if (!datos_pasajero.nombre || !datos_pasajero.apellido || !datos_pasajero.tipo_documento || !datos_pasajero.numero_documento || !datos_pasajero.fecha_nacimiento) {
        await t.rollback();
        return res.status(400).json({ message: 'Datos del pasajero incompletos. Se requieren: nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento.' });
    }


    // 1. Fetch HorarioSalida, Ruta, Bus, and Empresa
    const horario = await HorarioSalida.findByPk(parseInt(id_horario, 10), {
      include: [
        {
          model: Ruta,
          as: 'ruta',
          required: true,
          include: [{ model: Empresa, as: 'empresa', required: true, attributes: ['id_empresa'] }]
        },
        { model: Bus, as: 'bus', required: true },
      ],
      transaction: t,
    });

    if (!horario || !horario.ruta || !horario.bus || !horario.ruta.empresa) {
      await t.rollback();
      return res.status(404).json({ message: 'Horario, ruta, bus o empresa no encontrado.' });
    }
    if (!horario.estado || !horario.ruta.estado || !horario.bus.estado) {
      await t.rollback();
      return res.status(400).json({ message: 'El horario, la ruta o el bus no están activos.' });
    }

    // Check if departure time is in the past
    const departureDateTimeStr = `${horario.fecha_salida.toISOString().split('T')[0]}T${horario.hora_salida}`;
    const departureDateTime = new Date(departureDateTimeStr);
    if (departureDateTime < new Date()) {
        await t.rollback();
        return res.status(400).json({ message: 'No se puede comprar boletos para un horario que ya ha partido.' });
    }


    // 2. Fetch Asiento configuration
    const asientoSeleccionadoConfig = await Asiento.findOne({
      where: {
        id_bus: horario.bus.id_bus,
        numero_asiento: numero_asiento_seleccionado,
      },
      transaction: t,
    });

    if (!asientoSeleccionadoConfig) {
      await t.rollback();
      return res.status(404).json({ message: `Asiento ${numero_asiento_seleccionado} no encontrado en la configuración del bus.` });
    }
    if (!asientoSeleccionadoConfig.disponible) { // 'disponible' on Asiento means physically functional
      await t.rollback();
      return res.status(400).json({ message: `El asiento ${numero_asiento_seleccionado} no está habilitado en el bus.` });
    }

    // 3. Verify Real Seat Availability (check Boletos)
    const boletoExistente = await Boleto.findOne({
      where: {
        id_horario: horario.id_horario_salida, // Assuming PK of HorarioSalida
        numero_asiento: numero_asiento_seleccionado, // Check by number on Boleto
        estado: { [Op.notIn]: ['CANCELADO', 'ANULADO'] } // Consider 'PENDIENTE_PAGO' as occupied for this check
      },
      transaction: t,
    });

    if (boletoExistente) {
      await t.rollback();
      return res.status(409).json({ message: `El asiento ${numero_asiento_seleccionado} ya está ocupado o reservado.` });
    }

    // 4. Determine Final Ticket Price
    const configMap = new Map();
    const configIaEmpresa = await ConfiguracionIa.findOne({ where: { id_empresa: horario.ruta.id_empresa }, transaction: t });
    if (configIaEmpresa) {
        configMap.set(horario.ruta.id_empresa, configIaEmpresa);
    }
    const precio_final_boleto = await getCurrentSellingPrice(horario.toJSON(), configMap); // Pass horario.toJSON() if helper expects plain object

    // 5. Create/Get Pasajero
    let pasajeroParaBoleto;
    pasajeroParaBoleto = await Pasajero.findOne({
      where: {
        tipo_documento: datos_pasajero.tipo_documento,
        numero_documento: datos_pasajero.numero_documento,
      },
      transaction: t,
    });

    if (!pasajeroParaBoleto) {
      pasajeroParaBoleto = await Pasajero.create({
        nombre: datos_pasajero.nombre,
        apellido: datos_pasajero.apellido,
        tipo_documento: datos_pasajero.tipo_documento,
        numero_documento: datos_pasajero.numero_documento,
        fecha_nacimiento: datos_pasajero.fecha_nacimiento,
        // id_usuario_registro: id_usuario_cliente, // Optional: if Pasajero can be linked to a Usuario who registered them
      }, { transaction: t });
    } else {
      // Optional: Update pasajero data if it differs, or just use existing
      // For now, just use existing if found
    }


    // 6. Create Compra
    const nuevaCompra = await Compra.create({
      id_usuario: id_usuario_cliente,
      fecha_compra: new Date(), // Use fecha_compra on Compra, not just Boleto
      total_compra: precio_final_boleto, // Assuming one ticket per purchase for now
      estado_compra: 'PENDIENTE_PAGO', // Use estado_compra on Compra
      // metodo_pago, referencia_pago would be null here
    }, { transaction: t });

    // 7. Create Boleto
    const nuevoBoleto = await Boleto.create({
      id_pasajero: pasajeroParaBoleto.id_pasajero, // Assuming PK of Pasajero
      id_horario: horario.id_horario_salida,     // Assuming PK of HorarioSalida
      id_asiento: asientoSeleccionadoConfig.id_asiento, // PK of Asiento
      id_compra: nuevaCompra.id_compra,           // Assuming PK of Compra
      precio_final: precio_final_boleto,
      fecha_compra: nuevaCompra.fecha_compra, // Align with Compra's date
      numero_asiento: asientoSeleccionadoConfig.numero_asiento, // Store the seat number
      estado: 'PENDIENTE_PAGO', // Or 'RESERVADO'
      codigo_qr: null, // Generated upon successful payment
    }, { transaction: t });

    await t.commit(); // Commit transaction

    res.status(201).json({
      message: 'Proceso de compra iniciado. Boleto pendiente de pago.',
      compra: nuevaCompra,
      boleto: nuevoBoleto,
      // pasajero: pasajeroParaBoleto // Optionally return passenger info
    });

  } catch (error) {
    await t.rollback(); // Rollback transaction on error
    console.error('Error en iniciarCompra:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación de datos.', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor al iniciar la compra.', error: error.message });
  }
};

exports.realizarPagoCompra = async (req, res) => {
  const t = await sequelize.transaction(); // Start a transaction

  try {
    const id_usuario_cliente = req.user && req.user.id;
    const { id_compra } = req.params;
    const { metodo_pago = 'TARJETA_SIMULADA' } = req.body; // Default if not provided

    if (!id_usuario_cliente) {
      await t.rollback();
      return res.status(401).json({ message: 'Cliente no autenticado.' });
    }
    if (isNaN(parseInt(id_compra, 10))) {
      await t.rollback();
      return res.status(400).json({ message: 'ID de compra inválido.' });
    }

    // 1. Fetch Compra and associated Boletos
    const compra = await Compra.findOne({
      where: {
        id_compra: parseInt(id_compra, 10),
        id_usuario: id_usuario_cliente,
      },
      include: [{
        model: Boleto,
        as: 'boletos', // Ensure this alias matches your Compra model definition
        required: true, // Compra must have boletos
        include: [{ // Include Pasajero for QR code generation data
            model: Pasajero,
            as: 'pasajero',
            attributes: ['numero_documento']
        }]
      }],
      transaction: t,
    });

    if (!compra) {
      await t.rollback();
      return res.status(404).json({ message: 'Compra no encontrada o no pertenece al usuario.' });
    }
    if (compra.estado_compra !== 'PENDIENTE_PAGO') {
      await t.rollback();
      return res.status(400).json({ message: `La compra ya está en estado: ${compra.estado_compra}. No se puede procesar el pago.` });
    }
    if (!compra.boletos || compra.boletos.length === 0) {
        await t.rollback();
        return res.status(404).json({ message: 'No se encontraron boletos asociados a esta compra.' });
    }

    // --- Simulate Payment (Always successful for this phase) ---

    // 2. Update Compra
    compra.estado_compra = 'PAGADO'; // Assuming 'PAGADO' is the state in Compra model
    compra.metodo_pago = metodo_pago;
    compra.fecha_pago = new Date(); // Assuming Compra model has 'fecha_pago'
    await compra.save({ transaction: t });

    // 3. Update Boletos and Create UsoTerminal entries
    for (const boleto of compra.boletos) {
      boleto.estado = 'CONFIRMADO'; // Assuming 'CONFIRMADO' is the state in Boleto model

      // Generate QR code content
      const qrContent = JSON.stringify({
        id_boleto: boleto.id_boleto, // Assuming PK of Boleto
        id_horario: boleto.id_horario,
        asiento: boleto.numero_asiento,
        // Make sure boleto.pasajero is loaded if needed here, or use data from compra.boletos[i].pasajero
        pasajero_doc: boleto.pasajero ? boleto.pasajero.numero_documento : 'N/A',
      });
      boleto.codigo_qr = qrContent; // Store the string content
      await boleto.save({ transaction: t });

      // Create UsoTerminal entry
      // Define TARIFA_USO_TERMINAL (e.g., from config, or fixed)
      const TARIFA_USO_TERMINAL = parseFloat(process.env.TARIFA_USO_TERMINAL) || 1.00; // Example: 1.00 currency unit

      await UsoTerminal.create({
        id_boleto: boleto.id_boleto, // Assuming PK of Boleto
        monto_pagado: TARIFA_USO_TERMINAL, // This should be the actual terminal fee
        validado: false,
        fecha_validacion: null,
        // id_compra: compra.id_compra, // Optional: if UsoTerminal is linked to Compra
      }, { transaction: t });
    }

    await t.commit(); // Commit transaction

    // Refetch Compra with updated Boletos for response
    const compraActualizada = await Compra.findByPk(compra.id_compra, {
        include: [{
            model: Boleto,
            as: 'boletos',
            attributes: { exclude: [] } // Include all Boleto attributes, or specify
        }]
    });

    res.status(200).json({
      message: 'Pago realizado y compra confirmada exitosamente.',
      compra: compraActualizada,
    });

  } catch (error) {
    await t.rollback();
    console.error('Error en realizarPagoCompra:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación de datos.', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor al procesar el pago.', error: error.message });
  }
};
