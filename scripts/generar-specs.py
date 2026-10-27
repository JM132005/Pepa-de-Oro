#!/usr/bin/env python3
# generar-specs.py → escribe specs/NNN-*/{spec,plan,tasks}.md (formato Spec Kit) y scripts/historias.json
# (lo que usa crear-issues.mjs) desde UNA sola lista de datos, para que specs e Issues digan lo mismo.
# Uso: python3 scripts/generar-specs.py .     (el punto = raíz del repositorio)
import json, os, sys

RAIZ = sys.argv[1]
FECHA = '2026-08-03'

F = []  # lista de funcionalidades

def feat(**k):
    F.append(k)

feat(num='001', slug='base-usuarios-roles', nombre='Base: usuarios, roles, configuración y auditoría', hito='Entrega 1 · Base',
     resumen='Inicio de sesión con JWT, nueve roles con permisos mínimos, configuración de la empresa (RUC, IVA, establecimientos, topes) y bitácora de auditoría inalterable.',
     historias=[
        ('Iniciar sesión según mi rol', 'P1', 'Cada empleado entra solo a lo que le corresponde.',
         [('un usuario activo con rol VENTAS', 'ingresa correo y contraseña correctos', 'recibe un token y ve el menú de Caja, Facturas, Cotizaciones y Clientes'),
          ('un usuario con la contraseña equivocada', 'intenta entrar', 've "Correo o contraseña incorrectos" y no recibe token'),
          ('un usuario BODEGA', 'abre /admin/usuarios', 'el guard lo regresa al inicio y la API responde 403')]),
        ('Administrar usuarios', 'P1', 'El gerente da de alta, desactiva y cambia roles.',
         [('el gerente', 'crea un usuario con dos roles', 'el usuario puede entrar con ambos permisos'),
          ('el gerente', 'desactiva un usuario', 'su token deja de servir en la siguiente petición')]),
        ('Ver quién hizo qué', 'P2', 'Las acciones sensibles quedan registradas para control interno.',
         [('una factura anulada', 'el gerente abre Auditoría', 've usuario, fecha, valor anterior y nuevo, sin opción de editar ni borrar')]),
     ],
     rn=['RN-02'], requisitos=[
        'El sistema DEBE firmar tokens JWT con expiración y validar el rol en cada ruta protegida.',
        'El sistema DEBE guardar contraseñas solo como hash bcrypt.',
        'El sistema DEBE validar cédula y RUC con el dígito verificador (RN-02).',
        'El sistema DEBE registrar en `auditoria` las acciones sensibles con antes/después.',
        'La configuración (IVA, topes de descuento, consumidor final, establecimientos) DEBE ser editable solo por el gerente.'],
     entidades=['usuarios', 'configuracion', 'auditoria', 'contadores'],
     back=['comun/guards/', 'comun/identificacion.reglas.ts', 'modulos/auth/', 'modulos/usuarios/', 'modulos/configuracion/', 'modulos/auditoria/'],
     front=['compartido/Controlador/auth.guard.ts', 'compartido/Controlador/token.interceptor.ts', 'admin/Paginas/login/', 'admin/Paginas/usuarios/', 'admin/Paginas/configuracion/', 'admin/Paginas/auditoria/', 'admin/layout-admin/'],
     tareas=['Escribir pruebas de `validarCedula` y `validarRuc` (RN-02)', 'Implementar identificacion.reglas.ts', 'Módulo auth: login, perfil, estrategia JWT', 'Guards JwtGuard y RolesGuard con pruebas', 'CRUD de usuarios (solo gerente)', 'Módulo configuración con valores iniciales', 'Interceptor de auditoría para acciones sensibles', 'Frontend: login, guards conectado/invitado/rol e interceptor', 'Frontend: layout admin con menú por rol', 'Páginas Usuarios, Configuración y Auditoría'])

