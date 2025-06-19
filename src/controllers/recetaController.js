const db = require('../configs/db/db');
const Receta = require('../models/recetaModel');
const { uploadToS3, s3, testS3Connection } = require('../middleware/uploadMiddleware');

class RecetaController {

  // CREAR RECETA con validación completa de AWS
  static async create(req, res) {
    // Primero verificar la conexión con S3
    const s3Connected = await testS3Connection();
    
    if (!s3Connected) {
      return res.status(500).json({
        error: 'Error de configuración AWS',
        details: 'No se puede conectar con S3. Verifica las credenciales en el archivo .env'
      });
    }

    const upload = uploadToS3.single('imagen'); 
    
    upload(req, res, (err) => {
      if (err) {
        console.error('Error detallado de multer:', err);
        
        // Diferentes tipos de errores AWS
        if (err.code === 'NoSuchBucket') {
          return res.status(400).json({
            error: 'Bucket S3 no encontrado',
            details: 'Verifica que el bucket "mi-app-recetas-2025" exista'
          });
        }
        
        if (err.code === 'InvalidAccessKeyId') {
          return res.status(400).json({
            error: 'Credenciales AWS inválidas',
            details: 'Verifica AWS_ACCESS_KEY_ID en el archivo .env'
          });
        }
        
        if (err.code === 'SignatureDoesNotMatch') {
          return res.status(400).json({
            error: 'Error de autenticación AWS',
            details: 'Verifica AWS_SECRET_ACCESS_KEY en el archivo .env'
          });
        }
        
        if (err.code === 'TokenRefreshRequired' || err.code === 'ExpiredToken') {
          return res.status(400).json({
            error: 'Credenciales AWS expiradas',
            details: 'Obtén nuevas credenciales desde AWS Academy'
          });
        }
        
        if (err.message && err.message.includes('this.client.send is not a function')) {
          return res.status(500).json({
            error: 'Error de SDK AWS',
            details: 'Ejecuta: npm install aws-sdk multer multer-s3 uuid'
          });
        }
        
        return res.status(400).json({
          error: 'Error al subir imagen',
          details: err.message,
          code: err.code || 'UNKNOWN_ERROR'
        });
      }
      
      // Obtener URL de imagen (si se subió) o null
      const imagen_receta = req.file ? req.file.location : null;
      
      // Obtener datos del cuerpo
      const { nombre, ingredientes, pasos, tiempo_preparacion } = req.body;
      const usuario_id = req.userId;

      // Validar datos obligatorios
      if (!nombre || !ingredientes || !pasos || !tiempo_preparacion) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }

      // Parsear ingredientes y pasos si vienen como string (desde FormData)
      let ingredientesParsed, pasosParsed;
      
      try {
        ingredientesParsed = typeof ingredientes === 'string' ? JSON.parse(ingredientes) : ingredientes;
        pasosParsed = typeof pasos === 'string' ? JSON.parse(pasos) : pasos;
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'Error en formato de ingredientes o pasos',
          details: 'Deben ser arrays válidos'
        });
      }

      // Convertir a JSON para la base de datos
      const ingredientesJSON = JSON.stringify(ingredientesParsed);
      const pasosJSON = JSON.stringify(pasosParsed);

      // Insertar en base de datos
      const sql = `INSERT INTO recetas (nombre, ingredientes, pasos, tiempo_preparacion, usuario_id, imagen_receta) VALUES (?, ?, ?, ?, ?, ?)`;
      
