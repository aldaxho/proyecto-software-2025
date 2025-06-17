const { HorarioSalida, Ruta, Bus, Empresa, ConfiguracionIa, Asiento, Boleto, sequelize } = require('../models'); // Added Asiento, Boleto
const { Op } = require('sequelize');

exports.buscarHorarios = async (req, res) => {
  try {
    const { origen, destino, fecha_salida } = req.query;

    // --- Validations ---
    if (!origen || !destino || !fecha_salida) {
      return res.status(400).json({ message: 'Parámetros obligatorios faltantes: origen, destino, fecha_salida.' });
    }

    let parsedDate;
    try {
      parsedDate = new Date(fecha_salida);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Fecha inválida');
      }
      // Optional: Check if fecha_salida is not in the past (e.g., for today or future searches)
      // const today = new Date(); today.setHours(0,0,0,0);
      // if (parsedDate < today) {
      //   return res.status(400).json({ message: 'La fecha de búsqueda no puede ser en el pasado.' });
      // }
    } catch (e) {
      return res.status(400).json({ message: 'Formato de fecha_salida inválido. Use YYYY-MM-DD.' });
    }
    // --- End Validations ---

    const horarios = await HorarioSalida.findAll({
      where: {
        fecha_salida: parsedDate,
        estado: true, // Only active schedules
      },
      include: [
        {
          model: Ruta,
          as: 'ruta',
          required: true,
          where: {
            // Using Op.iLike for case-insensitive search (PostgreSQL specific)
            // For MySQL, direct equality or use LOWER() on both sides.
            // Assuming case-insensitive search is desired.
            origen: sequelize.dialect === 'postgres' ? { [Op.iLike]: `%${origen}%` } : origen,
            destino: sequelize.dialect === 'postgres' ? { [Op.iLike]: `%${destino}%` } : destino,
            estado: true, // Only active routes
          },
          attributes: ['id_ruta', 'nombre_ruta', 'origen', 'destino', 'tiempo_estimado', 'id_empresa'],
          include: [{ // Nested include to get Empresa details directly from Ruta
            model: Empresa,
            as: 'empresa',
            required: true, // Ensure Ruta has an Empresa
            attributes: ['id_empresa', 'nombre'],
          }]
        },
        {
          model: Bus,
          as: 'bus',
          required: true,
          where: { estado: true }, // Only active buses
          attributes: ['id_bus', 'placa', 'modelo', 'tipo_asiento', 'comodidades'],
        },
      ],
      attributes: [
        'id_horario_salida', // Assuming PK is id_horario_salida
        'fecha_salida',
        'hora_salida',
        'precio_base', // This is the final price if not adjusted / no AI price
        'precio_sugerido_ia',
        'precio_final_fue_ajustado_manual'
      ],
      order: [['hora_salida', 'ASC']],
    });

    if (!horarios || horarios.length === 0) {
      return res.status(404).json({ message: 'No se encontraron horarios para los criterios seleccionados.' });
    }

    // Process results to calculate precio_actual_venta
    // Fetch all relevant ConfiguracionIa records at once to optimize
    const empresaIds = [...new Set(horarios.map(h => h.ruta.id_empresa))];
    const configuracionesIa = await ConfiguracionIa.findAll({
      where: { id_empresa: { [Op.in]: empresaIds } },
    });
    const configMap = new Map(configuracionesIa.map(c => [c.id_empresa, c]));

    const resultadosProcesados = horarios.map(horario => {
      const horarioJson = horario.toJSON(); // Work with plain objects
      let precio_actual_venta = horarioJson.precio_base; // Default to base price

      const configEmpresa = configMap.get(horarioJson.ruta.id_empresa);

      if (horarioJson.precio_final_fue_ajustado_manual) {
        precio_actual_venta = horarioJson.precio_base;
      } else if (configEmpresa && configEmpresa.habilitado) {
        let iaHabilitadaParaRuta = true; // Default if no specific route config or if route config enables it

        if (configEmpresa.rutas_config_json && configEmpresa.rutas_config_json[horarioJson.ruta.id_ruta]) {
          const configRutaEspecifica = configEmpresa.rutas_config_json[horarioJson.ruta.id_ruta];
          if (configRutaEspecifica.habilitado === false) { // Explicitly disabled for this route
            iaHabilitadaParaRuta = false;
          }
        }

        if (iaHabilitadaParaRuta && horarioJson.precio_sugerido_ia !== null) {
          precio_actual_venta = horarioJson.precio_sugerido_ia;
        }
      }

      horarioJson.precio_actual_venta = parseFloat(precio_actual_venta);

      // Add estimated arrival time if tiempo_estimado is available
      if (horarioJson.ruta && horarioJson.ruta.tiempo_estimado && horarioJson.fecha_salida && horarioJson.hora_salida) {
          try {
            const [hours, minutes, seconds] = horarioJson.ruta.tiempo_estimado.split(':').map(Number);
            const departureDateTime = new Date(`${horarioJson.fecha_salida.toISOString().split('T')[0]}T${horarioJson.hora_salida}`);
            if (!isNaN(departureDateTime.getTime())) {
                 const arrivalDateTime = new Date(departureDateTime.getTime() + (hours * 3600 + minutes * 60 + seconds * 0) * 1000); // seconds usually 0 for TIME type
                 horarioJson.hora_llegada_estimada = arrivalDateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); // Format as HH:MM
            }
          } catch(e) {
            console.warn("Could not parse tiempo_estimado or calculate arrival: ", e);
            horarioJson.hora_llegada_estimada = null;
          }
      }


      return horarioJson;
    });

    res.status(200).json(resultadosProcesados);

  } catch (error) {
    console.error('Error en buscarHorarios:', error);
    if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    res.status(500).json({ message: 'Error interno del servidor al buscar horarios.', error: error.message });
  }
};

