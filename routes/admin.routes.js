const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/checkRole');
const empresaController = require('../controllers/empresa.controller');
const usuarioController = require('../controllers/usuario.controller'); // Importar usuarioController
const reportesController = require('../controllers/reportes.controller'); // Importar reportesController
const terminalController = require('../controllers/terminal.controller'); // Importar terminalController
const iaController = require('../controllers/ia.controller'); // Importar iaController
const logsController = require('../controllers/logs.controller'); // Importar logsController
const publicidadController = require('../controllers/publicidad.controller'); // Importar publicidadController
const verificacionController = require('../controllers/verificacion.controller'); // Importar verificacionController

// Solo para AdministradorTerminal
router.get('/panel', verifyToken, checkRole('AdministradorTerminal'), (req, res) => {
  res.json({ message: 'Bienvenido al panel del administrador de terminal' });
});

// Ruta para registrar una nueva empresa
router.post('/empresas', verifyToken, checkRole('AdministradorTerminal'), empresaController.createEmpresa);

// Ruta para crear usuarios por AdministradorTerminal
router.post('/usuarios/personal', verifyToken, checkRole('AdministradorTerminal'), usuarioController.createUsuarioPorAdmin);

// Ruta para actualizar usuarios por AdministradorTerminal
router.put('/usuarios/personal/:id', verifyToken, checkRole('AdministradorTerminal'), usuarioController.updateUsuarioPorAdmin);

// Ruta para desactivar (eliminar lógicamente) usuarios por AdministradorTerminal
router.delete('/usuarios/personal/:id', verifyToken, checkRole('AdministradorTerminal'), usuarioController.deleteUsuarioPorAdmin);

// Rutas para Reportes (AdministradorTerminal)
router.get('/reportes/ingresos/terminal', verifyToken, checkRole('AdministradorTerminal'), reportesController.getIngresosTerminalDiarios);

// Rutas para Terminal (AdministradorTerminal)
router.post('/terminal/validar-pago-qr', verifyToken, checkRole('AdministradorTerminal'), terminalController.validarPagoQr);

// Rutas para Configuración IA (AdministradorTerminal)
router.post('/ia/configuraciones', verifyToken, checkRole('AdministradorTerminal'), iaController.upsertConfiguracionIa);
router.get('/ia/configuraciones/global', verifyToken, checkRole('AdministradorTerminal'), (req, res, next) => { req.params.id_empresa_param = 'global'; next(); }, iaController.getConfiguracionIa);
router.get('/ia/configuraciones/empresa/:id_empresa_param', verifyToken, checkRole('AdministradorTerminal'), iaController.getConfiguracionIa);
router.get('/ia/configuraciones', verifyToken, checkRole('AdministradorTerminal'), iaController.getAllConfiguracionesIa);
router.get('/ia/historial-precios', verifyToken, checkRole('AdministradorTerminal'), iaController.getHistorialPreciosIa);

// Rutas para Logs (AdministradorTerminal)
router.get('/logs/accesos', verifyToken, checkRole('AdministradorTerminal'), logsController.getLogAccesos);

// Rutas para Publicidad (AdministradorTerminal)
router.put('/publicidad/:id/estado', verifyToken, checkRole('AdministradorTerminal'), publicidadController.updateEstadoPublicidad);
router.get('/publicidad', verifyToken, checkRole('AdministradorTerminal'), publicidadController.getAllPublicidades);

// Rutas para Verificaciones (AdministradorTerminal)
router.get('/verificaciones/documentos-validados', verifyToken, checkRole('AdministradorTerminal'), verificacionController.getDocumentosValidadosIA);

// Solo para Cajero y AdministradorEmpresa
router.get('/ventas', verifyToken, checkRole('Cajero', 'AdministradorEmpresa'), (req, res) => {
  res.json({ message: 'Acceso a módulo de ventas' });
});

module.exports = router;
