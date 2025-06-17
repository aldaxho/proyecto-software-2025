const { HorarioSalida, Ruta, Bus, sequelize } = require('../models'); // Assuming models are in /models
const { Op } = require('sequelize');

// Create a new departure schedule for the company
exports.crearHorario = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }

    const {
      id_ruta,
      id_bus,
      fecha_salida, // YYYY-MM-DD
      hora_salida,  // HH:MM or HH:MM:SS
      precio_base,
      estado = true, // Default to true (activo)
    } = req.body;

    // --- Validations ---
    if (!id_ruta || !id_bus || !fecha_salida || !hora_salida || precio_base === undefined) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes: id_ruta, id_bus, fecha_salida, hora_salida, precio_base.' });
    }

    // Validate Route
    const ruta = await Ruta.findOne({ where: { id_ruta, id_empresa: id_empresa_from_token } });
    if (!ruta) {
      return res.status(404).json({ message: 'Ruta no encontrada o no pertenece a esta empresa.' });
    }
    if (!ruta.estado) {
        return res.status(400).json({ message: 'La ruta seleccionada no está activa.' });
    }

    // Validate Bus
    const bus = await Bus.findOne({ where: { id_bus, id_empresa: id_empresa_from_token } });
    if (!bus) {
      return res.status(404).json({ message: 'Bus no encontrado o no pertenece a esta empresa.' });
    }
    if (!bus.estado) {
      return res.status(400).json({ message: 'El bus seleccionado no está activo.' });
    }

    // Validate fecha_salida and hora_salida (basic check: not in the past)
    // Combine fecha_salida and hora_salida to create a full departure datetime object
    // Ensure hora_salida is in a format that Date.parse can understand (e.g., HH:MM:SS)
    const departureDateTimeStr = `${fecha_salida}T${hora_salida}`;
    const departureDateTime = new Date(departureDateTimeStr);

    if (isNaN(departureDateTime.getTime())) {
        return res.status(400).json({ message: 'Formato de fecha_salida u hora_salida inválido.' });
    }
    // Allow creating schedules for today, but not in the past.
    // Create a date object for the current moment, but only for date comparison (ignoring time part for 'today')
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (departureDateTime < today) {
      return res.status(400).json({ message: 'La fecha y hora de salida no pueden estar en el pasado.' });
    }


    // Validate precio_base
    if (typeof precio_base !== 'number' || precio_base <= 0) {
      return res.status(400).json({ message: 'El precio_base debe ser un número positivo.' });
    }
    // --- End Validations ---

    const nuevoHorario = await HorarioSalida.create({
      id_ruta,
      id_bus,
      fecha_salida,
      hora_salida,
      precio_base,
      estado,
      // id_empresa is not directly on HorarioSalida, it's through Ruta/Bus
    });

    res.status(201).json(nuevoHorario);

  } catch (error) {
    console.error('Error en crearHorario:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    // Consider unique constraints if any are defined on HorarioSalida model (e.g., bus + time overlap)
    // if (error.name === 'SequelizeUniqueConstraintError') {
    //   return res.status(400).json({ message: 'Conflicto: Este horario ya existe o el bus está ocupado.', details: error.fields });
    // }
    res.status(500).json({ message: 'Error interno del servidor al crear el horario.', error: error.message });
  }
};

// List all schedules for the company, with optional filters
exports.listarHorariosEmpresa = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }

    const { id_ruta, fecha_desde, fecha_hasta } = req.query;
    const whereClauseHorario = {}; // For HorarioSalida model
    const includeOptions = [
      {
        model: Ruta,
        as: 'ruta', // Alias as defined in HorarioSalida model
        where: { id_empresa: id_empresa_from_token }, // Filter by company
        required: true, // Ensures INNER JOIN to only get schedules of this company's routes
      },
      {
        model: Bus,
        as: 'bus', // Alias as defined in HorarioSalida model
        attributes: ['id_bus', 'placa', 'modelo', 'capacidad', 'tipo_asiento'], // Select relevant bus info
        // No need to filter Bus by id_empresa here if we trust data integrity (bus assigned to horario must be from same company as route)
        // or if bus's company is implicitly handled by route's company.
      }
    ];

    if (id_ruta) {
      if (isNaN(parseInt(id_ruta, 10))) {
        return res.status(400).json({ message: 'id_ruta debe ser un número.'});
      }
      // Add filter to the 'where' clause of the Ruta include
      includeOptions[0].where.id_ruta = parseInt(id_ruta, 10);
    }

    if (fecha_desde && fecha_hasta) {
      whereClauseHorario.fecha_salida = {
        [Op.between]: [new Date(fecha_desde), new Date(fecha_hasta + 'T23:59:59.999Z')],
      };
    } else if (fecha_desde) {
      whereClauseHorario.fecha_salida = { [Op.gte]: new Date(fecha_desde) };
    } else if (fecha_hasta) {
      whereClauseHorario.fecha_salida = { [Op.lte]: new Date(fecha_hasta + 'T23:59:59.999Z') };
    }

    const horarios = await HorarioSalida.findAll({
      where: whereClauseHorario,
      include: includeOptions,
      order: [['fecha_salida', 'ASC'], ['hora_salida', 'ASC']],
    });

    res.status(200).json(horarios);

  } catch (error) {
    console.error('Error en listarHorariosEmpresa:', error);
     if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    res.status(500).json({ message: 'Error interno del servidor al listar los horarios.', error: error.message });
  }
};