feat(num='002', slug='catalogo-inventario', nombre='Catálogo, bodegas e inventario con FEFO', hito='Entrega 2 · Catálogo e inventario',
     resumen='Productos con variantes, precios por menor y por mayor, bodegas, lotes con vencimiento, movimientos y ajustes aprobados.',
     historias=[
        ('Mantener el catálogo', 'P1', 'Ventas y la web muestran precios correctos.',
         [('el gerente', 'publica un producto con precio por mayor desde 12 unidades', 'la web lo muestra con su stock y la caja aplica el precio desde la unidad 12 (RN-16)')]),
        ('Despachar primero lo que vence primero', 'P1', 'Evitar pérdidas por vencimiento.',
         [('dos lotes del mismo producto que vencen en marzo y en junio', 'se vende una unidad', 'sale del lote de marzo (RN-13)'),
          ('un lote vencido', 'se intenta vender', 'el sistema lo rechaza (RN-14) y lo propone para baja')]),
        ('Ajustar inventario con control', 'P2', 'Las diferencias de conteo no se corrigen a escondidas.',
         [('bodega registra un faltante', 'no indica motivo', 'el ajuste se rechaza (RN-15)'),
          ('un ajuste con motivo', 'el gerente lo aprueba', 'se crea el movimiento y el stock nunca queda negativo (RN-12)')]),
     ],
     rn=['RN-12', 'RN-13', 'RN-14', 'RN-15', 'RN-16'], requisitos=[
        'Cada entrada, salida, transferencia o ajuste DEBE crear un `movimiento_inventario`.',
        'Las salidas DEBEN reservar y descontar lotes por fecha de vencimiento ascendente (FEFO).',
        'El sistema DEBE avisar de stock bajo y de lotes por vencer (30 días).',
        'Los cálculos de cantidades DEBEN tolerar errores de redondeo de punto flotante (tolerancia 0,0005).'],
     entidades=['productos', 'recetas', 'bodegas', 'lotes_producto', 'movimientos_inventario', 'precios_dia'],
     back=['modulos/productos/', 'modulos/inventario/'], front=['admin/Paginas/catalogo/', 'admin/Paginas/inventario/'],
     tareas=['Pruebas de precio por mayor (RN-16)', 'Pruebas de stock no negativo, FEFO, vencido y ajuste (RN-12 a RN-15)', 'Esquemas de producto, bodega, lote y movimiento', 'InventarioService: entrada, salida FEFO, reserva, transferencia, ajuste', 'Normalizar cantidades con $round tras cada operación', 'Alertas de stock bajo y por vencer', 'Página Catálogo con variantes y publicación web', 'Página Inventario: existencias, lotes, kárdex, ajustes y bajas'])

