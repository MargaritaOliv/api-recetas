class Receta {
  constructor({ id = null, nombre, ingredientes, pasos, tiempo_preparacion, usuario_id }) {
    this.id = id;
    this.nombre = nombre;
    this.ingredientes = ingredientes;
    this.pasos = pasos;
    this.tiempo_preparacion = tiempo_preparacion;
    this.usuario_id = usuario_id;
  }
}

module.exports = Receta;
