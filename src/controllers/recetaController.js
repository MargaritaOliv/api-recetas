const db = require('../configs/db/db');
const Receta = require('../models/recetaModel');
const ImageService = require('../services/ImageService');

class RecetaController {

  static async create(req, res) {
    try {
      console.log('🚀 Iniciando creación de receta...');
      
      const configValidation = ImageService.validateConfiguration();
      if (!configValidation.valid) {
        return res.status(500).json({
          error: 'Error de configuración AWS',
          details: configValidation.errors
        });
      }

      const { nombre, ingredientes, pasos, tiempo_preparacion, imagen_base64 } = req.body;
      const usuario_id = req.userId;

      if (!nombre || !ingredientes || !pasos || !tiempo_preparacion) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }

      let ingredientesParsed, pasosParsed;
      try {
        ingredientesParsed = typeof ingredientes === 'string' ? JSON.parse(ingredientes) : ingredientes;
        pasosParsed = typeof pasos === 'string' ? JSON.parse(pasos) : pasos;
      } catch (parseError) {
        console.error('❌ Error parseando datos:', parseError);
        return res.status(400).json({ 
          error: 'Error en formato de ingredientes o pasos',
          details: 'Deben ser arrays válidos'
        });
      }

      let imagen_receta = null;

      if (req.file) {
        console.log('📁 Procesando imagen de archivo...');
        const uploadResult = await ImageService.uploadImage(req.file);
        
        if (!uploadResult.success) {
          return res.status(400).json({
            error: 'Error al subir imagen',
            details: uploadResult.error
          });
        }
        
        imagen_receta = uploadResult.imageUrl;
        console.log('✅ Imagen subida:', imagen_receta);
        
      } else if (imagen_base64) {
        console.log('📱 Procesando imagen Base64...');
        
        if (!ImageService.isValidBase64Image(imagen_base64)) {
          return res.status(400).json({
            error: 'Formato de imagen Base64 inválido'
          });
        }
        
        const uploadResult = await ImageService.uploadBase64Image(imagen_base64);
        
        if (!uploadResult.success) {
          return res.status(400).json({
            error: 'Error al subir imagen Base64',
            details: uploadResult.error
          });
        }
        
        imagen_receta = uploadResult.imageUrl;
        console.log('✅ Imagen Base64 subida:', imagen_receta);
      }

      const ingredientesJSON = JSON.stringify(ingredientesParsed);
      const pasosJSON = JSON.stringify(pasosParsed);

      console.log('💾 Guardando en base de datos...');

      const sql = `INSERT INTO recetas (nombre, ingredientes, pasos, tiempo_preparacion, usuario_id, imagen_receta) VALUES (?, ?, ?, ?, ?, ?)`;
      
      db.query(sql, [nombre, ingredientesJSON, pasosJSON, tiempo_preparacion, usuario_id, imagen_receta], (err, result) => {
        if (err) {
          console.error('❌ Error en base de datos:', err);
          
          if (imagen_receta) {
            const imageKey = ImageService.extractKeyFromS3Url(imagen_receta);
            if (imageKey) {
              ImageService.deleteImage(imageKey).catch(console.error);
            }
          }
          
          return res.status(500).json({ error: err.message });
        }

        console.log('✅ Receta guardada exitosamente con ID:', result.insertId);

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
      
    } catch (error) {
      console.error('❌ Error general en create:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      console.log('🔄 Iniciando actualización de receta ID:', id);

      const { nombre, ingredientes, pasos, tiempo_preparacion, imagen_base64, eliminar_imagen } = req.body;

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

      const selectSql = `SELECT imagen_receta FROM recetas WHERE id = ?`;
      
      db.query(selectSql, [id], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Receta no encontrada' });

        const recetaActual = results[0];
        let nueva_imagen_receta = recetaActual.imagen_receta; 

        try {
          if (req.file) {
            console.log('📁 Subiendo nueva imagen...');
            const uploadResult = await ImageService.uploadImage(req.file);
            
            if (!uploadResult.success) {
              return res.status(400).json({
                error: 'Error al subir nueva imagen',
                details: uploadResult.error
              });
            }
            
            nueva_imagen_receta = uploadResult.imageUrl;
            
            if (recetaActual.imagen_receta) {
              const oldKey = ImageService.extractKeyFromS3Url(recetaActual.imagen_receta);
              if (oldKey) {
                await ImageService.deleteImage(oldKey);
                console.log('🗑️ Imagen anterior eliminada');
              }
            }
            
          } else if (imagen_base64) {
            console.log('📱 Subiendo nueva imagen Base64...');
            
            if (!ImageService.isValidBase64Image(imagen_base64)) {
              return res.status(400).json({
                error: 'Formato de imagen Base64 inválido'
              });
            }
            
            const uploadResult = await ImageService.uploadBase64Image(imagen_base64);
            
            if (!uploadResult.success) {
              return res.status(400).json({
                error: 'Error al subir imagen Base64',
                details: uploadResult.error
              });
            }
            
            nueva_imagen_receta = uploadResult.imageUrl;
            
            if (recetaActual.imagen_receta) {
              const oldKey = ImageService.extractKeyFromS3Url(recetaActual.imagen_receta);
              if (oldKey) {
                await ImageService.deleteImage(oldKey);
                console.log('🗑️ Imagen anterior eliminada');
              }
            }
            
          } else if (eliminar_imagen === 'true' || eliminar_imagen === true) {
            console.log('🗑️ Eliminando imagen actual...');
            
            if (recetaActual.imagen_receta) {
              const oldKey = ImageService.extractKeyFromS3Url(recetaActual.imagen_receta);
              if (oldKey) {
                await ImageService.deleteImage(oldKey);
                console.log('✅ Imagen eliminada');
              }
            }
            
            nueva_imagen_receta = null;
          }

          const ingredientesJSON = JSON.stringify(ingredientesParsed);
          const pasosJSON = JSON.stringify(pasosParsed);

          const updateSql = `UPDATE recetas SET nombre = ?, ingredientes = ?, pasos = ?, tiempo_preparacion = ?, imagen_receta = ? WHERE id = ?`;
          
          db.query(updateSql, [nombre, ingredientesJSON, pasosJSON, tiempo_preparacion, nueva_imagen_receta, id], (err, result) => {
            if (err) {
              console.error('❌ Error actualizando en BD:', err);
              return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
              return res.status(404).json({ error: 'Receta no encontrada' });
            }

            console.log('✅ Receta actualizada exitosamente');
            res.json({ 
              message: 'Receta actualizada exitosamente',
              ...(nueva_imagen_receta && { imagen_url: nueva_imagen_receta })
            });
          });

        } catch (imageError) {
          console.error('❌ Error procesando imagen:', imageError);
          res.status(500).json({
            error: 'Error procesando imagen',
            details: imageError.message
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Error general en update:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
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
    
    try {
      const selectSql = `SELECT imagen_receta FROM recetas WHERE id = ?`;
      
      db.query(selectSql, [id], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Receta no encontrada' });

        const receta = results[0];
        
        if (receta.imagen_receta) {
          try {
            const imageKey = ImageService.extractKeyFromS3Url(receta.imagen_receta);
            if (imageKey) {
              const deleteResult = await ImageService.deleteImage(imageKey);
              if (deleteResult.success) {
                console.log('✅ Imagen eliminada de S3');
              } else {
                console.log('⚠️ Error eliminando imagen de S3:', deleteResult.error);
              }
            }
          } catch (s3Error) {
            console.log('⚠️ Error al eliminar imagen de S3:', s3Error.message);
          }
        }

        const deleteSql = `DELETE FROM recetas WHERE id = ?`;
        db.query(deleteSql, [id], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          
          console.log('✅ Receta eliminada exitosamente');
          res.json({ 
            message: 'Receta eliminada correctamente',
            eliminadas: {
              receta: true,
              imagen: !!receta.imagen_receta
            }
          });
        });
      });
    } catch (error) {
      console.error('❌ Error en delete:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }

  static async checkAWSStatus(req, res) {
    try {
      const validation = ImageService.validateConfiguration();
      
      if (!validation.valid) {
        return res.status(500).json({
          status: 'misconfigured',
          message: 'Configuración AWS incompleta',
          errors: validation.errors
        });
      }

      const bucketInfo = ImageService.getBucketInfo();
      
      res.json({
        status: 'configured',
        message: 'ImageService configurado correctamente',
        configuration: bucketInfo
      });
      
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error al verificar configuración',
        details: error.message
      });
    }
  }
}

module.exports = RecetaController;