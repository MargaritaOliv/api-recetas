export class Usuario {
  constructor({ id = null, correo, contrasena, nombre_usuario }) {
    this.id = id;
    this.correo = correo;
    this.contrasena = contrasena;
    this.nombre_usuario = nombre_usuario;
  }
}
