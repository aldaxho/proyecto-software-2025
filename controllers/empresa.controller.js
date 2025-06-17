const Empresa = require('../models/empresa'); // Corrected path

exports.createEmpresa = async (req, res) => {
  try {
    const { nombre, nit, contacto, correo, direccion } = req.body;

    // Basic validation
    if (!nombre || !nit || !contacto || !correo || !direccion) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    // Check if NIT or email already exists
    const existingEmpresa = await Empresa.findOne({ $or: [{ nit }, { correo }] });
    if (existingEmpresa) {
      return res.status(400).json({ message: 'El NIT o correo electrónico ya están registrados.' });
    }

    const nuevaEmpresa = new Empresa({
      nombre,
      nit,
      contacto,
      correo,
      direccion,
      estado: true, // Default state
    });

    await nuevaEmpresa.save();

    res.status(201).json({
      message: 'Empresa creada exitosamente.',
      empresa: nuevaEmpresa,
    });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ message: 'Error al crear la empresa.', error: error.message });
  }
};