feat(num='003', slug='ventas-facturacion', nombre='Ventas, caja, cotizaciones, pedidos y facturación', hito='Entrega 3 · Ventas y facturación',
     resumen='Caja de la tienda con turnos, ventas por mayor con cotización → pedido → factura, crédito con cupo, cobros, notas de crédito y PDF enviado por correo.',
     historias=[
        ('Vender en la caja', 'P1', 'La tienda atiende rápido y cuadra el turno.',
         [('un turno abierto', 'la cajera vende 3 barras a consumidor final por 18 USD', 'se emite la factura con secuencial correlativo (RN-20) y baja el stock'),
          ('una venta de 65 USD', 'se intenta como consumidor final', 'el sistema pide cédula o RUC (RN-19)'),
          ('un descuento manual del 20 % hecho por VENTAS', 'el tope del rol es 10 %', 'se rechaza (RN-17)')]),
        ('Cotizar y vender por mayor', 'P1', 'Clientes mayoristas reciben precio y condiciones formales.',
         [('una cotización vencida', 'se intenta convertir en pedido', 'el sistema lo impide (RN-22)'),
          ('un cliente con deuda vencida', 'pide a crédito', 'se rechaza (RN-18)')]),
        ('Corregir una factura', 'P2', 'Cumplir la norma: una factura emitida no se borra.',
         [('una factura emitida con error', 'se anula', 'se genera una nota de crédito y la factura queda ANULADA, nunca eliminada (RN-21)')]),
     ],
     rn=['RN-17', 'RN-18', 'RN-19', 'RN-20', 'RN-21', 'RN-22'], requisitos=[
        'El número de comprobante DEBE ser único por tipo (índice compuesto tipo + número).',
        'La factura DEBE generarse en PDF con formato SRI y enviarse al correo del cliente.',
        'El cierre de turno DEBE comparar el efectivo contado con el esperado y registrar la diferencia.',
        'Los abonos DEBEN reducir el saldo y liberar cupo de crédito.'],
     entidades=['clientes', 'cotizaciones', 'pedidos', 'facturas', 'turnos_caja', 'contadores'],
     back=['modulos/ventas/', 'modulos/facturacion/'], front=['admin/Paginas/caja/', 'admin/Paginas/facturas/', 'admin/Paginas/cotizaciones/', 'admin/Paginas/pedidos/', 'admin/Paginas/clientes/', 'admin/Componentes/editor-lineas/', 'admin/Utils/calculos-venta.ts'],
     tareas=['Pruebas de descuento, crédito y cotización vencida (RN-17, RN-18, RN-22)', 'Pruebas de consumidor final, secuencial y anulación (RN-19 a RN-21)', 'Clientes con validación de identificación', 'Turnos de caja y venta de mostrador', 'Cotizaciones → pedidos → facturas', 'Notas de crédito y abonos', 'PDF de factura, cotización y nota de crédito', 'Envío por correo (modo prueba .eml y Gmail)', 'Páginas Caja, Facturas, Cotizaciones, Pedidos y Clientes'])

feat(num='004', slug='web-publica', nombre='Sitio web público, solicitudes y rastreo', hito='Entrega 4 · Sitio web',
     resumen='Portada, nosotros, catálogo con precio y stock en vivo, equipos en alquiler, servicios, contacto con solicitudes y rastreo del lote por código QR.',
     historias=[
        ('Ver productos con stock real', 'P1', 'El cliente sabe qué hay antes de llamar.',
         [('un producto publicado con 0 unidades', 'un visitante abre el catálogo', 've "Agotado" y puede pedir aviso')]),
        ('Enviar una solicitud', 'P1', 'Sin compra en línea: el equipo de ventas responde.',
         [('un visitante', 'llena el formulario de cotización', 'se crea una solicitud que ve Ventas en el sistema')]),
        ('Rastrear el origen de mi chocolate', 'P2', 'Diferenciar la marca por trazabilidad.',
         [('el código impreso en la barra', 'se consulta en /rastreo', 'se ve la hacienda o cantón, fermentación, secado, calidad y fecha de elaboración sin datos privados')]),
     ],
     rn=[], requisitos=['Las rutas `/api/publico/...` NO DEBEN exigir token y solo leen o crean solicitudes.', 'El contenido (textos, banners, testimonios) DEBE ser editable por el gerente sin programar.', 'La web DEBE verse bien desde 360 px de ancho sin desplazamiento horizontal.'],
     entidades=['contenido_web', 'solicitudes_web', 'productos', 'activos'],
     back=['modulos/web/', 'modulos/rastreo/'], front=['publico/', 'admin/Paginas/contenido-web/', 'admin/Paginas/solicitudes/'],
     tareas=['Prueba de la vista pública del rastreo (sin datos privados)', 'Endpoints públicos de catálogo, equipos y contenido', 'Solicitudes web con aviso por correo', 'Layout público con cabecera y pie', 'Páginas Inicio, Nosotros, Productos, Detalle, Equipos, Servicios, Contacto y Rastreo', 'Página Contenido web y bandeja de Solicitudes'])

