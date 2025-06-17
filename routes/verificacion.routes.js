const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/checkRole');

router.post('/verificar-documento', verifyToken, checkRole('VerificadorDocumento'), (req, res) => {
  res.json({ message: 'Documento analizado por IA' });
});

module.exports = router;