      db.query(sql, [nombre, ingredientesJSON, pasosJSON, tiempo_preparacion, usuario_id, imagen_receta], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        const nuevaReceta = new Receta({
          id: result.insertId,
          nombre,
          ingredientes: ingredientesParsed,
          pasos: pasosParsed,
          tiempo_preparacion,
          usuario_id,
          imagen_receta
        });

        res.status(201).json({ 
          message: 'Receta creada exitosamente', 
          receta: nuevaReceta,
          ...(imagen_receta && { imagen_url: imagen_receta })
        });
      });
    });
  }

  // ACTUALIZAR RECETA con manejo de imagen
  static async update(req, res) {
    const { id } = req.params;
    
    // Verificar conexión S3 solo si se va a subir imagen
    const upload = uploadToS3.single('imagen');
    
    upload(req, res, async (err) => {
      if (err && err.message !== 'Unexpected field') {
        console.error('Error en actualización:', err);
        
        if (err.code === 'TokenRefreshRequired' || err.code === 'ExpiredToken') {
          return res.status(400).json({
            error: 'Credenciales AWS expiradas',
            details: 'Obtén nuevas credenciales desde AWS Academy'
          });
        }
        
        return res.status(400).json({
          error: 'Error al subir imagen',
          details: err.message
        });
      }

      const { nombre, ingredientes, pasos, tiempo_preparacion, mantener_imagen } = req.body;

      if (!nombre || !ingredientes || !pasos || !tiempo_preparacion) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }

      // Parsear datos
      let ingredientesParsed, pasosParsed;
      try {
        ingredientesParsed = typeof ingredientes === 'string' ? JSON.parse(ingredientes) : ingredientes;
        pasosParsed = typeof pasos === 'string' ? JSON.parse(pasos) : pasos;
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'Error en formato de ingredientes o pasos'
        });
      }

      const ingredientesJSON = JSON.stringify(ingredientesParsed);
      const pasosJSON = JSON.stringify(pasosParsed);

      // Determinar qué hacer con la imagen
      let nueva_imagen_receta = null;

      if (req.file) {
        // Se subió nueva imagen
        nueva_imagen_receta = req.file.location;
        
        // Eliminar imagen anterior si existía
        const selectSql = `SELECT imagen_receta FROM recetas WHERE id = ?`;
        db.query(selectSql, [id], async (err, results) => {
          if (!err && results.length > 0 && results[0].imagen_receta) {
            try {
              const oldKey = results[0].imagen_receta.split('.amazonaws.com/')[1];
              await s3.deleteObject({
                Bucket: 'mi-app-recetas-2025',
                Key: oldKey
              }).promise();
            } catch (s3Error) {
              console.log('Error al eliminar imagen anterior:', s3Error);
            }
          }
        });
      } else if (mantener_imagen === 'false') {
        // Se quiere eliminar la imagen actual
        const selectSql = `SELECT imagen_receta FROM recetas WHERE id = ?`;
        db.query(selectSql, [id], async (err, results) => {
          if (!err && results.length > 0 && results[0].imagen_receta) {
            try {
              const oldKey = results[0].imagen_receta.split('.amazonaws.com/')[1];
              await s3.deleteObject({
                Bucket: 'mi-app-recetas-2025',
                Key: oldKey
              }).promise();
            } catch (s3Error) {
              console.log('Error al eliminar imagen:', s3Error);
            }
          }
        });
        nueva_imagen_receta = null;
      } else {
        // Mantener imagen actual - no actualizar campo imagen_receta
        const sql = `UPDATE recetas SET nombre = ?, ingredientes = ?, pasos = ?, tiempo_preparacion = ? WHERE id = ?`;
        db.query(sql, [nombre, ingredientesJSON, pasosJSON, tiempo_preparacion, id], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          if (result.affectedRows === 0) return res.status(404).json({ error: 'Receta no encontrada' });

          res.json({ message: 'Receta actualizada (imagen mantenida)' });
        });
        return;
      }

      // Actualizar con nueva imagen o null
      const sql = `UPDATE recetas SET nombre = ?, ingredientes = ?, pasos = ?, tiempo_preparacion = ?, imagen_receta = ? WHERE id = ?`;
      db.query(sql, [nombre, ingredientesJSON, pasosJSON, tiempo_preparacion, nueva_imagen_receta, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Receta no encontrada' });

        res.json({ 
          message: 'Receta actualizada',
          ...(nueva_imagen_receta && { nueva_imagen_url: nueva_imagen_receta })
        });
      });
    });
  }

  // OBTENER TODAS LAS RECETAS
  static getAll(req, res) {
    const sql = `SELECT * FROM recetas`;
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      const recetas = results.map(r => new Receta({
        id: r.id,
        nombre: r.nombre,
        ingredientes: JSON.parse(r.ingredientes),
        pasos: JSON.parse(r.pasos),
        tiempo_preparacion: r.tiempo_preparacion,
        usuario_id: r.usuario_id,
        imagen_receta: r.imagen_receta
      }));

      res.json(recetas);
    });
  }

  // OBTENER RECETA POR ID
  static getById(req, res) {
    const { id } = req.params;
    const sql = `SELECT * FROM recetas WHERE id = ?`;
    db.query(sql, [id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Receta no encontrada' });

      const r = results[0];
      const receta = new Receta({
        id: r.id,
        nombre: r.nombre,
        ingredientes: JSON.parse(r.ingredientes),
        pasos: JSON.parse(r.pasos),
        tiempo_preparacion: r.tiempo_preparacion,
        usuario_id: r.usuario_id,
        imagen_receta: r.imagen_receta
      });

      res.json(receta);
    });
  }

  // OBTENER RECETAS DEL USUARIO AUTENTICADO
  static getByUsuarioToken(req, res) {
    const usuario_id = req.userId;

    const sql = `SELECT * FROM recetas WHERE usuario_id = ?`;
    db.query(sql, [usuario_id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      const recetas = results.map(r => new Receta({
        id: r.id,
        nombre: r.nombre,
        ingredientes: JSON.parse(r.ingredientes),
        pasos: JSON.parse(r.pasos),
        tiempo_preparacion: r.tiempo_preparacion,
        usuario_id: r.usuario_id,
        imagen_receta: r.imagen_receta
      }));

      res.json(recetas);
    });
  }

  // ELIMINAR RECETA con limpieza de imagen en S3
  static async delete(req, res) {
    const { id } = req.params;
    
    // Primero obtener la receta para saber si tiene imagen
    const selectSql = `SELECT imagen_receta FROM recetas WHERE id = ?`;
    db.query(selectSql, [id], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Receta no encontrada' });

      const receta = results[0];
      
      // Eliminar imagen de S3 si existe
      if (receta.imagen_receta) {
        try {
          const key = receta.imagen_receta.split('.amazonaws.com/')[1];
          await s3.deleteObject({
            Bucket: 'mi-app-recetas-2025',
            Key: key
          }).promise();
          console.log('✅ Imagen eliminada de S3:', key);
        } catch (s3Error) {
          console.log('⚠️ Error al eliminar imagen de S3:', s3Error.message);
          // Continúa aunque falle la eliminación de S3
        }
      }

      // Eliminar receta de la base de datos
      const deleteSql = `DELETE FROM recetas WHERE id = ?`;
      db.query(deleteSql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({ 
          message: 'Receta e imagen eliminadas correctamente',
          eliminadas: {
            receta: true,
            imagen: !!receta.imagen_receta
          }
        });
      });
    });
  }

  // MÉTODO ADICIONAL: Verificar estado de AWS
  static async checkAWSStatus(req, res) {
    try {
      const s3Connected = await testS3Connection();
      
      if (s3Connected) {
        const buckets = await s3.listBuckets().promise();
        const bucketExists = buckets.Buckets.some(b => b.Name === 'mi-app-recetas-2025');
        
        res.json({
          status: 'connected',
          message: 'AWS S3 conectado correctamente',
          bucket_exists: bucketExists,
          buckets_available: buckets.Buckets.map(b => b.Name)
        });
      } else {
        res.status(500).json({
          status: 'disconnected',
          message: 'No se puede conectar con AWS S3',
          suggestion: 'Verifica las credenciales en el archivo .env'
        });
      }
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error al verificar AWS S3',
        details: error.message
      });
    }
  }
}

module.exports = RecetaController;