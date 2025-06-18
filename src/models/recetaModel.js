
class Receta {
  constructor({ 
    id = null, 
    nombre, 
    ingredientes, 
    pasos, 
    tiempo_preparacion, 
    usuario_id,
    imagen_receta = null  
  }) {
    this.id = id;
    this.nombre = nombre;
    this.ingredientes = ingredientes;
    this.pasos = pasos;
    this.tiempo_preparacion = tiempo_preparacion;
    this.usuario_id = usuario_id;
    this.imagen_receta = imagen_receta; 
  }
}

module.exports = Receta;