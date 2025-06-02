require('dotenv').config();
const db = require('../configs/db/db');
const Usuario = require('../models/usuarioModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class UsuarioController {

static async registrarUsuario(req, res) {
  const { correo, contrasena, nombre_usuario } = req.body;

  if (!correo || !contrasena || !nombre_usuario) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const checkSql = 'SELECT * FROM usuarios WHERE correo = ?';
    db.query(checkSql, [correo], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length > 0) {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }

      const hashedPassword = await bcrypt.hash(contrasena, 10);

      const insertSql = 'INSERT INTO usuarios (correo, contrasena, nombre_usuario) VALUES (?, ?, ?)';
      db.query(insertSql, [correo, hashedPassword, nombre_usuario], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(201).json({ mensaje: 'Usuario registrado correctamente' });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
      res.status(200).json({ mensaje: 'Inicio de sesión exitoso', token });
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

    bcrypt.hash(contrasena, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ error: err.message });

      const sql = 'UPDATE usuarios SET correo = ?, contrasena = ?, nombre_usuario = ? WHERE id = ?';
      db.query(sql, [correo, hashedPassword, nombre_usuario, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        res.status(200).json({ mensaje: 'Usuario actualizado' });
      });
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
