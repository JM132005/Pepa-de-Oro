# 06 · Base de datos (MongoDB): colecciones, relaciones e índices

> Base `pepadeoro` en MongoDB 8. **32 colecciones** (31 normales + `clima` como *time series*).
> Cada colección se define con un esquema de Mongoose en `backend/src/modulos/<modulo>/esquemas/` y todas se
> registran en `backend/src/base-datos.module.ts`. Para verla con ventanas: **MongoDB Compass** →
> `mongodb://localhost:27017` → base `pepadeoro`.

## Índice
1. [Mapa de colecciones por área](#1-mapa-de-colecciones-por-área)
2. [Relaciones: el camino del kilo de cacao](#2-relaciones-el-camino-del-kilo-de-cacao)
3. [Colección por colección](#3-colección-por-colección)
4. [Embebido o referencia: cuándo se usó cada uno](#4-embebido-o-referencia)
5. [Índices](#5-índices)
6. [Operadores de MongoDB usados y dónde](#6-operadores-de-mongodb-usados-y-dónde)
7. [Transacciones y consistencia](#7-transacciones-y-consistencia)
8. [Consultas para probar en Compass o mongosh](#8-consultas-para-probar)

---

## 1. Mapa de colecciones por área

| Área | Colecciones | Documentos tras la semilla (12 meses, aprox.) |
|---|---|---|
| Base | `usuarios`, `configuracion`, `auditoria`, `contadores` | 11 · 1 · — · ~200 |
| Campo | `haciendas`, `parcelas`, `trabajadores`, `labores`, `cosechas`, `monitoreos_sanidad`, `clima` (time series) | 3 · 13 · 36 · ~350 · ~340 · ~110 · ~1 150 |
| Acopio | `productores`, `precios_dia`, `liquidaciones` | 120 · ~340 · ~700 |
| Poscosecha y calidad | `lotes_grano` | ~1 000 |
| Producción | `recetas`, `ordenes_produccion` | 31 · ~290 |
| Catálogo e inventario | `productos`, `bodegas`, `lotes_producto`, `movimientos_inventario` | 70 · 6 · ~1 400 · ~11 000 |
| Ventas | `clientes`, `cotizaciones`, `pedidos`, `turnos_caja`, `facturas` | 78 · ~180 · ~140 · ~330 · ~3 000 |
| Equipos y operaciones | `activos`, `alquileres`, `viajes`, `ordenes_mantenimiento` | 41 · ~50 · ~280 · ~130 |
| Web | `contenido_web`, `solicitudes_web` | 5 · ~100 |

---

## 2. Relaciones: el camino del kilo de cacao

```
 parcelas ──< cosechas ─┐                                    ┌─> facturas (items[].lotes)
  (haciendas)           ├─> lotes_grano ──> ordenes_produccion ──> lotes_producto ──<  movimientos_inventario
 productores ──< liquidaciones ─┘   (calidad,       (receta,            (bodega,         └─> pedidos (reservas)
                                     historial      consumos)            vencimiento)
                                     embebidos)
 clientes ──< cotizaciones ──> pedidos ──> facturas ──< notas de crédito (misma colección, tipo 04)
 activos ──< alquileres · viajes · ordenes_mantenimiento
```

- `──<` = "uno a muchos" (una parcela tiene muchas cosechas).
- Este camino es el que recorre **"Rastrea tu cacao"** (`rastreo.service.ts`) hacia atrás: de un lote de producto a la parcela o al productor.

---

## 3. Colección por colección

🔑 = índice único · → = referencia a otra colección (`ObjectId`) · 📦 = subdocumento o arreglo embebido.
Todas tienen `_id`, `createdAt` y `updatedAt` (`timestamps: true`).

### Base

| Colección | Campos principales | Esquema |
|---|---|---|
| `usuarios` | `correo`🔑, `nombre`, `contrasenaHash` (bcrypt, nunca se devuelve), `roles[]`, `cargo`, `activo` | `usuarios/esquemas/usuario.esquema.ts` |
| `configuracion` | Un solo documento: `empresa` (RUC, establecimiento, punto de emisión), `iva`, `calidad` (tabla de grados), `ventas` (topes de descuento, límite consumidor final), `acopio`, `alertas` | `configuracion/configuracion.esquema.ts` |
| `auditoria` | `usuarioId`→usuarios, `usuarioNombre`, `accion`, `entidad`, `entidadId`, `antes`📦, `despues`📦, `sensible`, `ip`, `fecha` | `auditoria/auditoria.esquema.ts` |
| `contadores` | `_id` = nombre de la secuencia (ej. `FACTURA-001-001`), `valor` | `comun/esquemas/contador.esquema.ts` |

### Campo

| Colección | Campos principales | Esquema |
|---|---|---|
| `haciendas` | `codigo`🔑, `nombre`, `canton`, `ubicacion`📦, `hectareasTotales`, `altitudMsnm`, `cultivos[]`, `certificaciones[]`, `imagen` | `campo/esquemas/hacienda.esquema.ts` |
| `parcelas` | `codigo`🔑 (ej. `LE-P03`), `hacienda`→, `hectareas`, `cultivo`, `variedad`, `anioSiembra`, `plantas`, `estado`, `planLabores`📦 | `parcela.esquema.ts` |
| `trabajadores` | `cedula`🔑, `nombre`, `cargo`, `hacienda`→, `jornalDiario`, `licenciaVence` | `trabajador.esquema.ts` |
| `labores` | `parcela`→, `tipo`, `fecha`, `cuadrilla`→trabajadores, `insumos`📦→productos, `agroquimico`📦 (días de carencia, RN-01), `costoTotal` | `labor.esquema.ts` |
| `cosechas` | `parcela`→, `fecha`, `mazorcas`, `kg`, `cuadrilla`→, `costoManoObra`, `loteGrano`→ | `cosecha.esquema.ts` |
| `monitoreos_sanidad` | `parcela`→, `plaga`, `evaluadas`, `afectadas`, `incidencia`, `accion` | `monitoreo-sanidad.esquema.ts` |
| `clima` | **Time series**: `fecha` (timeField), `hacienda` (metaField), `lluviaMm`, `temperaturaMax`, `temperaturaMin`, `humedadRelativa` | `clima.esquema.ts` (se crea en `campo.service.ts` → `prepararColecciones()`) |

### Acopio, poscosecha y calidad

| Colección | Campos principales | Esquema |
|---|---|---|
| `productores` | `cedula`🔑 (RN-02), `nombre`, `finca`, `canton`, `hectareas`, `certificaciones[]`, `activo` (RN-03), `anticipos`📦, `saldoAnticipo` | `acopio/esquemas/productor.esquema.ts` |
| `precios_dia` | `fecha`, `cultivo`, `variedad`, `estado` (baba/seco), `precioQq` | `precio-dia.esquema.ts` |
| `liquidaciones` | `numero`🔑, `productor`📦, `loteGrano`→, `kgBrutos`, `humedad`, `descuentoHumedadKg` (RN-04), `kgPagables`, `precioQq`, `totalPagar`, `pagos`📦, `saldo`, `estadoPago` | `liquidacion.esquema.ts` |
| `lotes_grano` | `codigo`🔑 (`L-2026-0887`), `origen` (PROPIO/COMPRA), `cultivo`, `variedad`, `estadoEntrega`, `kgEntrada`, `kgSeco`, `estado` (RECIBIDO → FERMENTANDO → SECANDO → SECO → ALMACENADO / RECHAZADO), `fermentacion`📦 (volteos), `secado`📦 (mediciones), `calidad`📦 (prueba de corte, grado), `historial`📦, `liquidacion`→, `cosecha`→ | `poscosecha/esquemas/lote-grano.esquema.ts` |

### Producción, catálogo e inventario

| Colección | Campos principales | Esquema |
|---|---|---|
| `productos` | `sku`🔑, `slug` (URL de la web), `nombre`, `familia`, `tipo` (GRANO/SEMIELABORADO/TERMINADO/INSUMO/REPUESTO), `unidad`, `precioMenor`, `precioMayor`, `cantidadMinimaMayor` (RN-16), `tarifaIva`, `costoPromedio`, `stockMinimo`, `vidaUtilDias`, `publicado` | `productos/esquemas/producto.esquema.ts` |
| `recetas` | `producto`🔑→, `cantidadBase`, `componentes`📦→productos, `horasMaquina`, `manoObraHoras`, `rendimientoEsperado` | `produccion/esquemas/receta.esquema.ts` |
| `ordenes_produccion` | `codigo`🔑, `producto`→, `receta`→, `maquina`→activos, `estado` (PLANIFICADA → EN_PROCESO → TERMINADA / ANULADA), `requerimientos`📦, `reservas`📦, `consumos`📦, `cantidadBuena`, `costos`📦, `loteProducto` | `orden-produccion.esquema.ts` |
| `bodegas` | `codigo`🔑, `nombre`, `tipo` (MATERIA_PRIMA, PRODUCTO_TERMINADO, TIENDA, INSUMOS_PLANTA, INSUMOS_CAMPO, REPUESTOS) | `inventario/esquemas/bodega.esquema.ts` |
| `lotes_producto` | **El stock**: `producto`→, `bodega`→, `codigo`, `cantidad`, `reservado`, `costoUnitario`, `vencimiento` (FEFO), `liberado` (RN-11), `bloqueado` | `lote-producto.esquema.ts` |
| `movimientos_inventario` | **El kárdex**: `tipo` (ENTRADA_COSECHA, ENTRADA_ACOPIO, ENTRADA_PRODUCCION, SALIDA_VENTA, SALIDA_PRODUCCION, TRANSFERENCIA, BAJA_VENCIMIENTO…), `producto`→, `lote`→, `cantidad`, `signo`, `saldoProducto`, `documento`📦, `motivo` (RN-15) | `movimiento.esquema.ts` |

### Ventas y facturación

| Colección | Campos principales | Esquema |
|---|---|---|
| `clientes` | `identificacion`🔑 (RN-02), `tipoIdentificacion`, `nombre`, `correo`, `tipoCliente`, `creditoDias`, `cupo` (RN-18), `vendedor`→usuarios | `ventas/esquemas/cliente.esquema.ts` |
| `cotizaciones` | `numero`🔑, `cliente`→, `items`📦, `totales`📦, `vence` (RN-22), `estado`, `envios`📦, `pedido`→ | `cotizacion.esquema.ts` |
| `pedidos` | `numero`🔑, `cliente`→, `cotizacion`→, `items`📦 (con lotes reservados), `estado`, `entrega`📦, `exportacion`📦, `viaje`→, `factura`→ | `pedido.esquema.ts` |
| `turnos_caja` | `cajero`→usuarios, `apertura`, `montoInicial`, `cierre`, `contado`, `esperado`, `diferencia`, `ventasPorFormaPago`📦 | `turno-caja.esquema.ts` |
| `facturas` | `tipoComprobante` (01 factura / 04 nota de crédito) + `numero` (🔑 compuesto, RN-20), `claveAcceso`🔑 (49 dígitos), `cliente`📦 (copia), `items`📦, `subtotalIva`, `subtotal0`, `iva`, `total`, `pagos`📦, `abonos`📦, `saldo`, `estado` (EMITIDA/ANULADA, RN-21), `envios`📦, `facturaModificada` (en la NC) | `facturacion/esquemas/factura.esquema.ts` |

### Equipos, logística y mantenimiento

| Colección | Campos principales | Esquema |
|---|---|---|
| `activos` | `codigo`🔑, `nombre`, `tipo` (TRACTOR, CAMION, FERMENTADOR, TENDAL…), `capacidadKg` (RN-05, RN-25), `usos[]` (ALQUILER, VENTA, USO_INTERNO), `estado` (RN-24), `tarifas`📦, `horometro`, `odometro`, `documentos`📦 (SOAT, matrícula, con `vence`), `planMantenimiento`📦 (RN-26), `publicado` | `equipos/esquemas/activo.esquema.ts` |
| `alquileres` | `codigo`🔑, `activo`→, `cliente`→, `desde`, `hasta` (RN-23), `tarifaDia`, `garantia`, `estado`, `entrega`📦, `devolucion`📦, `factura`→ | `alquiler.esquema.ts` |
| `viajes` | `codigo`🔑, `tipo`, `camion`→activos, `chofer`→trabajadores, `carga`📦 (kg, RN-25), `salida`, `llegada`, `kmSalida`, `kmLlegada`, `costos`📦, `guiaRemision`📦, `factura`→ | `logistica/esquemas/viaje.esquema.ts` |
| `ordenes_mantenimiento` | `codigo`🔑, `tipo` (PREVENTIVO/CORRECTIVO/SERVICIO_CLIENTE), `activo`→, `cliente`→, `prioridad`, `checklist`📦, `repuestos`📦, `horasManoObra`, `costos`📦, `estado` | `mantenimiento/esquemas/orden-mantenimiento.esquema.ts` |

### Web

| Colección | Campos principales | Esquema |
|---|---|---|
| `contenido_web` | `clave`🔑 (`inicio`, `nosotros`, `servicios`, `testimonios`, `contacto`), `titulo`, `datos`📦 (JSON libre), `actualizadoPor` | `web/esquemas/contenido-web.esquema.ts` |
| `solicitudes_web` | `numero`🔑, `tipo` (COTIZACION, ALQUILER, SERVICIO, CONTACTO, AVISO_STOCK), `nombre`, `correo`, `items`📦→productos, `activo`→, `estado`, `cotizacion`→, `avisado` | `solicitud-web.esquema.ts` |

### Ejemplo real: un lote de grano

```json
{
  "codigo": "L-2026-0887",
  "origen": "COMPRA",
  "cultivo": "CAFE",
  "variedad": "ARABICA",
  "estadoEntrega": "CEREZA",
  "productor": { "id": "68dbd450...", "nombre": "Byron Román Vásquez", "canton": "Atahualpa" },
  "kgEntrada": 413.5,
  "humedadEntrada": 60.3,
  "costoTotal": 512.68,
  "estado": "RECIBIDO",
  "historial": [
    { "fecha": "2026-10-20T13:02:00Z", "evento": "RECEPCION", "detalle": "413.5 kg cereza de Byron Román Vásquez", "usuario": "Marco Espinoza" }
  ],
  "liquidacion": "6ad766485674270ea314ee26"
}
```

---

## 4. Embebido o referencia

| Se **embebe** (dentro del documento) cuando… | Se **referencia** (`ObjectId`) cuando… |
|---|---|
| Los datos pertenecen a ese documento y se leen siempre juntos | Los datos tienen vida propia y se comparten |
| `historial`, `fermentacion`, `secado` y `calidad` del lote de grano | El `productor` (entrega muchos lotes) → aunque se guarda una **copia** del nombre para no perderlo |
| `items` y `pagos` de la factura | La `factura` desde el pedido y el alquiler |
| `documentos` y `planMantenimiento` del activo | El `activo` desde alquileres, viajes y órdenes |
| Copia del `cliente` en la factura (la factura no cambia si el cliente cambia de dirección, como exige el SRI) | El `cliente` desde cotizaciones y pedidos |

> Así **una lectura** del lote de grano trae toda su historia, y la factura queda tal como se emitió.

---

## 5. Índices

| Colección | Índice | Para qué |
|---|---|---|
| Casi todas | `codigo` / `numero` / `sku` / `cedula` / `identificacion` / `correo` únicos | No repetir códigos ni personas |
| `facturas` | `{ tipoComprobante: 1, numero: 1 }` único | La factura 001-001-000000001 y la NC 001-001-000000001 pueden existir a la vez (secuencias separadas del SRI) |
| `facturas` | `{ fechaEmision: -1 }` y `{ 'cliente.id': 1, saldo: 1 }` | Listados recientes y cartera por cliente |
| `lotes_producto` | `{ producto: 1, bodega: 1, codigo: 1 }` único y `{ vencimiento: 1 }` | Un lote por bodega y salidas FEFO rápidas |
| `movimientos_inventario` | `{ producto: 1, fecha: -1 }` | Kárdex de un producto |
| `lotes_grano` | `{ estado: 1, fechaRecepcion: -1 }` | Pantalla de poscosecha (lotes por estado) |
| `labores` | `{ parcela: 1, fecha: -1 }` | Ficha de la parcela y carencia (RN-01) |
| `alquileres` | `{ activo: 1, desde: 1 }` | Buscar cruces de fechas (RN-23) |
| `precios_dia` | `{ cultivo: 1, variedad: 1, estado: 1, fecha: -1 }` | Precio vigente del día |
| `productos` | `{ familia: 1, publicado: 1 }`, `slug` | Catálogo de la web |
| `auditoria` | `{ fecha: -1 }` | Bitácora reciente |

---

## 6. Operadores de MongoDB usados y dónde

| Operador | Para qué | Ejemplo en el código |
|---|---|---|
| `$set` | Cambiar campos | Cambiar el estado de un lote de grano (`poscosecha.service.ts`) |
| `$push` | Agregar a un arreglo | Agregar un evento al `historial` o un abono a la factura |
| `$inc` | Sumar a un número de forma atómica | Siguiente secuencial (`contadores.service.ts` → `siguiente()`) y descontar stock |
| `$gte` / `$lte` / `$gt` / `$lt` | Rangos | Ventas de un periodo en `kpis.service.ts`; "resta 5 solo si hay 5 o más" en `inventario.service.ts` |
| `$in` / `$nin` | Está / no está en una lista | Lotes en `RECIBIDO`, `FERMENTANDO` o `SECANDO` |
| `$ne` | Distinto de | Solicitudes que no están `DESCARTADA` |
| `$or` | Una condición u otra | Búsqueda por nombre o identificación |
| `$regex` + `$options: 'i'` | Búsqueda parcial sin mayúsculas | Buscar clientes y productos |
| `$exists` | El campo existe | Lotes con fecha de vencimiento |
| `$round`, `$max`, `$ifNull` (update con pipeline) | Redondear la cantidad a 3 decimales y nunca negativa | `inventario.service.ts` → `normalizar()` |
| `upsert` + `$setOnInsert` | Crear si no existe | Contadores y contenido web |
| `timeseries` | Colección de series de tiempo | `clima` |

> Los KPIs se calculan en `analitica/kpis.service.ts` con consultas filtradas por fecha (`$gte`/`$lte`) y los
> totales se suman en el servicio. Pasar los más pesados a *aggregation pipeline* (`$match`, `$group`, `$sum`)
> es una mejora natural para la materia de Bases de Datos No Estructuradas.

---

## 7. Transacciones y consistencia

- **Emitir una factura** y **cerrar una orden de producción** cambian varias colecciones a la vez. Se hacen con
  `comun/transaccion.ts`: si `MONGO_TRANSACCIONES=true` (replica set) es una transacción real "todo o nada".
- Sin replica set (desarrollo), la seguridad viene de que cada descuento de stock es una **actualización
  atómica condicionada**: `updateOne({ _id, cantidad: { $gte: 5 } }, { $inc: { cantidad: -5 } })`. Si dos
  cajas venden la última barra al mismo tiempo, solo una lo logra (RN-12).
- Los decimales se normalizan con `$round` después de cada movimiento para evitar restos como `47,99999999999996`.

---

## 8. Consultas para probar

En Compass (pestaña *Documents* → filtro) o en `mongosh pepadeoro`:

```js
// Lotes de grano esperando fermentar
db.lotes_grano.find({ estado: 'RECIBIDO' }).sort({ fechaRecepcion: 1 })

// Facturas con saldo pendiente de un cliente
db.facturas.find({ 'cliente.identificacion': '0790547810001', saldo: { $gt: 0 } })

// Stock disponible de un producto por lote (FEFO: el primero es el que sale)
db.lotes_producto.find({ cantidad: { $gt: 0 }, liberado: true }).sort({ vencimiento: 1 })

// Kárdex de los últimos 10 movimientos
db.movimientos_inventario.find().sort({ fecha: -1 }).limit(10)

// Ventas por mes (aggregation pipeline)
db.facturas.aggregate([
  { $match: { tipoComprobante: '01', estado: { $ne: 'ANULADA' } } },
  { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$fechaEmision' } }, total: { $sum: '$total' }, facturas: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])

// Órdenes de producción por estado
db.ordenes_produccion.aggregate([{ $group: { _id: '$estado', n: { $sum: 1 } } }])
```
