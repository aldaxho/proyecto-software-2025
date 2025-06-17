const { ConfiguracionIa, Empresa, HistorialPrecio, HorarioSalida, Ruta, sequelize } = require('../models'); // Added models
const { Op } = require('sequelize'); // For query operators

// Upsert (Create or Update) an AI Configuration
exports.upsertConfiguracionIa = async (req, res) => {
  try {
    const {
      id_empresa, // Can be null or undefined for global config
      habilitado,
      precio_minimo,
      precio_maximo,
      usar_modelo_bus,
      usar_festivos,
      usar_datos_climaticos,
      usar_demanda_historial,
    } = req.body;

    // Basic Validations (types, presence of required fields if any)
    if (habilitado === undefined || typeof habilitado !== 'boolean') {
      return res.status(400).json({ message: "El campo 'habilitado' (boolean) es obligatorio." });
    }
    // Add more validations as needed for precio_minimo, precio_maximo, etc.
    if (precio_minimo !== undefined && typeof precio_minimo !== 'number') {
        return res.status(400).json({ message: "El campo 'precio_minimo' debe ser un número." });
    }
    if (precio_maximo !== undefined && typeof precio_maximo !== 'number') {
        return res.status(400).json({ message: "El campo 'precio_maximo' debe ser un número." });
    }
    if (precio_minimo !== undefined && precio_maximo !== undefined && precio_minimo > precio_maximo) {
        return res.status(400).json({ message: "precio_minimo no puede ser mayor que precio_maximo." });
    }


    const searchCriteria = { id_empresa: id_empresa || null };
    let statusCode = 200; // Default for update

    if (id_empresa) {
      const empresaExistente = await Empresa.findByPk(id_empresa);
      if (!empresaExistente) {
        return res.status(404).json({ message: `Empresa con id ${id_empresa} no encontrada.` });
      }
    }

    let configuracion = await ConfiguracionIa.findOne({ where: searchCriteria });

    const dataToUpsert = {
        id_empresa: id_empresa || null,
        habilitado,
        precio_minimo,
        precio_maximo,
        usar_modelo_bus,
        usar_festivos,
        usar_datos_climaticos,
        usar_demanda_historial
    };

    if (configuracion) {
      // Update existing
      await configuracion.update(dataToUpsert);
    } else {
      // Create new
      configuracion = await ConfiguracionIa.create(dataToUpsert);
      statusCode = 201; // Created
    }

    res.status(statusCode).json(configuracion);

  } catch (error) {
    console.error('Error en upsertConfiguracionIa:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// Get Price History for AI (for AdministradorEmpresa)
exports.getHistorialPreciosIaEmpresa = async (req, res) => {
  try {
    const id_empresa_admin = req.user && req.user.id_empresa;

    if (!id_empresa_admin) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada a su usuario.' });
    }

    const { id_ruta, fecha_inicio, fecha_fin } = req.query;
    const whereClauseHistorial = {}; // For HistorialPrecio model

    // Base include options to filter by company first
    const includeOptions = [
      {
        model: HorarioSalida,
        as: 'horario',
        attributes: ['id_horario_salida', 'hora_salida'],
        required: true, // INNER JOIN to ensure the HorarioSalida exists
        include: [
          {
            model: Ruta,
            as: 'ruta',
            attributes: ['id_ruta', 'nombre_ruta', 'origen', 'destino'],
            where: { id_empresa: id_empresa_admin }, // Filter by the admin's company
            required: true, // INNER JOIN to ensure the Ruta belongs to the company
          },
        ],
      },
    ];

    // Further filtering by id_ruta if provided
    if (id_ruta) {
      if (isNaN(parseInt(id_ruta, 10))) {
        return res.status(400).json({ message: 'id_ruta debe ser un número.' });
      }
      // Add id_ruta filter to the Ruta include's where clause
      includeOptions[0].include[0].where.id_ruta = parseInt(id_ruta, 10);
    }

    // Filtering by date range (applied to HistorialPrecio model's fecha_prediccion field)
    if (fecha_inicio && fecha_fin) {
      whereClauseHistorial.fecha_prediccion = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin + 'T23:59:59.999Z')],
      };
    } else if (fecha_inicio) {
      whereClauseHistorial.fecha_prediccion = {
        [Op.gte]: new Date(fecha_inicio),
      };
    } else if (fecha_fin) {
      whereClauseHistorial.fecha_prediccion = {
        [Op.lte]: new Date(fecha_fin + 'T23:59:59.999Z'),
      };
    }

    const historiales = await HistorialPrecio.findAll({
      attributes: ['id_historial_precio', 'precio_predicho', 'precio_final_usado', 'fecha_prediccion'],
      include: includeOptions,
      where: whereClauseHistorial,
      order: [['fecha_prediccion', 'DESC']],
    });

    res.status(200).json(historiales);

  } catch (error) {
    console.error('Error en getHistorialPreciosIaEmpresa:', error);
    if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// --- Funciones para AdministradorEmpresa ---

// Get AI Configuration for the logged-in AdministradorEmpresa
exports.getIaConfiguracionEmpresa = async (req, res) => {
  try {
    const id_empresa_admin = req.user && req.user.id_empresa;

    if (!id_empresa_admin) {
      // This should ideally be caught by checkRole middleware
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada a su usuario.' });
    }

    const configuracion = await ConfiguracionIa.findOne({
      where: { id_empresa: id_empresa_admin },
    });

    if (!configuracion) {
      // It's possible an AdminTerminal hasn't created a specific config for this company yet.
      // Depending on desired behavior, could return default global, or 404.
      // For now, 404 as per "AdminTerminal es quien crearía el registro inicial".
      return res.status(404).json({ message: 'Configuración de IA no encontrada para esta empresa. Contacte al Administrador del Terminal.' });
    }

    res.status(200).json(configuracion);

  } catch (error) {
    console.error('Error en getIaConfiguracionEmpresa:', error);
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// Update AI Configuration for the logged-in AdministradorEmpresa
exports.updateIaConfiguracionEmpresa = async (req, res) => {
  try {
    const id_empresa_admin = req.user && req.user.id_empresa;

    if (!id_empresa_admin) {
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada a su usuario.' });
    }

    let configuracion = await ConfiguracionIa.findOne({
      where: { id_empresa: id_empresa_admin },
    });

    if (!configuracion) {
      return res.status(404).json({
        message: 'Configuración de IA no encontrada para modificar. El Administrador del Terminal debe crear una configuración inicial para su empresa.'
      });
    }

    const {
      habilitado,
      precio_minimo,
      precio_maximo,
      usar_modelo_bus,
      usar_festivos,
      usar_datos_climaticos,
      usar_demanda_historial,
      rutas_config_json, // New field
    } = req.body;

    // --- Validations ---
    if (habilitado !== undefined && typeof habilitado !== 'boolean') {
      return res.status(400).json({ message: "El campo 'habilitado' debe ser un booleano." });
    }
    if (precio_minimo !== undefined && (typeof precio_minimo !== 'number' || precio_minimo < 0) ) { // Allow 0
        return res.status(400).json({ message: "El campo 'precio_minimo' debe ser un número no negativo." });
    }
    if (precio_maximo !== undefined && (typeof precio_maximo !== 'number' || precio_maximo < 0) ) { // Allow 0
        return res.status(400).json({ message: "El campo 'precio_maximo' debe ser un número no negativo." });
    }

    const finalPrecioMinimo = precio_minimo !== undefined ? precio_minimo : configuracion.precio_minimo;
    const finalPrecioMaximo = precio_maximo !== undefined ? precio_maximo : configuracion.precio_maximo;

    if (finalPrecioMinimo !== null && finalPrecioMaximo !== null && finalPrecioMinimo > finalPrecioMaximo) {
        return res.status(400).json({ message: "precio_minimo no puede ser mayor que precio_maximo." });
    }

    if (rutas_config_json !== undefined) {
        try {
            // Ensure it's a valid JSON. If it's already an object due to body-parser, this won't throw for strings.
            // If it's a string, JSON.parse will validate. If it's an object, it's fine.
            if (typeof rutas_config_json === 'string') {
                JSON.parse(rutas_config_json);
            } else if (typeof rutas_config_json !== 'object' || rutas_config_json === null) {
                // It's not a string and not an object (or is null but not explicitly allowed to be set to null via this check)
                 return res.status(400).json({ message: 'rutas_config_json debe ser un objeto JSON válido o una cadena JSON.' });
            }
        } catch (e) {
            return res.status(400).json({ message: 'rutas_config_json no es un JSON válido.', error: e.message });
        }
        configuracion.rutas_config_json = rutas_config_json;
    }
    // --- End Validations ---


    // Update fields if they are provided in the request body
    if (habilitado !== undefined) configuracion.habilitado = habilitado;
    if (precio_minimo !== undefined) configuracion.precio_minimo = precio_minimo;
    if (precio_maximo !== undefined) configuracion.precio_maximo = precio_maximo;
    if (usar_modelo_bus !== undefined) configuracion.usar_modelo_bus = usar_modelo_bus;
    if (usar_festivos !== undefined) configuracion.usar_festivos = usar_festivos;
    if (usar_datos_climaticos !== undefined) configuracion.usar_datos_climaticos = usar_datos_climaticos;
    if (usar_demanda_historial !== undefined) configuracion.usar_demanda_historial = usar_demanda_historial;
    // rutas_config_json already assigned if valid

    await configuracion.save();
    res.status(200).json(configuracion);

  } catch (error) {
    console.error('Error en updateIaConfiguracionEmpresa:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// Get Price History for AI
exports.getHistorialPreciosIa = async (req, res) => {
  try {
    const { id_ruta, fecha_inicio, fecha_fin } = req.query;
    const whereClauseHistorial = {};
    const includeOptions = [
      {
        model: HorarioSalida,
        as: 'horario', // Make sure this alias matches your model definition
        attributes: ['id_horario_salida', 'hora_salida'], // Include relevant attributes
        include: [
          {
            model: Ruta,
            as: 'ruta', // Make sure this alias matches your model definition
            attributes: ['id_ruta', 'nombre_ruta', 'origen', 'destino'], // Include relevant attributes
          },
        ],
      },
    ];

    // Filtering by id_ruta (applied to the nested Ruta model)
    if (id_ruta) {
      if (isNaN(parseInt(id_ruta, 10))) {
        return res.status(400).json({ message: 'id_ruta debe ser un número.' });
      }
      // To filter by an attribute in an included model, Sequelize typically requires
      // the `where` clause to be part of that include object or use '$association.column$' syntax
      // For clarity and robustness, adding it to the include:
      includeOptions[0].include[0].where = { id_ruta: parseInt(id_ruta, 10) };
      includeOptions[0].include[0].required = true; // Ensures INNER JOIN for Ruta
      includeOptions[0].required = true; // Ensures INNER JOIN for HorarioSalida
    }

    // Filtering by date range (applied to HistorialPrecio model)
    if (fecha_inicio && fecha_fin) {
      whereClauseHistorial.fecha_prediccion = { // Assuming field is fecha_prediccion or similar
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin + 'T23:59:59.999Z')],
      };
    } else if (fecha_inicio) {
      whereClauseHistorial.fecha_prediccion = {
        [Op.gte]: new Date(fecha_inicio),
      };
    } else if (fecha_fin) {
      whereClauseHistorial.fecha_prediccion = {
        [Op.lte]: new Date(fecha_fin + 'T23:59:59.999Z'),
      };
    }

    const historiales = await HistorialPrecio.findAll({
      attributes: ['id_historial_precio', 'precio_predicho', 'precio_final_usado', 'fecha_prediccion'], // Adjust attributes as needed
      include: includeOptions,
      where: whereClauseHistorial,
      order: [['fecha_prediccion', 'DESC']], // Example: newest first
    });

    res.status(200).json(historiales);

  } catch (error) {
    console.error('Error en getHistorialPreciosIa:', error);
    if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === 'ER_TRUNCATED_WRONG_VALUE') {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// Get a specific AI Configuration (by id_empresa or global)
exports.getConfiguracionIa = async (req, res) => {
  try {
    const { id_empresa_param } = req.params; // Will be 'global' or an ID

    let searchIdEmpresa;
    if (id_empresa_param && id_empresa_param.toLowerCase() === 'global') {
      searchIdEmpresa = null;
    } else if (id_empresa_param && !isNaN(parseInt(id_empresa_param, 10))) {
      searchIdEmpresa = parseInt(id_empresa_param, 10);
    } else {
        return res.status(400).json({ message: "Identificador de empresa inválido. Use 'global' o un ID numérico." });
    }

    const configuracion = await ConfiguracionIa.findOne({
      where: { id_empresa: searchIdEmpresa },
    });

    if (!configuracion) {
      return res.status(404).json({ message: 'Configuración de IA no encontrada.' });
    }

    res.status(200).json(configuracion);

  } catch (error) {
    console.error('Error en getConfiguracionIa:', error);
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// Get All AI Configurations
exports.getAllConfiguracionesIa = async (req, res) => {
  try {
    const configuraciones = await ConfiguracionIa.findAll();
    res.status(200).json(configuraciones);
  } catch (error) {
    console.error('Error en getAllConfiguracionesIa:', error);
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};
