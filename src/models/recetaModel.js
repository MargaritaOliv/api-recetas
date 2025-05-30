class Receta {
  constructor({ id = null, nombre, ingredientes, pasos, tiempo_preparacion }) {
    this.id = id;
    this.nombre = nombre;
    this.ingredientes = ingredientes; 
    this.pasos = pasos; 
    this.tiempo_preparacion = tiempo_preparacion;
  }
}

module.exports = Receta;
