require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const recetaRoutes = require('./src/routes/recetaRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');

const app = express();

app.use(bodyParser.json());
app.use(cors());  

app.use('/api/receta', recetaRoutes);
app.use('/api/usuario', usuarioRoutes)

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
