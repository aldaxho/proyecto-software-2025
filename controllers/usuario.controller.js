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
// Remover un rol de un usuario
exports.removeRolFromUsuario = async (req, res) => {
  try {
    const { id_usuario, id_rol } = req.body;

    // Validar que los IDs fueron proporcionados
    if (!id_usuario || !id_rol) {
      return res.status(400).json({ message: 'Se requieren id_usuario y id_rol.' });
    }

    // Verificar que el usuario exista
    const usuario = await Usuario.findByPk(id_usuario);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Verificar que el rol exista
    const rol = await Rol.findByPk(id_rol);
    if (!rol) {
      return res.status(404).json({ message: 'Rol no encontrado.' });
    }

    // Eliminar la asociación de la tabla UsuarioRol
    const result = await UsuarioRol.destroy({
      where: {
        id_usuario: id_usuario,
        id_rol: id_rol,
      },
    });

    if (result > 0) {
      res.status(200).json({ message: 'Rol eliminado del usuario correctamente.' });
    } else {
      res.status(404).json({ message: 'El usuario no tenía asignado este rol o ya fue eliminado.' });
    }
  } catch (error) {
    console.error('Error al eliminar rol del usuario:', error);
    if (error.name && error.name.includes('Sequelize')) {
      return res.status(400).json({ message: 'Error al procesar la solicitud.', details: error.errors ? error.errors.map(e => e.message) : error.message });
    }
    res.status(500).json({ message: 'Error interno del servidor al eliminar el rol del usuario.', error: error.message });
  }
};

// Desactivar (eliminar lógicamente) un usuario por AdministradorTerminal
exports.deleteUsuarioPorAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Eliminación lógica: actualizar el estado a false
    usuario.estado = false;
    await usuario.save();

    res.status(200).json({ message: 'Usuario desactivado exitosamente.' });

  } catch (error) {
    console.error('Error al desactivar usuario por admin:', error);
    // Verificar si es un error de Sequelize (e.g. constraint, etc.)
    if (error.name && error.name.includes('Sequelize')) {
        return res.status(400).json({ message: 'Error al procesar la solicitud.', details: error.errors ? error.errors.map(e => e.message) : error.message });
    }
    res.status(500).json({ message: 'Error interno del servidor al desactivar el usuario.', error: error.message });
  }
};

// Actualizar un usuario por AdministradorTerminal
exports.updateUsuarioPorAdmin = async (req, res) => {
  try {
    const { id } = req.params; // Corrected to id to match route definition
    const {
      nombre,
      apellido,
      correo,
      tipo_documento,
      numero_documento,
      fecha_nacimiento,
      id_empresa, // Can be a number, null, or undefined
      estado, // boolean
    } = req.body;

    const usuario = await Usuario.findByPk(id); // Use id from params

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // --- Validaciones ---
    if (correo && correo !== usuario.correo) {
      const existingUserWithNewEmail = await Usuario.findOne({
        where: {
          correo,
          id_usuario: { [Op.ne]: id } // Exclude current user by id
        }
      });
      if (existingUserWithNewEmail) {
        return res.status(400).json({ message: 'El nuevo correo electrónico ya está registrado por otro usuario.' });
      }
      usuario.correo = correo;
    }

    // Validate id_empresa if provided and not null
    if (id_empresa !== undefined && id_empresa !== null) {
      const empresaExistente = await Empresa.findByPk(id_empresa);
      if (!empresaExistente) {
        return res.status(400).json({ message: 'La empresa especificada no existe.' });
      }
      usuario.id_empresa = id_empresa;
    } else if (id_empresa === null) {
      usuario.id_empresa = null; // Allow unlinking from company
    }
    // --- Fin Validaciones ---


    // Update fields if they are provided in the request body
    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellido !== undefined) usuario.apellido = apellido;
    if (tipo_documento !== undefined) usuario.tipo_documento = tipo_documento;
    if (numero_documento !== undefined) usuario.numero_documento = numero_documento;
    if (fecha_nacimiento !== undefined) usuario.fecha_nacimiento = fecha_nacimiento;
    if (estado !== undefined) usuario.estado = estado; // Assuming estado is a boolean

    await usuario.save();

    // Preparar respuesta sin contraseña
    const usuarioParaRespuesta = { ...usuario.toJSON() };
    delete usuarioParaRespuesta.contraseña;
    
    // Fetch roles separately to include them in the response, similar to createUsuarioPorAdmin
    const rolesDelUsuario = await Rol.findAll({
      include: [{
        model: Usuario,
        as: 'usuarios',
        where: { id_usuario: id }, // Use id from params
        attributes: []
      }],
      through: { attributes: [] }
    });
    usuarioParaRespuesta.roles = rolesDelUsuario;


    res.status(200).json({
      message: 'Usuario actualizado exitosamente por el administrador.',
      usuario: usuarioParaRespuesta,
    });

  } catch (error) {
    console.error('Error al actualizar usuario por admin:', error);
    if (error.name && error.name.includes('Sequelize')) {
      return res.status(400).json({ message: 'Error de validación o datos incorrectos.', details: error.errors ? error.errors.map(e => e.message) : error.message });
    }
    res.status(500).json({ message: 'Error interno del servidor al actualizar el usuario.', error: error.message });
  }
};

