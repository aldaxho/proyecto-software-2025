const express = require('express');
const {sequelize} = require('./models');
const app = express();
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const rolRoutes = require('./routes/rol.routes');
const adminRoutes = require('./routes/admin.routes');

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/roles', require('./routes/rol.routes'));
app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/api/empresa', require('./routes/empresa.routes'));
app.use('/api/caja', require('./routes/caja.routes'));
app.use('/api/control', require('./routes/control.routes'));
app.use('/api/verificacion', require('./routes/verificacion.routes'));



app.listen(process.env.PORT, () => {
  console.log(`Servidor corriendo en puerto ${process.env.PORT}`);
});
