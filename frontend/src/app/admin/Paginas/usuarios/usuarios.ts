// usuarios.ts → USUARIOS del sistema (solo gerente). Un usuario puede tener VARIOS roles
// (ej. "Bodega + Logística"); el menú y la API se ajustan a la unión de sus roles.
// La contraseña se guarda cifrada con bcrypt en el backend (nunca se puede ver, solo cambiar).

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SistemaService } from '../../../compartido/Servicios/sistema.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Usuario } from '../../../compartido/Entidades/usuario';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { FormularioDinamico, CampoFormulario } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { CAMPOS_USUARIO } from '../../Formularios/campos';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

@Component({
  selector: 'app-usuarios',
  imports: [Tabla, Modal, Icono, FormularioDinamico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuarios.html',
})
export class Usuarios {
  private readonly sistema = inject(SistemaService);
  private readonly avisos = inject(NotificacionService);

  readonly usuarios = signal<Usuario[]>([]);
  readonly editando = signal<Partial<Usuario> | null>(null);
  readonly ocupado = signal(false);

  // Al crear, la contraseña es obligatoria; al editar, opcional (vacía = no se cambia).
  readonly campos = computed<CampoFormulario[]>(() => {
    const nuevo = !this.editando()?._id;
    return [
      ...CAMPOS_USUARIO,
      { nombre: 'contrasena', etiqueta: nuevo ? 'Contraseña (mínimo 8)' : 'Nueva contraseña (vacía = no cambiar)', tipo: 'contrasena', requerido: nuevo },
      ...(nuevo ? [] : [{ nombre: 'activo', etiqueta: 'Activo (puede ingresar)', tipo: 'casilla' as const }]),
    ];
  });
  readonly columnas: Columna[] = [
    { campo: 'nombre', titulo: 'Nombre' },
    { campo: 'correo', titulo: 'Correo' },
    { campo: 'roles', titulo: 'Roles', valor: (u: Usuario) => u.roles.map((r) => texto(r)).join(' + ') },
    { campo: 'cargo', titulo: 'Cargo', ocultarEnMovil: true },
    { campo: 'activo', titulo: 'Activo', tipo: 'booleano' },
  ];

  constructor() {
    this.cargar();
  }

  cargar() {
    this.sistema.usuarios().subscribe((u) => this.usuarios.set(u));
  }

  guardar(datos: Record<string, unknown>) {
    const actual = this.editando();
    if (!(datos['roles'] as string[] | undefined)?.length) {
      this.avisos.error(new Error('Elige al menos un rol'));
      return;
    }
    const peticion = actual?._id ? this.sistema.actualizarUsuario(actual._id, datos) : this.sistema.crearUsuario(datos as Partial<Usuario> & { contrasena: string });
    ejecutar(peticion, { avisos: this.avisos, ocupado: this.ocupado, exito: 'Usuario guardado', luego: () => { this.editando.set(null); this.cargar(); } });
  }
}