feat(num='005', slug='campo-acopio-poscosecha', nombre='Campo, acopio y poscosecha', hito='Entrega 5 · Campo y acopio',
     resumen='Haciendas y parcelas con labores, sanidad y cosechas; compra a productores con liquidación; fermentación, volteos y secado con control de capacidad.',
     historias=[
        ('Registrar labores y cosechas', 'P1', 'Saber cuánto produce cada parcela y a qué costo.',
         [('una parcela fumigada ayer con un producto de 14 días de carencia', 'se intenta cosechar', 'se rechaza (RN-01)')]),
        ('Comprar cacao a productores', 'P1', 'Pagar justo y con respaldo.',
         [('un productor inactivo', 'entrega un lote', 'se rechaza (RN-03)'),
          ('cacao seco al 9 % de humedad', 'se liquida', 'se descuenta solo el exceso sobre 7 % (RN-04)')]),
        ('Fermentar y secar sin pasarse de capacidad', 'P1', 'No dañar el grano por sobrecarga.',
         [('un fermentador de 1 000 kg con 600 kg', 'se asignan 500 kg más', 'se rechaza (RN-05)')]),
     ],
     rn=['RN-01', 'RN-02', 'RN-03', 'RN-04', 'RN-05'], requisitos=['Cada lote de grano DEBE tener código único y un historial de eventos.', 'El clima diario DEBE guardarse en una colección time series.', 'La liquidación DEBE generar un PDF para el productor.'],
     entidades=['haciendas', 'parcelas', 'labores', 'cosechas', 'monitoreos_sanidad', 'trabajadores', 'clima', 'productores', 'liquidaciones', 'lotes_grano'],
     back=['modulos/campo/', 'modulos/acopio/', 'modulos/poscosecha/'], front=['admin/Paginas/campo/', 'admin/Paginas/parcela-detalle/', 'admin/Paginas/acopio/', 'admin/Paginas/poscosecha/', 'admin/Paginas/lote-grano/'],
     tareas=['Pruebas de carencia (RN-01)', 'Pruebas de productor inactivo y descuento por humedad (RN-03, RN-04)', 'Pruebas de capacidad (RN-05)', 'Campo: haciendas, parcelas, labores, sanidad, cosechas, clima', 'Acopio: productores, precios del día, recepción y liquidación PDF', 'Poscosecha: fermentación, volteos, secado, humedad', 'Páginas Campo, Parcela, Acopio, Poscosecha y Lote de grano'])

feat(num='006', slug='calidad', nombre='Control de calidad', hito='Entrega 5 · Campo y acopio',
     resumen='Prueba de corte, humedad, defectos y cata; grado calculado por el sistema; no conformidades y liberación de lotes de producto.',
     historias=[
        ('Calificar un lote de grano', 'P1', 'El grado no depende de quién lo mira.',
         [('un análisis con 4 % de violeta y 1 % de moho', 'Calidad lo registra', 'el sistema asigna el grado según la tabla de límites (RN-06)'),
          ('un usuario de ACOPIO', 'intenta aprobar un lote', 'la API responde 403 (RN-07)')]),
        ('Liberar producto terminado', 'P1', 'Nada sale a la venta sin control.',
         [('un lote de producto recién producido (todavía no liberado)', 'se intenta vender', 'se rechaza hasta que Calidad lo libere (RN-11)')]),
     ],
     rn=['RN-06', 'RN-07', 'RN-11'], requisitos=['El certificado de calidad DEBE descargarse en PDF.', 'Una no conformidad DEBE tener responsable, acción y fecha de cierre.'],
     entidades=['lotes_grano', 'lotes_producto'], back=['modulos/calidad/'], front=['admin/Paginas/calidad/'],
     tareas=['Pruebas de grado por tabla y permisos (RN-06, RN-07)', 'Prueba de liberación (RN-11)', 'Análisis, cata y no conformidades', 'Certificado PDF', 'Página Calidad'])

