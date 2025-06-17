const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/checkRole');
const documentoController = require('../controllers/documento.controller');
const compraController = require('../controllers/compra.controller'); // Importar compraController
const boletoController = require('../controllers/boleto.controller'); // Importar boletoController

// --- Multer Configuration (Simplified for direct use here) ---
const documentosDir = path.resolve(__dirname, '../../uploads/documentos/'); // Adjusted path relative to this file

// Ensure directory exists
try {
  if (!fs.existsSync(documentosDir)) {
    fs.mkdirSync(documentosDir, { recursive: true });
    console.log(`Directorio de subida creado: ${documentosDir}`);
  }
} catch (err) {
  console.error(`Error al crear directorio de subida ${documentosDir}: `, err);
  // Depending on setup, might want to throw error or handle differently
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentosDir);
  },
  filename: (req, file, cb) => {
    // req.user should be available here because verifyToken runs before this multer for the specific route.
    const userId = req.user ? req.user.id : 'unknownUser';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `user${userId}-doc-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  // Important: Pass an error to cb to signal an issue.
  // Multer will catch this error and it can be handled in the controller or an error-handling middleware.
  cb(new Error('Tipo de archivo no permitido. Solo se aceptan JPEG, JPG, PNG.'), false);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});
// --- End Multer Configuration ---


// Ruta para subir documento de identidad (Cliente)
// Orden de middlewares: verifyToken, checkRole, luego multer, luego el controller.
// verifyToken y checkRole para asegurar que req.user esté disponible y sea un cliente.
// Luego multer (upload.single) para procesar el archivo. req.file estará disponible en el controller.
router.post(
  '/documento-identidad',
  verifyToken,
  checkRole('Cliente'), // Ensure only users with 'Cliente' role can access
  (req, res, next) => { // Middleware to handle multer error specifically for this route
    upload.single('imagen_documento')(req, res, (err) => { // 'imagen_documento' is the field name from form-data
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        return res.status(400).json({ message: `Error de Multer: ${err.message}` });
      } else if (err) {
        // An unknown error occurred when uploading (e.g., file type error from fileFilter).
        return res.status(400).json({ message: err.message });
      }
      // Everything went fine with multer, proceed to controller
      next();
    });
  },
  documentoController.subirDocumentoIdentidad
);

// Ruta para iniciar una compra (seleccionar asiento, crear boleto pendiente)
router.post(
  '/compras/iniciar',
  verifyToken,
  checkRole('Cliente'),
  compraController.iniciarCompra
);

// Ruta para simular el pago de una compra y confirmar boletos
router.post(
  '/compras/:id_compra/pagar',
  verifyToken,
  checkRole('Cliente'),
  compraController.realizarPagoCompra
);

// Ruta para obtener un boleto digital específico del cliente
router.get(
  '/boletos/:id_boleto',
  verifyToken,
  checkRole('Cliente'),
  boletoController.getBoletoDigitalCliente
);

// Ruta para listar todos los boletos comprados por el cliente
router.get(
  '/mis-boletos',
  verifyToken,
  checkRole('Cliente'),
  boletoController.listarMisBoletos
);

module.exports = router;
