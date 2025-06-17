const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/checkRole');

router.post('/escanear', verifyToken, checkRole('SupervisorAcceso'), (req, res) => {
  res.json({ message: 'QR escaneado y validado' });
});

module.exports = router;
