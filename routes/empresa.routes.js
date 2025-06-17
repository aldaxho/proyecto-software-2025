const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/checkRole');

// Protegido para AdministradorEmpresa
router.get('/mis-buses', verifyToken, checkRole('AdministradorEmpresa'), (req, res) => {
  res.json({ message: 'Listado de buses de la empresa' });
});

module.exports = router;
