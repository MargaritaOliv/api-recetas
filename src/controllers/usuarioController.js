const db = require('../configs/db/db');
const  Usuario  = require('../models/usuarioModel'); 

class UsuarioController {
  
  static crearUsuario(req, res) {
    const { correo, contrasena, nombre_usuario } = req.body;
    const sql = 'INSERT INTO usuarios (correo, contrasena, nombre_usuario) VALUES (?, ?, ?)';
    db.query(sql, [correo, contrasena, nombre_usuario], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ mensaje: 'Usuario creado'});
    });
  }

  static obtenerUsuarios(req, res) {
    db.query('SELECT * FROM usuarios', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      const usuarios = results.map(u => new Usuario(u));
      res.status(200).json(usuarios);
    });
  }

  static obtenerUsuarioPorId(req, res) {
    const { id } = req.params;
    db.query('SELECT * FROM usuarios WHERE id = ?', [id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      res.status(200).json(new Usuario(results[0]));
    });
  }

  static actualizarUsuario(req, res) {
    const { id } = req.params;
    const { correo, contrasena, nombre_usuario } = req.body;
    const sql = 'UPDATE usuarios SET correo = ?, contrasena = ?, nombre_usuario = ? WHERE id = ?';
    db.query(sql, [correo, contrasena, nombre_usuario, id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      res.status(200).json({ mensaje: 'Usuario actualizado' });
    });
  }

  static eliminarUsuario(req, res) {
    const { id } = req.params;
    db.query('DELETE FROM usuarios WHERE id = ?', [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      res.status(200).json({ mensaje: 'Usuario eliminado' });
    });
  }
}

module.exports = UsuarioController;
