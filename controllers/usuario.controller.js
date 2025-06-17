const { Usuario, Rol, UsuarioRol } = require('../models');

// Obtener todos los usuarios
exports.getAllUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      include: {
        model: Rol,
        as: 'roles',
        through: { attributes: [] }
      }
    });
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Obtener roles de un usuario
exports.getRolesByUsuarioId = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: {
        model: Rol,
        as: 'roles',
        through: { attributes: [] }
      }
    });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json(usuario.roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Asignar rol a un usuario
exports.addRolToUsuario = async (req, res) => {
  try {
    const { id_usuario, id_rol } = req.body;

    await UsuarioRol.create({ id_usuario, id_rol });

    res.status(201).json({ message: 'Rol asignado al usuario correctamente' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
