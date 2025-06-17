const { Bus, Empresa } = require('../models'); // Assuming models are in /models
const { Op } = require('sequelize'); // For potential future complex queries

// Register a new bus for the company
exports.registrarBus = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;

    if (!id_empresa_from_token) {
      // This should be caught by checkRole, but defensive check is good
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }

    const {
      placa,
      modelo,
      año_modelo, // year_fabricacion might be a better name
      capacidad,
      tipo_asiento, // e.g., 'Cama', 'Semicama'
      comodidades, // JSON: e.g., { wifi: true, baño: true, tv: false }
      estado = true, // Default to true (activo)
    } = req.body;

    // Basic Validations
    if (!placa || !modelo || !año_modelo || !capacidad || !tipo_asiento) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes: placa, modelo, año_modelo, capacidad, tipo_asiento.' });
    }
    if (typeof capacidad !== 'number' || capacidad <= 0) {
      return res.status(400).json({ message: 'La capacidad debe ser un número positivo.' });
    }
    // Validate año_modelo format if necessary (e.g., ensure it's a valid year)
    const currentYear = new Date().getFullYear();
    if (typeof año_modelo !== 'number' || año_modelo < 1900 || año_modelo > currentYear + 2) { // +2 for future models
        return res.status(400).json({ message: `Año del modelo inválido. Debe ser un número entre 1900 y ${currentYear + 2}.` });
    }


    // Check for placa uniqueness (globally or within the company)
    // For this example, let's check within the company.
    // For global uniqueness, remove id_empresa from the where clause.
    const existingPlaca = await Bus.findOne({
      where: {
        placa: placa.toUpperCase(), // Store placa in uppercase for consistency
        // id_empresa: id_empresa_from_token // Uncomment for placa unique per company
      },
    });

    if (existingPlaca) {
      // If checking unique per company and existingPlaca.id_empresa === id_empresa_from_token:
      // return res.status(400).json({ message: `La placa '${placa}' ya está registrada para esta empresa.` });
      return res.status(400).json({ message: `La placa '${placa}' ya está registrada.` }); // Global check
    }

    const nuevoBus = await Bus.create({
      id_empresa: id_empresa_from_token,
      placa: placa.toUpperCase(),
      modelo,
      año_modelo,
      capacidad,
      tipo_asiento,
      comodidades: comodidades || {}, // Ensure comodidades is at least an empty object
      estado,
    });

    res.status(201).json(nuevoBus);

  } catch (error) {
    console.error('Error en registrarBus:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
        // This would trigger if a unique constraint on 'placa' (and potentially 'id_empresa') is violated
        return res.status(400).json({ message: `La placa '${req.body.placa}' ya está registrada.` });
    }
    res.status(500).json({ message: 'Error interno del servidor al registrar el bus.', error: error.message });
  }
};

// List all buses for the company
exports.listarBusesEmpresa = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }

    const buses = await Bus.findAll({
      where: { id_empresa: id_empresa_from_token },
      order: [['placa', 'ASC']], // Example order
    });

    res.status(200).json(buses);

  } catch (error) {
    console.error('Error en listarBusesEmpresa:', error);
    res.status(500).json({ message: 'Error interno del servidor al listar los buses.', error: error.message });
  }
};

// Update an existing bus for the company
exports.actualizarBus = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;
    const { id_bus } = req.params;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }
    if (isNaN(parseInt(id_bus, 10))) {
        return res.status(400).json({ message: 'El ID del bus debe ser un número.' });
    }

    const bus = await Bus.findOne({
      where: {
        id_bus: parseInt(id_bus, 10),
        id_empresa: id_empresa_from_token,
      },
    });

    if (!bus) {
      return res.status(404).json({ message: 'Bus no encontrado o no pertenece a esta empresa.' });
    }

    const {
      placa,
      modelo,
      año_modelo,
      capacidad,
      tipo_asiento,
      comodidades,
      estado,
    } = req.body;

    // Validations for updatable fields
    if (placa && placa.toUpperCase() !== bus.placa) {
      // Check for placa uniqueness if it's being changed
      const existingPlaca = await Bus.findOne({
        where: {
          placa: placa.toUpperCase(),
          // id_empresa: id_empresa_from_token, // Uncomment for per-company check
          id_bus: { [Op.ne]: bus.id_bus }, // Exclude current bus from check
        },
      });
      if (existingPlaca) {
        return res.status(400).json({ message: `La placa '${placa}' ya está registrada.` });
      }
      bus.placa = placa.toUpperCase();
    }

    if (modelo !== undefined) bus.modelo = modelo;
    if (año_modelo !== undefined) {
        const currentYear = new Date().getFullYear();
        if (typeof año_modelo !== 'number' || año_modelo < 1900 || año_modelo > currentYear + 2) {
            return res.status(400).json({ message: `Año del modelo inválido. Debe ser un número entre 1900 y ${currentYear + 2}.` });
        }
        bus.año_modelo = año_modelo;
    }
    if (capacidad !== undefined) {
        if (typeof capacidad !== 'number' || capacidad <= 0) {
            return res.status(400).json({ message: 'La capacidad debe ser un número positivo.' });
        }
        bus.capacidad = capacidad;
    }
    if (tipo_asiento !== undefined) bus.tipo_asiento = tipo_asiento;
    if (comodidades !== undefined) bus.comodidades = comodidades; // Assume it's valid JSON or an object
    if (estado !== undefined) bus.estado = estado; // boolean

    await bus.save();
    res.status(200).json(bus);

  } catch (error) {
    console.error('Error en actualizarBus:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: `Error de restricción única, posiblemente la placa ya existe.` });
    }
    res.status(500).json({ message: 'Error interno del servidor al actualizar el bus.', error: error.message });
  }
};

// Deactivate (soft delete) a bus for the company
exports.desactivarBus = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;
    const { id_bus } = req.params;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }
     if (isNaN(parseInt(id_bus, 10))) {
        return res.status(400).json({ message: 'El ID del bus debe ser un número.' });
    }

    const bus = await Bus.findOne({
      where: {
        id_bus: parseInt(id_bus, 10),
        id_empresa: id_empresa_from_token,
      },
    });

    if (!bus) {
      return res.status(404).json({ message: 'Bus no encontrado o no pertenece a esta empresa.' });
    }

    // Logical delete by setting estado to false
    bus.estado = false;
    await bus.save();

    res.status(200).json({ message: 'Bus desactivado exitosamente.' });
    // Consider res.status(204).send(); for no content response

  } catch (error) {
    console.error('Error en desactivarBus:', error);
    res.status(500).json({ message: 'Error interno del servidor al desactivar el bus.', error: error.message });
  }
};
