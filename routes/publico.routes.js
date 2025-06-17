const express = require('express');
const router = express.Router();
const rutasPublicasController = require('../controllers/rutaspublicas.controller');

// Ruta pública para buscar horarios disponibles
router.get('/horarios/buscar', rutasPublicasController.buscarHorarios);

// Ruta pública para ver disponibilidad de asientos de un horario específico
router.get('/horarios/:id_horario/asientos', rutasPublicasController.getDisponibilidadAsientos);

module.exports = router;
