require('dotenv').config();
const db = require('../configs/db/db');
const Usuario = require('../models/usuarioModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class UsuarioController {

  static async registrarUsuario(req, res) {
    try {
      const { correo, contrasena, nombre_usuario } = req.body;

      console.log('📝 Datos recibidos para registro:', { correo, nombre_usuario });

      if (!correo || !contrasena || !nombre_usuario) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }

      const checkSql = 'SELECT * FROM usuarios WHERE correo = ?';
      db.query(checkSql, [correo], async (err, results) => {
        if (err) {
          console.error('❌ Error verificando correo:', err);
          return res.status(500).json({ error: err.message });
        }
        
        if (results.length > 0) {
          console.log('⚠️ El correo ya está registrado:', correo);
          return res.status(409).json({ error: 'El correo ya está registrado' });
        }

        try {
          const hashedPassword = await bcrypt.hash(contrasena, 10);

          const insertSql = 'INSERT INTO usuarios (correo, contrasena, nombre_usuario) VALUES (?, ?, ?)';
          db.query(insertSql, [correo, hashedPassword, nombre_usuario], (err, result) => {
            if (err) {
              console.error('❌ Error insertando usuario:', err);
              return res.status(500).json({ error: err.message });
            }


            const nuevoUsuario = new Usuario({
              id: result.insertId,
              correo,
              contrasena: hashedPassword,
              nombre_usuario,
              imagen_usuario: null
            });

            res.status(201).json({ 
              mensaje: 'Usuario registrado correctamente',
              usuario: {
                id: nuevoUsuario.id,
                correo: nuevoUsuario.correo,
                nombre_usuario: nuevoUsuario.nombre_usuario
              }
            });
          });
        } catch (hashError) {
          console.error('❌ Error encriptando contraseña:', hashError);
          res.status(500).json({ error: 'Error interno del servidor' });
        }
      });
    } catch (error) {
      console.error('❌ Error general en registro:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { correo, contrasena } = req.body;


      if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
      }

      const sql = 'SELECT * FROM usuarios WHERE correo = ?';
      db.query(sql, [correo], async (err, results) => {
        if (err) {
          console.error('❌ Error buscando usuario:', err);
          return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
          console.log('⚠️ Usuario no encontrado:', correo);
          return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const usuario = results[0];
        console.log('👤 Usuario encontrado:', usuario.nombre_usuario);

        try {
          const passwordMatch = await bcrypt.compare(contrasena, usuario.contrasena);

          if (!passwordMatch) {
            console.log('❌ Contraseña incorrecta para:', correo);
            return res.status(401).json({ error: 'Contraseña incorrecta' });
          }

          const token = jwt.sign({ userId: usuario.id }, process.env.SECRET_KEY, { expiresIn: '24h' });

          const usuarioModel = new Usuario({
            id: usuario.id,
            correo: usuario.correo,
            contrasena: usuario.contrasena,
            nombre_usuario: usuario.nombre_usuario,
            imagen_usuario: null
          });

          const usuarioResponse = {
            id: usuarioModel.id,
            correo: usuarioModel.correo,
            nombre_usuario: usuarioModel.nombre_usuario,
            imagen_usuario: usuarioModel.imagen_usuario
          };

          res.status(200).json({ 
            mensaje: 'Inicio de sesión exitoso', 
            token,
            usuario: usuarioResponse
          });
        } catch (compareError) {
          console.error('❌ Error comparando contraseña:', compareError);
          res.status(500).json({ error: 'Error interno del servidor' });
        }
      });
    } catch (error) {
      console.error('❌ Error general en login:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async actualizarUsuario(req, res) {
    try {
      const { id } = req.params;
      const { correo, contrasena, nombre_usuario } = req.body;

      console.log('🔄 Actualizando usuario ID:', id);

      if (!correo || !nombre_usuario) {
        return res.status(400).json({ error: 'Correo y nombre de usuario son obligatorios' });
      }

      let sql, params;
      
      if (contrasena) {
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        sql = 'UPDATE usuarios SET correo = ?, contrasena = ?, nombre_usuario = ? WHERE id = ?';
        params = [correo, hashedPassword, nombre_usuario, id];
        console.log('🔐 Actualizando con nueva contraseña');
      } else {
        sql = 'UPDATE usuarios SET correo = ?, nombre_usuario = ? WHERE id = ?';
        params = [correo, nombre_usuario, id];
        console.log('📝 Actualizando sin cambiar contraseña');
      }

      db.query(sql, params, (err, result) => {
        if (err) {
          console.error('❌ Error actualizando usuario:', err);
          return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows === 0) {
          console.log('⚠️ Usuario no encontrado para actualizar:', id);
          return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        
        console.log('✅ Usuario actualizado exitosamente');
        res.status(200).json({ 
          mensaje: 'Usuario actualizado correctamente'
        });
      });

    } catch (error) {
      console.error('❌ Error general actualizando usuario:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static obtenerPerfil(req, res) {
    const usuario_id = req.userId;

    console.log('👤 Obteniendo perfil para usuario ID:', usuario_id);

    db.query('SELECT id, correo, nombre_usuario FROM usuarios WHERE id = ?', [usuario_id], (err, results) => {
      if (err) {
        console.error('❌ Error obteniendo perfil:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (results.length === 0) {
        console.log('⚠️ Usuario no encontrado con ID:', usuario_id);
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      
      const usuarioData = results[0];
      const usuarioModel = new Usuario({
        ...usuarioData,
        imagen_usuario: null
      });
      
      console.log('✅ Perfil obtenido para:', usuarioModel.nombre_usuario);
      
      res.status(200).json({
        mensaje: 'Perfil obtenido',
        usuario: {
          id: usuarioModel.id,
          correo: usuarioModel.correo,
          nombre_usuario: usuarioModel.nombre_usuario
        }
      });
    });
  }

  static obtenerUsuarios(req, res) {
    console.log('📋 Obteniendo todos los usuarios');
    
    db.query('SELECT id, correo, nombre_usuario FROM usuarios', (err, results) => {
      if (err) {
        console.error('❌ Error obteniendo usuarios:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const usuarios = results.map(u => {
        const usuario = new Usuario({
          ...u,
          imagen_usuario: null
        });
        return {
          id: usuario.id,
          correo: usuario.correo,
          nombre_usuario: usuario.nombre_usuario
        };
      });
      
      console.log(`✅ Se encontraron ${usuarios.length} usuarios`);
      res.status(200).json(usuarios);
    });
  }

  static obtenerUsuarioPorId(req, res) {
    const { id } = req.params;
    console.log('🔍 Buscando usuario por ID:', id);
    
    db.query('SELECT id, correo, nombre_usuario FROM usuarios WHERE id = ?', [id], (err, results) => {
      if (err) {
        console.error('❌ Error buscando usuario:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (results.length === 0) {
        console.log('⚠️ Usuario no encontrado con ID:', id);
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      
      const usuarioData = results[0];
      const usuarioModel = new Usuario({
        ...usuarioData,
        imagen_usuario: null
      });
      
      console.log('✅ Usuario encontrado:', usuarioModel.nombre_usuario);
      
      res.status(200).json({
        mensaje: 'Usuario encontrado',
        usuario: {
          id: usuarioModel.id,
          correo: usuarioModel.correo,
          nombre_usuario: usuarioModel.nombre_usuario
        }
      });
    });
  }

  static eliminarUsuario(req, res) {
    const { id } = req.params;
    console.log('🗑️ Eliminando usuario ID:', id);
    
    db.query('DELETE FROM usuarios WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('❌ Error eliminando usuario:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (result.affectedRows === 0) {
        console.log('⚠️ Usuario no encontrado para eliminar:', id);
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      
      console.log('✅ Usuario eliminado exitosamente');
      res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
    });
  }
}

module.exports = UsuarioController;