const { VerificacionDocumento } = require('../models'); // Assuming VerificacionDocumento model
// const fs = require('fs'); // Not directly needed here as multer handles file saving

exports.subirDocumentoIdentidad = async (req, res) => {
  try {
    const id_usuario_token = req.user && req.user.id; // JWT 'id' field for user PK

    if (!id_usuario_token) {
      // This should be caught by verifyToken, but defensive check
      return res.status(401).json({ message: 'Usuario no autenticado.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    }

    // tipo_documento could come from req.body if sent as a separate form field
    const { tipo_documento } = req.body;

    if (!tipo_documento || typeof tipo_documento !== 'string' || tipo_documento.trim() === '') {
      // If file is already uploaded due to middleware order, consider deleting it
      // fs.unlinkSync(req.file.path); // Requires careful error handling
      return res.status(400).json({ message: 'El campo tipo_documento es obligatorio.' });
    }

    // Path where multer saved the file
    const imagen_documento_path = req.file.path;

    // Create a new record in VerificacionDocumento
    // Assuming VerificacionDocumento model has these fields
    const nuevaVerificacion = await VerificacionDocumento.create({
      id_usuario: id_usuario_token,
      tipo_documento: tipo_documento.trim(),
      imagen_documento: imagen_documento_path, // Store the path
      estado_verificacion: 'PENDIENTE_REVISION', // Assuming a new default or initial state
      validado_por_ia: null, // Or false, depending on model definition
      resultado_ocr: null,
      fecha_carga: new Date(), // Add a load date
      fecha_verificacion: null,
      // Add any other relevant fields that should be set on upload
    });

    res.status(201).json({
      message: 'Documento subido exitosamente para verificación.',
      verificacion: nuevaVerificacion,
    });

  } catch (error) {
    console.error('Error en subirDocumentoIdentidad:', error);
    // If an error occurs after file upload, multer doesn't automatically delete the file.
    // Consider adding cleanup logic here if req.file exists and DB operation fails.
    // e.g., if (req.file && req.file.path) { fs.unlinkSync(req.file.path); }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Error de validación.', details: error.errors.map(e => e.message) });
    }
    if (error.message.includes('Tipo de archivo no permitido')) { // From multer fileFilter
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error interno del servidor al subir el documento.', error: error.message });
  }
};
