const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rol.controller');

router.get('/', rolController.getAllRoles);
router.post('/', rolController.createRol);

module.exports = router;
