// lista-interes.service.ts → la "lista de interés" del visitante de la web (NO es un carrito: no se paga).
// Guarda en el navegador los productos que quiere cotizar; luego envía UNA solicitud con todos.

import { Injectable, computed, signal } from '@angular/core';
import { CLAVE_INTERES } from '../Utils/config';

export interface ItemInteres {
  productoId: string;
  nombre: string;
  sku: string;
  cantidad: number;
  precioMenor: number;
  imagen?: string;
}

@Injectable({ providedIn: 'root' })
export class ListaInteresService {
  readonly items = signal<ItemInteres[]>(this.leer());
  readonly cantidad = computed(() => this.items().length);
  readonly abierta = signal(false);

  agregar(item: ItemInteres) {
    this.items.update((lista) => {
      const existe = lista.find((x) => x.productoId === item.productoId);
      // map(): si ya estaba, solo suma la cantidad; si no, se agrega al final.
      return existe ? lista.map((x) => (x.productoId === item.productoId ? { ...x, cantidad: x.cantidad + item.cantidad } : x)) : [...lista, item];
    });
    this.guardar();
    this.abierta.set(true);
  }

  cambiarCantidad(productoId: string, cantidad: number) {
    this.items.update((lista) => lista.map((x) => (x.productoId === productoId ? { ...x, cantidad: Math.max(1, cantidad) } : x)));
    this.guardar();
  }

  quitar(productoId: string) {
    this.items.update((lista) => lista.filter((x) => x.productoId !== productoId));
    this.guardar();
  }

  vaciar() {
    this.items.set([]);
    this.guardar();
  }

  private leer(): ItemInteres[] {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_INTERES) ?? '[]') as ItemInteres[];
    } catch {
      return [];
    }
  }
  private guardar() {
    try {
      localStorage.setItem(CLAVE_INTERES, JSON.stringify(this.items()));
    } catch {
      /* sin almacenamiento */
    }
  }
}
