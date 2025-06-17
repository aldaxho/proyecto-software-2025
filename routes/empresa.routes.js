const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/checkRole');
const empresaController = require('../controllers/empresa.controller'); // Importar controller
const busController = require('../controllers/bus.controller'); // Importar busController
const rutaController = require('../controllers/ruta.controller'); // Importar rutaController
const horarioController = require('../controllers/horario.controller'); // Importar horarioController
const boletoController = require('../controllers/boleto.controller'); // Importar boletoController
const usuarioController = require('../controllers/usuario.controller'); // Importar usuarioController
const publicidadController = require('../controllers/publicidad.controller'); // Importar publicidadController
const reportesController = require('../controllers/reportes.controller'); // Importar reportesController
const iaController = require('../controllers/ia.controller'); // Importar iaController

// Rutas de Buses para AdministradorEmpresa
router.post('/buses', verifyToken, checkRole('AdministradorEmpresa'), busController.registrarBus);
router.get('/mis-buses', verifyToken, checkRole('AdministradorEmpresa'), busController.listarBusesEmpresa);
router.put('/buses/:id_bus', verifyToken, checkRole('AdministradorEmpresa'), busController.actualizarBus);
router.delete('/buses/:id_bus', verifyToken, checkRole('AdministradorEmpresa'), busController.desactivarBus);

// Rutas de Rutas para AdministradorEmpresa
router.post('/rutas', verifyToken, checkRole('AdministradorEmpresa'), rutaController.crearRuta);
router.get('/rutas', verifyToken, checkRole('AdministradorEmpresa'), rutaController.listarRutasEmpresa);
router.put('/rutas/:id_ruta', verifyToken, checkRole('AdministradorEmpresa'), rutaController.actualizarRuta);
router.delete('/rutas/:id_ruta', verifyToken, checkRole('AdministradorEmpresa'), rutaController.desactivarRuta);

// Rutas de Horarios para AdministradorEmpresa
router.post('/horarios', verifyToken, checkRole('AdministradorEmpresa'), horarioController.crearHorario);
router.get('/horarios', verifyToken, checkRole('AdministradorEmpresa'), horarioController.listarHorariosEmpresa);
router.put('/horarios/:id_horario', verifyToken, checkRole('AdministradorEmpresa'), horarioController.actualizarHorario);
router.put('/horarios/:id_horario/ajustar-precio', verifyToken, checkRole('AdministradorEmpresa'), horarioController.ajustarPrecioHorario); // Nueva ruta
router.delete('/horarios/:id_horario', verifyToken, checkRole('AdministradorEmpresa'), horarioController.desactivarHorario);

// Rutas de Boletos para AdministradorEmpresa
router.get('/boletos/vendidos', verifyToken, checkRole('AdministradorEmpresa'), boletoController.listarBoletosVendidosEmpresa);

// Rutas para gestión de Personal por AdministradorEmpresa
router.post('/personal', verifyToken, checkRole('AdministradorEmpresa'), usuarioController.createPersonalEmpresa);
router.get('/personal', verifyToken, checkRole('AdministradorEmpresa'), usuarioController.listarPersonalEmpresa);
router.put('/personal/:id_usuario', verifyToken, checkRole('AdministradorEmpresa'), usuarioController.updatePersonalEmpresa);
router.delete('/personal/:id_usuario', verifyToken, checkRole('AdministradorEmpresa'), usuarioController.desactivarPersonalEmpresa);

// Rutas para Publicidad por AdministradorEmpresa
router.post('/publicidad', verifyToken, checkRole('AdministradorEmpresa'), publicidadController.createPublicidadEmpresa);
router.get('/publicidad', verifyToken, checkRole('AdministradorEmpresa'), publicidadController.listarPublicidadesEmpresa);
router.put('/publicidad/:id_publicidad', verifyToken, checkRole('AdministradorEmpresa'), publicidadController.updatePublicidadEmpresa);
router.delete('/publicidad/:id_publicidad', verifyToken, checkRole('AdministradorEmpresa'), publicidadController.deletePublicidadEmpresa);

// Rutas de Reportes para AdministradorEmpresa
router.get('/reportes/ventas', verifyToken, checkRole('AdministradorEmpresa'), reportesController.getVentasEmpresaAgregado);

// Rutas para Configuración IA de Empresa
router.get('/ia/configuracion', verifyToken, checkRole('AdministradorEmpresa'), iaController.getIaConfiguracionEmpresa);
router.put('/ia/configuracion', verifyToken, checkRole('AdministradorEmpresa'), iaController.updateIaConfiguracionEmpresa);
router.get('/ia/historial-precios', verifyToken, checkRole('AdministradorEmpresa'), iaController.getHistorialPreciosIaEmpresa);


// Ruta para obtener el perfil de la empresa del usuario logueado (AdministradorEmpresa)
router.get('/perfil', verifyToken, checkRole('AdministradorEmpresa'), empresaController.getMiEmpresaPerfil);

module.exports = router;
