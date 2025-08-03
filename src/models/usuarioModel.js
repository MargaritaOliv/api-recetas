class Usuario {
  constructor({ 
    id = null, 
    correo, 
    contrasena, 
    nombre_usuario,
    rol = 'usuario', 
    fcm_token = null,
    fecha_registro = new Date(),
    activo = true
  }) {
    this.id = id;
    this.correo = correo;
    this.contrasena = contrasena;
    this.nombre_usuario = nombre_usuario;
    this.rol = rol;
    this.fcm_token = fcm_token;
    this.fecha_registro = fecha_registro;
    this.activo = activo;
  }

  esAdmin() {
    return this.rol === 'admin';
  }

  esUsuario() {
    return this.rol === 'usuario';
  }
}

module.exports = Usuario;