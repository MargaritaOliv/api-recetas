const db = require('../configs/db/db');
const Receta = require('../models/recetaModel');

class RecetaController {

  static create(req, res) {
    const { nombre, ingredientes, pasos, tiempo_preparacion } = req.body;
    const usuario_id = req.userId; 

    if (!nombre || !ingredientes || !pasos || !tiempo_preparacion) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const ingredientesJSON = JSON.stringify(ingredientes);
    const pasosJSON = JSON.stringify(pasos);

    const sql = `INSERT INTO recetas (nombre, ingredientes, pasos, tiempo_preparacion, usuario_id) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [nombre, ingredientesJSON, pasosJSON, tiempo_preparacion, usuario_id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      const nuevaReceta = new Receta({
        id: result.insertId,
        nombre,
        ingredientes,
        pasos,
        tiempo_preparacion
      });

      res.status(201).json({ message: 'Receta creada', receta: nuevaReceta });
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
        tiempo_preparacion: r.tiempo_preparacion
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
        tiempo_preparacion: r.tiempo_preparacion
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
        tiempo_preparacion: r.tiempo_preparacion
      }));

      res.json(recetas);
    });
  }

  static update(req, res) {
    const { id } = req.params;
    const { nombre, ingredientes, pasos, tiempo_preparacion } = req.body;

    if (!nombre || !ingredientes || !pasos || !tiempo_preparacion) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const ingredientesJSON = JSON.stringify(ingredientes);
    const pasosJSON = JSON.stringify(pasos);

    const sql = `UPDATE recetas SET nombre = ?, ingredientes = ?, pasos = ?, tiempo_preparacion = ? WHERE id = ?`;
    db.query(sql, [nombre, ingredientesJSON, pasosJSON, tiempo_preparacion, id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Receta no encontrada' });

      res.json({ message: 'Receta actualizada' });
    });
  }

  static delete(req, res) {
    const { id } = req.params;
    const sql = `DELETE FROM recetas WHERE id = ?`;
    db.query(sql, [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Receta no encontrada' });

      res.json({ message: 'Receta eliminada' });
    });
  }
}

module.exports = RecetaController;
