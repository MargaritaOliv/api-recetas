require('dotenv').config();
const db = require('../configs/db/db');
const Usuario = require('../models/usuarioModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { uploadToS3, s3 } = require('../middleware/uploadMiddleware');

class UsuarioController {

  static async registrarUsuario(req, res) {
    const upload = uploadToS3.single('imagen'); 
    
    upload(req, res, async (err) => {
      if (err && err.message !== 'Unexpected field') {
        return res.status(400).json({
          error: 'Error al subir imagen de perfil',
          details: err.message
        });
      }

      const imagen = req.file ? req.file.location : null;
      
      const { correo, contrasena, nombre_usuario } = req.body;

      if (!correo || !contrasena || !nombre_usuario) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }

      try {
        const checkSql = 'SELECT * FROM usuarios WHERE correo = ?';
        db.query(checkSql, [correo], async (err, results) => {
          if (err) return res.status(500).json({ error: err.message });
          if (results.length > 0) {
            if (imagen) {
              try {
                const key = imagen.split('.amazonaws.com/')[1];
                await s3.deleteObject({
                  Bucket: 'mi-app-recetas-2025',
                  Key: key
                }).promise();
              } catch (s3Error) {
                console.log('Error al limpiar imagen:', s3Error);
              }
            }
            return res.status(409).json({ error: 'El correo ya está registrado' });
          }

          const hashedPassword = await bcrypt.hash(contrasena, 10);

          const insertSql = 'INSERT INTO usuarios (correo, contrasena, nombre_usuario, imagen) VALUES (?, ?, ?, ?)';
          db.query(insertSql, [correo, hashedPassword, nombre_usuario, imagen], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            const nuevoUsuario = new Usuario({
              id: result.insertId,
              correo,
              contrasena: hashedPassword,
              nombre_usuario,
              imagen
            });

            res.status(201).json({ 
              mensaje: 'Usuario registrado correctamente',
              usuario: nuevoUsuario,
              ...(imagen && { imagen_perfil: imagen })
            });
          });
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  static login(req, res) {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    const sql = 'SELECT * FROM usuarios WHERE correo = ?';
    db.query(sql, [correo], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

      const usuario = results[0];
      const passwordMatch = await bcrypt.compare(contrasena, usuario.contrasena);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      const token = jwt.sign({ userId: usuario.id }, process.env.SECRET_KEY, { expiresIn: '2h' });
      
      const usuarioModel = new Usuario({
        id: usuario.id,
        correo: usuario.correo,
        contrasena: usuario.contrasena,
        nombre_usuario: usuario.nombre_usuario,
        imagen: usuario.imagen
      });

      const usuarioResponse = {
        id: usuarioModel.id,
        correo: usuarioModel.correo,
        nombre_usuario: usuarioModel.nombre_usuario,
        imagen: usuarioModel.imagen
      };

      res.status(200).json({ 
        mensaje: 'Inicio de sesión exitoso', 
        token,
        usuario: usuarioResponse
      });
    });
  }

  static actualizarUsuario(req, res) {
    const { id } = req.params;
    const upload = uploadToS3.single('imagen');
    
    upload(req, res, async (err) => {
      if (err && err.message !== 'Unexpected field') {
        return res.status(400).json({
          error: 'Error al subir imagen',
          details: err.message
        });
      }

      const { correo, contrasena, nombre_usuario, mantener_imagen } = req.body;

      if (!correo || !nombre_usuario) {
        return res.status(400).json({ error: 'Correo y nombre de usuario son obligatorios' });
      }

      try {
        let nueva_imagen = null;

        if (req.file) {
          nueva_imagen = req.file.location;
          
          const selectSql = 'SELECT imagen FROM usuarios WHERE id = ?';
          db.query(selectSql, [id], async (err, results) => {
            if (!err && results.length > 0 && results[0].imagen) {
              try {
                const oldKey = results[0].imagen.split('.amazonaws.com/')[1];
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
          const selectSql = 'SELECT imagen FROM usuarios WHERE id = ?';
          db.query(selectSql, [id], async (err, results) => {
            if (!err && results.length > 0 && results[0].imagen) {
              try {
                const oldKey = results[0].imagen.split('.amazonaws.com/')[1];
                await s3.deleteObject({
                  Bucket: 'mi-app-recetas-2025',
                  Key: oldKey
                }).promise();
              } catch (s3Error) {
                console.log('Error al eliminar imagen:', s3Error);
              }
            }
          });
          nueva_imagen = null;
        }

        let sql, params;
        
        if (contrasena) {
          const hashedPassword = await bcrypt.hash(contrasena, 10);
          
          if (nueva_imagen !== null || mantener_imagen === 'false') {
            sql = 'UPDATE usuarios SET correo = ?, contrasena = ?, nombre_usuario = ?, imagen = ? WHERE id = ?';
            params = [correo, hashedPassword, nombre_usuario, nueva_imagen, id];
          } else {
            sql = 'UPDATE usuarios SET correo = ?, contrasena = ?, nombre_usuario = ? WHERE id = ?';
            params = [correo, hashedPassword, nombre_usuario, id];
          }
        } else {
          if (nueva_imagen !== null || mantener_imagen === 'false') {
            sql = 'UPDATE usuarios SET correo = ?, nombre_usuario = ?, imagen = ? WHERE id = ?';
            params = [correo, nombre_usuario, nueva_imagen, id];
          } else {
            sql = 'UPDATE usuarios SET correo = ?, nombre_usuario = ? WHERE id = ?';
            params = [correo, nombre_usuario, id];
          }
        }

        db.query(sql, params, (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
          
          res.status(200).json({ 
            mensaje: 'Usuario actualizado',
            ...(nueva_imagen && { nueva_imagen_url: nueva_imagen })
          });
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  static obtenerPerfil(req, res) {
    const usuario_id = req.userId; 

    db.query('SELECT id, correo, nombre_usuario, imagen FROM usuarios WHERE id = ?', [usuario_id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      
      const usuarioModel = new Usuario(results[0]);
      
      res.status(200).json({
        mensaje: 'Perfil obtenido',
        usuario: usuarioModel
      });
    });
  }

  static obtenerUsuarios(req, res) {
    db.query('SELECT id, correo, nombre_usuario, imagen FROM usuarios', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const usuarios = results.map(u => new Usuario(u));
      
      res.status(200).json(usuarios);
    });
  }

  static obtenerUsuarioPorId(req, res) {
    const { id } = req.params;
    db.query('SELECT id, correo, nombre_usuario, imagen FROM usuarios WHERE id = ?', [id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      
      res.status(200).json({
        mensaje: 'Usuario encontrado',
        usuario: results[0]
      });
    });
  }

  static async eliminarUsuario(req, res) {
    const { id } = req.params;
    
    const selectSql = 'SELECT imagen FROM usuarios WHERE id = ?';
    db.query(selectSql, [id], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

      const usuario = results[0];
      
      if (usuario.imagen) {
        try {
          const key = usuario.imagen.split('.amazonaws.com/')[1];
          await s3.deleteObject({
            Bucket: 'mi-app-recetas-2025',
            Key: key
          }).promise();
        } catch (s3Error) {
          console.log('Error al eliminar imagen de S3:', s3Error);
        }
      }

      db.query('DELETE FROM usuarios WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.status(200).json({ mensaje: 'Usuario e imagen eliminados' });
      });
    });
  }
}

module.exports = UsuarioController;