const { Rol } = require('../models');

// Obtener todos los roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Rol.findAll();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Crear nuevo rol
exports.createRol = async (req, res) => {
  try {
    const rol = await Rol.create({ nombre: req.body.nombre });
    res.status(201).json(rol);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
