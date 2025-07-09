require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const recetaRoutes = require('./src/routes/recetaRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const authRoutes = require('./src/routes/authRoutes')

const app = express();

app.use(cors());  

// 🚀 CONFIGURACIÓN PARA IMÁGENES GRANDES - CAMBIO PRINCIPAL
app.use(bodyParser.json({ 
  limit: '50mb',           // Aumentado para Base64 grandes
  parameterLimit: 100000   // Más parámetros permitidos
}));

app.use(bodyParser.urlencoded({ 
  limit: '50mb',           // Aumentado para formularios con imágenes
  extended: true,
  parameterLimit: 100000   // Más parámetros permitidos
})); 

app.use('/api/receta', recetaRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/auth', authRoutes)

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});