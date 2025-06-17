const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/checkRole');

router.get('/emitir', verifyToken, checkRole('Cajero'), (req, res) => {
  res.json({ message: 'Emitir boleto desde caja' });
});

module.exports = router;
