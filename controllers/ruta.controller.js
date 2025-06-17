const { Ruta } = require('../models'); // Assuming Ruta model is in /models
const { Op } = require('sequelize'); // For uniqueness check during update

// Create a new route for the company
exports.crearRuta = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }

    const {
      origen,
      destino,
      nombre_ruta, // Added nombre_ruta as it's often useful
      tiempo_estimado, // e.g., "2h 30m" or number of minutes
      estado = true, // Default to true (activo)
    } = req.body;

    // Basic Validations
    if (!origen || !destino || !nombre_ruta) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes: origen, destino, nombre_ruta.' });
    }

    if (origen.trim().toLowerCase() === destino.trim().toLowerCase()) {
      return res.status(400).json({ message: 'El origen y el destino no pueden ser iguales.' });
    }

    // Optional: Validate tiempo_estimado format if it's a string, or ensure it's a positive number if numeric.
    // For now, we'll store it as provided if it exists.

    // Consider uniqueness for (id_empresa, origen, destino) or (id_empresa, nombre_ruta)
    // For now, not strictly enforced in this controller logic, but can be added via model constraints.
    // Example check for nombre_ruta uniqueness within the company:
    /*
    const existingNombreRuta = await Ruta.findOne({
        where: { nombre_ruta, id_empresa: id_empresa_from_token }
    });
    if (existingNombreRuta) {
        return res.status(400).json({ message: `El nombre de ruta '${nombre_ruta}' ya existe para esta empresa.` });
    }
    */

    const nuevaRuta = await Ruta.create({
      id_empresa: id_empresa_from_token,
      nombre_ruta,
      origen,
      destino,
      tiempo_estimado, // Store as is, could be string or number
      estado,
    });

    res.status(201).json(nuevaRuta);

  } catch (error) {
    console.error('Error en crearRuta:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    // Handle potential unique constraint errors if defined in the model
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Error de restricción única (e.g., nombre_ruta ya existe).', details: error.fields });
    }
    res.status(500).json({ message: 'Error interno del servidor al crear la ruta.', error: error.message });
  }
};

// List all routes for the company
exports.listarRutasEmpresa = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }

    const rutas = await Ruta.findAll({
      where: { id_empresa: id_empresa_from_token },
      order: [['nombre_ruta', 'ASC']], // Example order
    });

    res.status(200).json(rutas);

  } catch (error) {
    console.error('Error en listarRutasEmpresa:', error);
    res.status(500).json({ message: 'Error interno del servidor al listar las rutas.', error: error.message });
  }
};

// Update an existing route for the company
exports.actualizarRuta = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;
    const { id_ruta } = req.params;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }
    if (isNaN(parseInt(id_ruta, 10))) {
        return res.status(400).json({ message: 'El ID de la ruta debe ser un número.' });
    }

    const ruta = await Ruta.findOne({
      where: {
        id_ruta: parseInt(id_ruta, 10),
        id_empresa: id_empresa_from_token,
      },
    });

    if (!ruta) {
      return res.status(404).json({ message: 'Ruta no encontrada o no pertenece a esta empresa.' });
    }

    const {
      nombre_ruta,
      origen,
      destino,
      tiempo_estimado,
      estado,
    } = req.body;

    // Validations
    if (origen !== undefined && destino !== undefined && origen.trim().toLowerCase() === destino.trim().toLowerCase()) {
      return res.status(400).json({ message: 'El origen y el destino no pueden ser iguales.' });
    }
    if (origen !== undefined && !origen.trim()) {
        return res.status(400).json({ message: 'El origen no puede estar vacío.' });
    }
    if (destino !== undefined && !destino.trim()) {
        return res.status(400).json({ message: 'El destino no puede estar vacío.' });
    }
    if (nombre_ruta !== undefined && !nombre_ruta.trim()) {
        return res.status(400).json({ message: 'El nombre de la ruta no puede estar vacío.' });
    }


    // Check for nombre_ruta uniqueness if it's being changed
    if (nombre_ruta && nombre_ruta.trim() !== ruta.nombre_ruta) {
      const existingNombreRuta = await Ruta.findOne({
        where: {
          nombre_ruta: nombre_ruta.trim(),
          id_empresa: id_empresa_from_token,
          id_ruta: { [Op.ne]: ruta.id_ruta }, // Exclude current route
        },
      });
      if (existingNombreRuta) {
        return res.status(400).json({ message: `El nombre de ruta '${nombre_ruta.trim()}' ya existe para esta empresa.` });
      }
      ruta.nombre_ruta = nombre_ruta.trim();
    }

    // Update fields if they are provided in the request body
    if (origen !== undefined) ruta.origen = origen.trim();
    if (destino !== undefined) ruta.destino = destino.trim();
    if (tiempo_estimado !== undefined) ruta.tiempo_estimado = tiempo_estimado;
    if (estado !== undefined) ruta.estado = estado; // boolean

    await ruta.save();
    res.status(200).json(ruta);

  } catch (error) {
    console.error('Error en actualizarRuta:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
        // This could happen if a unique constraint is violated at DB level for fields other than nombre_ruta,
        // or if the nombre_ruta check above fails due to a race condition (less likely with await).
        return res.status(400).json({ message: 'Error de restricción única.', details: error.fields });
    }
    res.status(500).json({ message: 'Error interno del servidor al actualizar la ruta.', error: error.message });
  }
};

// Deactivate (soft delete) a route for the company
exports.desactivarRuta = async (req, res) => {
  try {
    const id_empresa_from_token = req.user && req.user.id_empresa;
    const { id_ruta } = req.params;

    if (!id_empresa_from_token) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada.' });
    }
    if (isNaN(parseInt(id_ruta, 10))) {
        return res.status(400).json({ message: 'El ID de la ruta debe ser un número.' });
    }

    const ruta = await Ruta.findOne({
      where: {
        id_ruta: parseInt(id_ruta, 10),
        id_empresa: id_empresa_from_token,
      },
    });

    if (!ruta) {
      return res.status(404).json({ message: 'Ruta no encontrada o no pertenece a esta empresa.' });
    }

    // Logical delete by setting estado to false
    ruta.estado = false;
    await ruta.save();

    res.status(200).json({ message: 'Ruta desactivada exitosamente.' });
    // Or res.status(204).send();

  } catch (error) {
    console.error('Error en desactivarRuta:', error);
    res.status(500).json({ message: 'Error interno del servidor al desactivar la ruta.', error: error.message });
  }
};
