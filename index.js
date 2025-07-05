require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const recetaRoutes = require('./src/routes/recetaRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const authRoutes = require('./src/routes/authRoutes')

const app = express();



app.use(cors());  
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // ← AGREGA ESTA LÍNEA

app.use('/api/receta', recetaRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/auth', authRoutes)

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});