feat(num='007', slug='produccion', nombre='Producción: recetas, órdenes y costos', hito='Entrega 6 · Producción',
     resumen='Recetas (lista de materiales), cadena grano → nibs → pasta → chocolate, órdenes con consumo FEFO, costo real y lotes de producto en cuarentena.',
     historias=[
        ('Planificar y ejecutar una orden', 'P1', 'Producir lo que se vende sin quedarse sin insumos.',
         [('grano en estado RECHAZADO', 'se elige como insumo', 'se rechaza (RN-08)'),
          ('una orden que necesita 40 kg de pasta y hay 25', 'se intenta iniciar', 'se rechaza indicando el faltante (RN-09)'),
          ('una orden en proceso', 'se cierra con la cantidad real', 'se descuentan insumos, se crea el lote de producto y se calcula el costo unitario (RN-10)')]),
     ],
     rn=['RN-08', 'RN-09', 'RN-10'], requisitos=['El cierre DEBE ser "todo o nada" (transacción o compensación).', 'El costo DEBE incluir materiales, mano de obra y horas máquina.'],
     entidades=['recetas', 'ordenes_produccion', 'lotes_producto', 'movimientos_inventario'], back=['modulos/produccion/'], front=['admin/Paginas/produccion/'],
     tareas=['Pruebas de grano aprobado, insumos y cierre (RN-08 a RN-10)', 'Recetas con rendimiento', 'Órdenes: planificar, iniciar, cerrar, anular', 'Cálculo de costo real', 'Página Producción'])

feat(num='008', slug='equipos-logistica-mantenimiento', nombre='Equipos, alquiler, logística y mantenimiento', hito='Entrega 7 · Equipos y logística',
     resumen='Ficha de activos, venta y alquiler de maquinaria, flota con viajes y fletes, documentos con vencimiento y mantenimiento preventivo/correctivo.',
     historias=[
        ('Alquilar maquinaria', 'P1', 'Generar ingresos con equipos ociosos.',
         [('un tractor alquilado del 10 al 15', 'se pide del 14 al 18', 'se rechaza por cruce (RN-23)'),
          ('un activo EN_MANTENIMIENTO o con SOAT vencido', 'se intenta alquilar o asignar', 'se rechaza (RN-24)')]),
        ('Programar viajes', 'P1', 'Entregar sin sobrecargar.',
         [('un camión de 3 500 kg', 'se cargan 3 800 kg', 'se rechaza (RN-25)')]),
        ('Mantenimiento preventivo', 'P2', 'Evitar paradas no planificadas.',
         [('un plan cada 90 días o 250 horas', 'se cumplen 250 horas antes de 90 días', 'se genera la orden preventiva (RN-26)')]),
     ],
     rn=['RN-23', 'RN-24', 'RN-25', 'RN-26'], requisitos=['Los documentos por vencer (30 días) DEBEN generar alerta.', 'El alquiler DEBE emitir contrato y factura con garantía.'],
     entidades=['activos', 'alquileres', 'viajes', 'ordenes_mantenimiento'], back=['modulos/equipos/', 'modulos/logistica/', 'modulos/mantenimiento/'], front=['admin/Paginas/equipos/', 'admin/Paginas/logistica/', 'admin/Paginas/mantenimiento/'],
     tareas=['Pruebas de cruce y disponibilidad (RN-23, RN-24)', 'Pruebas de capacidad del camión (RN-25)', 'Pruebas de preventivo por tiempo o uso (RN-26)', 'Activos, venta y alquiler con contrato PDF', 'Viajes, fletes y hoja de ruta', 'Órdenes de mantenimiento y cron diario', 'Páginas Equipos, Logística y Mantenimiento'])

