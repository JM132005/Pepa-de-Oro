// informes.ts → INFORMES DESCARGABLES. Cada rol ve los informes de su área (el gerente, todos).
// Se elige el informe, se ponen los filtros (fechas, producto, cliente o código de lote), se ve una vista
// previa y se descarga en PDF (para imprimir o enviar) o en Excel (para analizar).
// El informe gerencial mensual también se envía solo al correo del gerente el día 1 (o con el botón).

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnaliticaService } from '../../../compartido/Servicios/analitica.service';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Informe, InformeCatalogo } from '../../../compartido/Entidades/analitica';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Cliente } from '../../../compartido/Entidades/ventas';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { SelectorPeriodo } from '../../../compartido/Componentes/selector-periodo/selector-periodo';
import { SelectorCliente } from '../../Componentes/selector-cliente/selector-cliente';
import { Filtros } from '../../../compartido/Servicios/api.service';
import { isoDia } from '../../../compartido/Utils/formato';
import { ejecutar } from '../../Utils/acciones';

@Component({
  selector: 'app-informes',
  imports: [FormsModule, Icono, Cargando, SelectorPeriodo, SelectorCliente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './informes.html',
})
export class Informes {
  private readonly analitica = inject(AnaliticaService);
  private readonly catalogo = inject(CatalogoService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly lista = signal<InformeCatalogo[]>([]);
  readonly elegido = signal<InformeCatalogo | null>(null);
  readonly vista = signal<Informe | null>(null);
  readonly cargando = signal(false);
  readonly ocupado = signal(false);
  readonly productos = signal<Producto[]>([]);
  // Filtros
  readonly desde = signal(isoDia(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  readonly hasta = signal(isoDia());
  readonly producto = signal('');
  readonly cliente = signal<Cliente | null>(null);
  readonly codigo = signal('');

  // porArea: los informes agrupados por área (Ventas, Inventario, Campo…).
  readonly porArea = computed(() => {
    const g = new Map<string, InformeCatalogo[]>();
    for (const i of this.lista()) g.set(i.area, [...(g.get(i.area) ?? []), i]);
    return [...g.entries()];
  });
  readonly filtrosListos = computed(() => {
    const i = this.elegido();
    if (!i) return false;
    if (i.filtros.includes('producto') && !this.producto()) return false;
    if (i.filtros.includes('cliente') && !this.cliente()) return false;
    if (i.filtros.includes('codigo') && !this.codigo().trim()) return false;
    return true;
  });

  constructor() {
    this.analitica.informes().subscribe((l) => this.lista.set(l));
    this.catalogo.productos({ todos: true }).subscribe((p) => this.productos.set(p));
  }

  elegir(i: InformeCatalogo) {
    this.elegido.set(i);
    this.vista.set(null);
  }

  // filtros(): solo los que pide ese informe.
  private filtros(formato?: string): Filtros {
    const i = this.elegido()!;
    const f: Filtros = { formato };
    if (i.filtros.includes('fechas')) Object.assign(f, { desde: this.desde(), hasta: this.hasta() });
    if (i.filtros.includes('producto')) f['producto'] = this.producto();
    if (i.filtros.includes('cliente')) f['cliente'] = this.cliente()?._id;
    if (i.filtros.includes('codigo')) f['codigo'] = this.codigo().trim().toUpperCase();
    return f;
  }

  previsualizar() {
    const i = this.elegido();
    if (!i || !this.filtrosListos()) return;
    this.cargando.set(true);
    this.analitica.informe(i.id, this.filtros()).subscribe({
      next: (r) => {
        this.vista.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(e);
      },
    });
  }

  pdf() {
    const i = this.elegido();
    if (i && this.filtrosListos()) this.archivos.verPdf(`informes/${i.id}`, i.titulo, `${i.id}.pdf`, this.filtros('pdf'));
  }

  excel() {
    const i = this.elegido();
    if (i && this.filtrosListos()) this.archivos.descargar(`informes/${i.id}`, `${i.id}.xlsx`, this.filtros('xlsx'));
  }

  enviarGerencial() {
    ejecutar(this.analitica.enviarGerencial(), { avisos: this.avisos, ocupado: this.ocupado, exito: (r) => `Informe gerencial enviado a ${r.enviados} correo(s)` });
  }

  periodo(p: { desde: string; hasta: string }) {
    this.desde.set(p.desde);
    this.hasta.set(p.hasta);
  }
}
