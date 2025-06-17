const { Empresa, Sequelize } = require('../models'); // ✅ Importa Sequelize también
const { Op } = Sequelize;

exports.createEmpresa = async (req, res) => {
  try {
    const { nombre, nit, contacto, correo, direccion } = req.body;

    if (!nombre || !nit || !contacto || !correo || !direccion) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    // Verificar duplicado con Sequelize
    const existe = await Empresa.findOne({
      where: {
        [Op.or]: [{ nit }, { correo }]
      }
    });

    if (existe) {
      return res.status(400).json({ message: 'El NIT o correo ya está registrado.' });
    }

    const nuevaEmpresa = await Empresa.create({
      nombre,
      nit,
      contacto,
      correo,
      direccion,
      estado: true
    });

    res.status(201).json({ message: 'Empresa creada exitosamente.', empresa: nuevaEmpresa });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear la empresa.', error: error.message });
  }
};
