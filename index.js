require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const recetaRoutes = require('./src/routes/recetaRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const authRoutes = require('./src/routes/authRoutes')
const notificationRoutes = require('./routes/notificationRoutes');


const app = express();

app.use(cors());  

app.use(bodyParser.json({ 
  limit: '50mb',           
  parameterLimit: 100000   
}));

app.use(bodyParser.urlencoded({ 
  limit: '50mb',           
  extended: true,
  parameterLimit: 100000   
})); 

app.use('/api/receta', recetaRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/auth', authRoutes)
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});