// Update an existing departure schedule
exports.actualizarHorario = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;
    const { id_horario } = req.params;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }
    if (isNaN(parseInt(id_horario, 10))) {
      return res.status(400).json({ message: 'El ID del horario debe ser un número.' });
    }

    const horario = await HorarioSalida.findByPk(parseInt(id_horario, 10), {
      include: [{ model: Ruta, as: 'ruta', attributes: ['id_ruta', 'id_empresa'] }],
    });

    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado.' });
    }
    if (horario.ruta.id_empresa !== id_empresa_from_token) {
      return res.status(403).json({ message: 'Este horario no pertenece a su empresa.' });
    }

    const {
      id_ruta,
      id_bus,
      fecha_salida,
      hora_salida,
      precio_base,
      estado,
    } = req.body;

    // --- Validations for updatable fields ---
    let newDepartureDateTime;
    if (fecha_salida || hora_salida) {
        const check_fecha = fecha_salida || horario.fecha_salida;
        const check_hora = hora_salida || horario.hora_salida;
        const departureDateTimeStr = `${check_fecha}T${check_hora}`;
        newDepartureDateTime = new Date(departureDateTimeStr);

        if (isNaN(newDepartureDateTime.getTime())) {
            return res.status(400).json({ message: 'Formato de fecha_salida u hora_salida inválido.' });
        }

        // Only validate past time if the date/time is actually changing to a new past date/time
        // Or if the original schedule was in the future and is now being set to past.
        const originalDepartureDateTime = new Date(`${horario.fecha_salida}T${horario.hora_salida}`);
        if (newDepartureDateTime.getTime() !== originalDepartureDateTime.getTime()) {
            const today = new Date();
            today.setHours(0,0,0,0);
            if (newDepartureDateTime < today) {
                 return res.status(400).json({ message: 'La nueva fecha y hora de salida no pueden estar en el pasado.' });
            }
        }
        horario.fecha_salida = check_fecha;
        horario.hora_salida = check_hora;
    }


    if (id_ruta !== undefined && id_ruta !== horario.id_ruta) {
      const nuevaRuta = await Ruta.findOne({ where: { id_ruta, id_empresa: id_empresa_from_token } });
      if (!nuevaRuta) {
        return res.status(404).json({ message: 'Nueva ruta no encontrada o no pertenece a esta empresa.' });
      }
      if (!nuevaRuta.estado) {
        return res.status(400).json({ message: 'La nueva ruta seleccionada no está activa.' });
      }
      horario.id_ruta = id_ruta;
    }

    if (id_bus !== undefined && id_bus !== horario.id_bus) {
      const nuevoBus = await Bus.findOne({ where: { id_bus, id_empresa: id_empresa_from_token } });
      if (!nuevoBus) {
        return res.status(404).json({ message: 'Nuevo bus no encontrado o no pertenece a esta empresa.' });
      }
      if (!nuevoBus.estado) {
        return res.status(400).json({ message: 'El nuevo bus seleccionado no está activo.' });
      }
      horario.id_bus = id_bus;
    }

    if (precio_base !== undefined) {
      if (typeof precio_base !== 'number' || precio_base <= 0) {
        return res.status(400).json({ message: 'El precio_base debe ser un número positivo.' });
      }
      horario.precio_base = precio_base;
    }

    if (estado !== undefined) {
      horario.estado = estado; // boolean
    }
    // --- End Validations ---

    await horario.save();
    // Refetch to get updated associations if any id_ruta or id_bus changed
    const horarioActualizado = await HorarioSalida.findByPk(horario.id_horario_salida, {
        include: [
            { model: Ruta, as: 'ruta' },
            { model: Bus, as: 'bus' }
        ]
    });
    res.status(200).json(horarioActualizado);

  } catch (error) {
    console.error('Error en actualizarHorario:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor al actualizar el horario.', error: error.message });
  }
};

// Deactivate (soft delete) a departure schedule
exports.desactivarHorario = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;
    const { id_horario } = req.params;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }
    if (isNaN(parseInt(id_horario, 10))) {
      return res.status(400).json({ message: 'El ID del horario debe ser un número.' });
    }

    const horario = await HorarioSalida.findByPk(parseInt(id_horario, 10), {
      include: [{ model: Ruta, as: 'ruta', attributes: ['id_ruta', 'id_empresa'] }],
    });

    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado.' });
    }
    if (horario.ruta.id_empresa !== id_empresa_from_token) {
      return res.status(403).json({ message: 'Este horario no pertenece a su empresa.' });
    }

    // Logical delete by setting estado to false
    horario.estado = false;
    await horario.save();

    res.status(200).json({ message: 'Horario desactivado exitosamente.' });
    // Or res.status(204).send();

  } catch (error) {
    console.error('Error en desactivarHorario:', error);
    res.status(500).json({ message: 'Error interno del servidor al desactivar el horario.', error: error.message });
  }
};
