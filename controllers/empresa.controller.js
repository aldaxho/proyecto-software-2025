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

// Get company profile for the logged-in AdministradorEmpresa
exports.getMiEmpresaPerfil = async (req, res) => {
  try {
    // id_empresa is expected to be on req.user from the JWT payload
    const id_empresa_from_token = req.user && req.user.id_empresa;

    if (!id_empresa_from_token) {
      // This case should ideally be caught by checkRole('AdministradorEmpresa')
      // if only Admins de Empresa have id_empresa in their token.
      // However, an explicit check here adds robustness.
      return res.status(403).json({ message: 'Acceso denegado. No hay empresa asociada a este usuario o rol incorrecto.' });
    }

    const empresa = await Empresa.findByPk(id_empresa_from_token);

    if (!empresa) {
      // This would be an unusual state: token has an id_empresa, but it doesn't exist in DB.
      return res.status(404).json({ message: 'Empresa no encontrada.' });
    }

    res.status(200).json(empresa);

  } catch (error) {
    console.error('Error en getMiEmpresaPerfil:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener el perfil de la empresa.', error: error.message });
  }
};
