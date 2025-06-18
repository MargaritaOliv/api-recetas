const db = require('../configs/db/db');
const Receta = require('../models/recetaModel');
const { uploadToS3, s3 } = require('../middleware/uploadMiddleware');

class RecetaController {

  static create(req, res) {
    const upload = uploadToS3.single('imagen'); 
    
    upload(req, res, (err) => {
      if (err && err.message !== 'Unexpected field') {
        return res.status(400).json({
          error: 'Error al subir imagen',
          details: err.message
        });
      }
      

      const imagen_receta = req.file ? req.file.location : null;
      
      
      const { nombre, ingredientes, pasos, tiempo_preparacion } = req.body;
      const usuario_id = req.userId;

      
      if (!nombre || !ingredientes || !pasos || !tiempo_preparacion) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }

      
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

      
      const ingredientesJSON = JSON.stringify(ingredientesParsed);
      const pasosJSON = JSON.stringify(pasosParsed);

      
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

  
  static update(req, res) {
    const { id } = req.params;
    const upload = uploadToS3.single('imagen');
    
    upload(req, res, async (err) => {
      if (err && err.message !== 'Unexpected field') {
        return res.status(400).json({
          error: 'Error al subir imagen',
          details: err.message
        });
      }

      const { nombre, ingredientes, pasos, tiempo_preparacion, mantener_imagen } = req.body;

      if (!nombre || !ingredientes || !pasos || !tiempo_preparacion) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }

      
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

      
      let nueva_imagen_receta = null;

      if (req.file) {
        
        nueva_imagen_receta = req.file.location;
        
        
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
        const sql = `UPDATE recetas SET nombre = ?, ingredientes = ?, pasos = ?, tiempo_preparacion = ? WHERE id = ?`;
        db.query(sql, [nombre, ingredientesJSON, pasosJSON, tiempo_preparacion, id], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          if (result.affectedRows === 0) return res.status(404).json({ error: 'Receta no encontrada' });

          res.json({ message: 'Receta actualizada (imagen mantenida)' });
        });
        return;
      }

      
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

  static async delete(req, res) {
    const { id } = req.params;
    
    const selectSql = `SELECT imagen_receta FROM recetas WHERE id = ?`;
    db.query(selectSql, [id], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Receta no encontrada' });

      const receta = results[0];
      
      if (receta.imagen_receta) {
        try {
          const key = receta.imagen_receta.split('.amazonaws.com/')[1];
          await s3.deleteObject({
            Bucket: 'mi-app-recetas-2025',
            Key: key
          }).promise();
        } catch (s3Error) {
          console.log('Error al eliminar imagen de S3:', s3Error);
        }
      }

      const deleteSql = `DELETE FROM recetas WHERE id = ?`;
      db.query(deleteSql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({ message: 'Receta e imagen eliminadas' });
      });
    });
  }
}

module.exports = RecetaController;