// Crear un nuevo usuario por AdministradorTerminal
exports.createUsuarioPorAdmin = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      correo,
      contraseña,
      tipo_documento,
      numero_documento,
      fecha_nacimiento,
      id_empresa, // Optional
      roles, // Array of Rol IDs
    } = req.body;

    // --- Validaciones ---
    if (!nombre || !apellido || !correo || !contraseña || !tipo_documento || !numero_documento || !fecha_nacimiento || !roles) {
      return res.status(400).json({ message: 'Todos los campos marcados como obligatorios deben ser proporcionados, incluyendo los roles.' });
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ message: 'Roles debe ser un arreglo no vacío de IDs de rol.' });
    }

    const existingUser = await Usuario.findOne({ where: { correo } });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // Validar que los roles existan
    const rolesExistentes = await Rol.findAll({ where: { id_rol: roles } });
    if (rolesExistentes.length !== roles.length) {
        const rolesEncontrados = rolesExistentes.map(r => r.id_rol);
        const rolesFaltantes = roles.filter(r => !rolesEncontrados.includes(r));
        return res.status(400).json({ message: `Los siguientes roles no son válidos o no existen: ${rolesFaltantes.join(', ')}` });
    }
    // --- Fin Validaciones ---

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const nuevoUsuarioData = {
      nombre,
      apellido,
      correo,
      contraseña: hashedPassword,
      tipo_documento,
      numero_documento,
      fecha_nacimiento,
      estado: true, // Default state
    };

    if (id_empresa) {
      // Aquí podrías añadir una validación para asegurar que la empresa exista, si es necesario.
      // const empresaExistente = await Empresa.findByPk(id_empresa);
      // if (!empresaExistente) {
      //   return res.status(400).json({ message: 'La empresa especificada no existe.' });
      // }
      nuevoUsuarioData.id_empresa = id_empresa;
    }


    const usuario = await Usuario.create(nuevoUsuarioData);

    // Asignar roles
    if (roles && roles.length > 0) {
      await UsuarioRol.bulkCreate(
        roles.map(id_rol => ({ id_usuario: usuario.id_usuario, id_rol }))
      );
    }

    // Preparar respuesta sin contraseña
    const usuarioParaRespuesta = { ...usuario.toJSON() };
    delete usuarioParaRespuesta.contraseña;
    usuarioParaRespuesta.roles = rolesExistentes; // Añadir los objetos de rol completos

    res.status(201).json({
      message: 'Usuario creado exitosamente por el administrador.',
      usuario: usuarioParaRespuesta,
    });

  } catch (error) {
    console.error('Error al crear usuario por admin:', error);
    // Verificar si es un error de Sequelize (e.g. validación, constraint)
    if (error.name && error.name.includes('Sequelize')) {
        return res.status(400).json({ message: 'Error de validación o datos incorrectos.', details: error.errors ? error.errors.map(e => e.message) : error.message });
    }
    res.status(500).json({ message: 'Error interno del servidor al crear el usuario.', error: error.message });
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
