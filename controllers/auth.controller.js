'use strict';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario, Rol, UsuarioRol } = require('../models');
require('dotenv').config();

// === INICIAR SESIÓN ===
exports.login = async (req, res) => {
  const { correo, contraseña } = req.body;
  try {
    const usuario = await Usuario.findOne({ where: { correo } });
    if (!usuario) return res.status(401).json({ message: 'Correo inválido' });

    const valid = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta' });

    const roles = await usuario.getRols(); // Método de relación

    // Construct payload for JWT
    const payload = {
      id: usuario.id, // Standardized to use 'id' as PK
      correo: usuario.correo,
      roles: roles.map(r => r.nombre),
    };

    // Conditionally add id_empresa to payload
    if (usuario.id_empresa !== null && usuario.id_empresa !== undefined) {
      payload.id_empresa = usuario.id_empresa;
    }

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRES_IN }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message });
  }
};

// === REGISTRAR USUARIO CLIENTE ===
exports.registrarUsuarioCliente = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      correo,
      contraseña,
      tipo_documento,
      numero_documento,
      fecha_nacimiento
    } = req.body;

    const existe = await Usuario.findOne({ where: { correo } });
    if (existe) return res.status(400).json({ mensaje: 'Correo ya registrado' });

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      correo,
      contraseña: hashedPassword,
      tipo_documento,
      numero_documento,
      fecha_nacimiento,
      estado: true,
      id_empresa: null
    });

    const rolCliente = await Rol.findOne({ where: { nombre: 'Cliente' } });
    if (!rolCliente) return res.status(500).json({ mensaje: 'Rol Cliente no existe' });

    await UsuarioRol.create({
      id_usuario: nuevoUsuario.id, // FK in UsuarioRol should point to Usuario's PK, which is 'id'
      id_rol: rolCliente.id_rol // Assuming PK of Rol is id_rol
    });
    //crear token jwt
    const clientePayload = {
      id: nuevoUsuario.id, // Standardized to use 'id' as PK
      correo: nuevoUsuario.correo,
      roles: ['Cliente']
      // id_empresa is explicitly null for Clientes as per model, so not added.
    };

    const token = jwt.sign(
      clientePayload,
      process.env.JWT_SECRET,
      {expiresIn: process.env.TOKEN_EXPIRES_IN}
    );
    // Eliminar la contraseña del objeto de respuesta
    delete nuevoUsuario.dataValues.contraseña;


    res.status(201).json({
      mensaje: 'Usuario cliente registrado',
      usuario: nuevoUsuario,
      token: token // Added token to the response
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno al registrar' });
  }
};