feat(num='009', slug='paneles-informes-proyecciones', nombre='Paneles, informes y proyecciones', hito='Entrega 8 · Analítica',
     resumen='KPIs por área calculados en el backend, informes descargables en PDF y Excel, y pronósticos de cosecha, ventas y flujo de caja.',
     historias=[
        ('Ver el estado del negocio', 'P1', 'Decidir con datos.',
         [('el gerente', 'abre el panel general y elige "últimos 90 días"', 've ventas, margen, stock valorizado y alertas con gráficos')]),
        ('Descargar informes', 'P2', 'Llevar la información a reuniones y al contador.',
         [('un informe de ventas', 'se descarga en Excel', 'contiene las mismas cifras que el panel')]),
        ('Proyectar la temporada', 'P2', 'Planificar compras y personal.',
         [('12 meses de historia', 'se abre Proyecciones', 'se ve la cosecha esperada por mes con estacionalidad')]),
     ],
     rn=[], requisitos=['Todos los KPIs DEBEN calcularse en el backend (consultas filtradas en MongoDB), no en el navegador.', 'Cada panel DEBE respetar el rol (solo ve su área).'],
     entidades=['(todas, solo lectura)'], back=['modulos/analitica/'], front=['admin/Paginas/paneles/', 'admin/Paginas/informes/', 'admin/Paginas/proyecciones/', 'admin/Paginas/inicio-admin/', 'compartido/Componentes/grafico/'],
     tareas=['Pruebas de estacionalidad y regresión de proyecciones', 'KPIs por área en kpis.service.ts', 'Informes PDF y Excel', 'Componente de gráfico ECharts', 'Páginas Paneles, Informes, Proyecciones e Inicio'])

feat(num='010', slug='semilla-ci', nombre='Datos de prueba e integración continua', hito='Entrega 8 · Analítica',
     resumen='Semilla que simula 12 meses con los servicios reales, ilustraciones SVG, pipeline de GitHub Actions y script de Issues.',
     historias=[
        ('Tener datos realistas para la demo', 'P1', 'Mostrar paneles con historia.',
         [('una base vacía', 'se ejecuta `npm run seed`', 'hay 12 meses de ventas, órdenes cerradas, cosechas y viajes, y las reglas rechazan lo que deben')]),
        ('Saber si algo se rompió', 'P1', 'Revisar cada PR automáticamente.',
         [('un Pull Request', 'se abre hacia develop', 'GitHub Actions corre lint, pruebas, builds y la semilla de 1 mes')]),
     ],
     rn=[], requisitos=['La semilla DEBE usar los servicios de la API (no insertar a mano saltándose las reglas).', 'El CI NO DEBE requerir secretos para pasar.'],
     entidades=['(todas)'], back=['semilla/'], front=['../public/img/'],
     tareas=['Reloj simulado y generador aleatorio con semilla fija', 'Datos base (empresa, personal, catálogo, haciendas, clientes)', 'Simulación diaria por áreas con planificador de producción', 'Ilustraciones SVG', 'Workflow ci.yml', 'Plantillas de Issue y PR', 'Script crear-issues.mjs'])

