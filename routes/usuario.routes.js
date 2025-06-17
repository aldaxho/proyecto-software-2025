
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/checkRole');

router.get('/', verifyToken, checkRole('AdministradorTerminal'), usuarioController.getAllUsuarios);
router.get('/:id/roles', verifyToken, checkRole('AdministradorTerminal'), usuarioController.getRolesByUsuarioId);
router.post('/add-rol', verifyToken, checkRole('AdministradorTerminal'), usuarioController.addRolToUsuario);
router.delete('/remove-rol', verifyToken, checkRole('AdministradorTerminal'), usuarioController.removeRolFromUsuario); // Nueva ruta

module.exports = router;
