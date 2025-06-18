class Usuario {
  constructor({ 
    id = null, 
    correo, 
    contrasena, 
    nombre_usuario,
    imagen_usuario = null 
  }) {
    this.id = id;
    this.correo = correo;
    this.contrasena = contrasena;
    this.nombre_usuario = nombre_usuario;
    this.imagen_usuario = imagen_usuario; 
  }
}

module.exports = Usuario;