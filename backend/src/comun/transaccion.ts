// transaccion.ts → ayuda para hacer varias escrituras "todo o nada".
//
// ¿Qué es una transacción? Imagina emitir una factura: se guarda la factura, se descuenta el stock
// y se suma la deuda del cliente. Si se va la luz a la mitad, NO puede quedar la factura sin descontar
// stock. Una transacción garantiza que se hacen las tres cosas o ninguna.
//
// MongoDB solo permite transacciones cuando corre como "replica set". Por eso:
//   - Si MONGO_TRANSACCIONES=true (replica set configurado) → se usa una transacción real.
//   - Si no (Mongo simple de desarrollo o el de las pruebas) → se ejecuta en orden normal;
//     igual se protegen los datos porque cada descuento de stock es una actualización atómica
//     condicionada ("resta 5 SOLO SI hay 5 o más"), y la regla RN-12 nunca deja stock negativo.
//
// mongoose.set('transactionAsyncLocalStorage', true) (en app.module.ts) hace que TODAS las consultas
// dentro de conexion.transaction() usen la sesión solas, sin pasarla a mano a cada función.

import type { Connection } from 'mongoose';

export async function enTransaccion<T>(conexion: Connection, trabajo: () => Promise<T>): Promise<T> {
  if (process.env.MONGO_TRANSACCIONES === 'true') {
    // transaction(): abre sesión, ejecuta "trabajo", hace commit; si hay error, hace rollback.
    return conexion.transaction(trabajo);
  }
  return trabajo();
}
