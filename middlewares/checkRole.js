module.exports = function (...rolesPermitidos) {
  return (req, res, next) => {
    const usuario = req.user;

    if (!usuario || !usuario.roles) {
      return res.status(403).json({ message: 'No autorizado. Token inválido o sin roles' });
    }

    const tienePermiso = usuario.roles.some(rol => rolesPermitidos.includes(rol));

    if (!tienePermiso) {
      return res.status(403).json({ message: 'Acceso denegado. Rol insuficiente' });
    }

    next();
  };
};