exports.getDisponibilidadAsientos = async (req, res) => {
  try {
    const { id_horario } = req.params;

    if (isNaN(parseInt(id_horario, 10))) {
      return res.status(400).json({ message: 'El ID del horario debe ser un número.' });
    }

    const horario = await HorarioSalida.findByPk(parseInt(id_horario, 10), {
      include: [
        {
          model: Bus,
          as: 'bus',
          required: true, // Ensure the horario has a bus
          attributes: ['id_bus', 'tipo_asiento', 'capacidad'], // Add any other bus info needed
        },
        {
          model: Ruta, // Include Ruta to provide context if needed
          as: 'ruta',
          required: true,
          attributes: ['nombre_ruta', 'origen', 'destino'],
          include: [{ model: Empresa, as: 'empresa', attributes: ['nombre']}]
        }
      ],
    });

    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado.' });
    }

    if (!horario.estado) {
        return res.status(404).json({ message: 'Este horario no está activo o disponible para la venta.' });
    }
    if (!horario.bus || !horario.bus.id_bus) {
        return res.status(500).json({ message: 'Información del bus no disponible para este horario.' });
    }
    if (!horario.bus.estado) { // Assuming Bus model also has an 'estado' field
        return res.status(404).json({ message: 'El bus asignado a este horario no está activo.'});
    }


    const id_bus_del_horario = horario.bus.id_bus;

    // 1. Get all seat configurations for the bus
    const asientosConfiguracion = await Asiento.findAll({
      where: { id_bus: id_bus_del_horario },
      order: [['piso', 'ASC'], ['coordenada_x', 'ASC'], ['coordenada_y', 'ASC']], // Order for consistent layout
      attributes: ['id_asiento', 'numero_asiento', 'piso', 'tipo_asiento', 'caracteristicas', 'disponible', 'coordenada_x', 'coordenada_y', 'es_pasillo'],
    });

    if (!asientosConfiguracion || asientosConfiguracion.length === 0) {
        return res.status(404).json({ message: 'No se encontró configuración de asientos para el bus de este horario.' });
    }

    // 2. Get sold/occupied seat numbers for this specific schedule
    const boletosVendidos = await Boleto.findAll({
      where: {
        id_horario: parseInt(id_horario, 10),
        estado: { [Op.notIn]: ['CANCELADO', 'ANULADO'] }, // Define states that mean "occupied"
      },
      attributes: ['numero_asiento'],
    });
    const asientosOcupadosNumeros = new Set(boletosVendidos.map(b => b.numero_asiento));

    // 3. Construct the response
    const disponibilidadAsientos = asientosConfiguracion.map(asientoConfig => {
      const asientoJson = asientoConfig.toJSON();
      asientoJson.ocupado_en_horario = asientosOcupadosNumeros.has(asientoConfig.numero_asiento);
      // 'disponible' on asientoConfig refers to physical availability/functionality of the seat on the bus itself
      // 'no_habilitado' could be used if asientoConfig.disponible is false
      asientoJson.habilitado_en_bus = asientoConfig.disponible;
      return asientoJson;
    });

    // Remove redundant nested bus info from horario if desired, as it's now in a separate key
    const horarioInfo = horario.toJSON();
    // delete horarioInfo.bus;

    res.status(200).json({
      horario: horarioInfo, // Basic horario info
      // bus: horario.bus, // General bus info from the horario query
      asientos: disponibilidadAsientos,
    });

  } catch (error) {
    console.error('Error en getDisponibilidadAsientos:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener disponibilidad de asientos.', error: error.message });
  }
};
