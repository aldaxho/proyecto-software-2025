const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/checkRole');

// Solo para AdministradorTerminal
router.get('/panel', verifyToken, checkRole('AdministradorTerminal'), (req, res) => {
  res.json({ message: 'Bienvenido al panel del administrador de terminal' });
});

// Solo para Cajero y AdministradorEmpresa
router.get('/ventas', verifyToken, checkRole('Cajero', 'AdministradorEmpresa'), (req, res) => {
  res.json({ message: 'Acceso a módulo de ventas' });
});

module.exports = router;