# ───────────────────────── Escritura ─────────────────────────
def esc(path, txt):
    p = os.path.join(RAIZ, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(txt)

historias_json = []
for f in F:
    carpeta = f"specs/{f['num']}-{f['slug']}"
    rama = f"{f['num']}-{f['slug']}"
    # spec.md
    s = [f"# Especificación: {f['nombre']}", '',
         f"**Rama**: `{rama}` · **Creada**: {FECHA} · **Estado**: Implementada · **Hito**: {f['hito']}", '',
         f"> {f['resumen']}", '', '## Historias de usuario y pruebas de aceptación', '']
    for i, (t, prio, why, esc_) in enumerate(f['historias'], 1):
        s += [f"### Historia {i} — {t} (Prioridad: {prio})", '', f"**Por qué esta prioridad**: {why}", '',
              '**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.', '',
              '**Escenarios de aceptación**:', '']
        for j, (g, w, th) in enumerate(esc_, 1):
            s.append(f"{j}. **Dado** {g}, **cuando** {w}, **entonces** {th}.")
        s.append('')
        historias_json.append({'titulo': f"[{f['num']}] {t}", 'hito': f['hito'], 'prioridad': prio, 'spec': carpeta,
                               'etiquetas': ['historia', prio.lower()] + [r.lower() for r in f['rn'] if any(r in x for e in esc_ for x in e)],
                               'cuerpo': why, 'escenarios': [f"Dado {g}, cuando {w}, entonces {th}." for g, w, th in esc_]})
    s += ['## Requisitos', '', '### Funcionales', '']
    s += [f"- **FR-{k:03d}**: {r}" for k, r in enumerate(f['requisitos'], 1)]
    if f['rn']:
        s += ['', '### Reglas de negocio que cubre', '', ', '.join(f['rn']) + ' (ver la tabla completa en `docs/01-REQUISITOS.md`).']
    s += ['', '### Entidades clave', '', ', '.join(f'`{e}`' for e in f['entidades']), '',
          '## Criterios de éxito', '', '- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.',
          '- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).',
          '- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.', '']
    esc(f'{carpeta}/spec.md', '\n'.join(s))
    # plan.md
    p = [f"# Plan de implementación: {f['nombre']}", '', f"**Rama**: `{rama}` · **Especificación**: [spec.md](./spec.md)", '',
         '## Contexto técnico', '', '- **Lenguaje**: TypeScript 5 (backend y frontend)', '- **Dependencias**: NestJS 12 · Mongoose 9 · Angular 21 · ECharts 6 · PDFKit · ExcelJS · Nodemailer',
         '- **Almacenamiento**: MongoDB 8', '- **Pruebas**: Vitest (reglas puras) + semilla en CI', '- **Plataforma**: web (escritorio y móvil desde 360 px)', '',
         '## Revisión contra la constitución', '', '| Principio | Cumple |', '|---|---|',
         f"| I. Reglas primero con TDD | {'Sí — ' + ', '.join(f['rn']) + ' con prueba previa' if f['rn'] else 'No aplica regla RN; se prueba con la semilla'} |",
         '| II. Un sistema, dos caras | Sí |', '| III. Trazabilidad | Sí — historial y auditoría |', '| IV. Inventario | Sí — movimientos por cada cambio |',
         '| V. Permisos por rol | Sí — `@Roles` en cada ruta |', '| VI. Código que se entiende | Sí — comentarios en español |', '',
         '## Estructura del código', '', '```text', 'backend/src/'] + [f'├── {b}' for b in f['back']] + ['frontend/src/app/'] + [f'├── {x}' for x in f['front']] + ['```', '',
         '## Decisiones', '', '- Las reglas son funciones puras en `*.reglas.ts`; los servicios las llaman y traducen el error a `BadRequestException`.',
         '- Los formularios del sistema se definen como listas de `CampoFormulario` (`admin/Formularios/campos.ts`) y se pintan con `FormularioDinamico`.', '']
    esc(f'{carpeta}/plan.md', '\n'.join(p))
    # tasks.md
    t = [f"# Tareas: {f['nombre']}", '', f"**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md)", '',
         'Formato: `[ID] [P?] Descripción` — **[P]** = se puede hacer en paralelo (archivos distintos). Las pruebas van primero.', '']
    fases = [('Fase 1 — Pruebas (rojo)', [x for x in f['tareas'] if x.lower().startswith('prueba')]),
             ('Fase 2 — Backend (verde)', [x for x in f['tareas'] if not x.lower().startswith('prueba') and not x.startswith('Página') and not x.startswith('Frontend') and 'Página' not in x[:8]]),
             ('Fase 3 — Frontend', [x for x in f['tareas'] if x.startswith('Página') or x.startswith('Frontend') or x.startswith('Componente')])]
    n = 1
    for titulo, lista in fases:
        if not lista: continue
        t += [f'## {titulo}', '']
        for x in lista:
            par = ' [P]' if titulo.startswith('Fase 1') or titulo.startswith('Fase 3') else ''
            t.append(f'- [x] T{n:03d}{par} {x}'); n += 1
        t.append('')
    t += ['## Fase final — Verificación', '', f'- [x] T{n:03d} `npm test` y `ng build` sin errores', f'- [x] T{n+1:03d} Revisión manual con la semilla de 12 meses', '']
    esc(f'{carpeta}/tasks.md', '\n'.join(t))

esc('scripts/historias.json', json.dumps({'hitos': sorted({f['hito'] for f in F}), 'historias': historias_json}, ensure_ascii=False, indent=2) + '\n')
print(len(F), 'funcionalidades,', len(historias_json), 'historias')
