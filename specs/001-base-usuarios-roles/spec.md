# Especificación: Base: usuarios, roles, configuración y auditoría

**Rama**: `001-base-usuarios-roles` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 1 · Base

> Inicio de sesión con JWT, nueve roles con permisos mínimos, configuración de la empresa (RUC, IVA, establecimientos, topes) y bitácora de auditoría inalterable.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Iniciar sesión según mi rol (Prioridad: P1)

**Por qué esta prioridad**: Cada empleado entra solo a lo que le corresponde.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un usuario activo con rol VENTAS, **cuando** ingresa correo y contraseña correctos, **entonces** recibe un token y ve el menú de Caja, Facturas, Cotizaciones y Clientes.
2. **Dado** un usuario con la contraseña equivocada, **cuando** intenta entrar, **entonces** ve "Correo o contraseña incorrectos" y no recibe token.
3. **Dado** un usuario BODEGA, **cuando** abre /admin/usuarios, **entonces** el guard lo regresa al inicio y la API responde 403.

### Historia 2 — Administrar usuarios (Prioridad: P1)

**Por qué esta prioridad**: El gerente da de alta, desactiva y cambia roles.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** el gerente, **cuando** crea un usuario con dos roles, **entonces** el usuario puede entrar con ambos permisos.
2. **Dado** el gerente, **cuando** desactiva un usuario, **entonces** su token deja de servir en la siguiente petición.

### Historia 3 — Ver quién hizo qué (Prioridad: P2)

**Por qué esta prioridad**: Las acciones sensibles quedan registradas para control interno.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** una factura anulada, **cuando** el gerente abre Auditoría, **entonces** ve usuario, fecha, valor anterior y nuevo, sin opción de editar ni borrar.

## Requisitos

### Funcionales

- **FR-001**: El sistema DEBE firmar tokens JWT con expiración y validar el rol en cada ruta protegida.
- **FR-002**: El sistema DEBE guardar contraseñas solo como hash bcrypt.
- **FR-003**: El sistema DEBE validar cédula y RUC con el dígito verificador (RN-02).
- **FR-004**: El sistema DEBE registrar en `auditoria` las acciones sensibles con antes/después.
- **FR-005**: La configuración (IVA, topes de descuento, consumidor final, establecimientos) DEBE ser editable solo por el gerente.

### Reglas de negocio que cubre

RN-02 (ver la tabla completa en `docs/01-REQUISITOS.md`).

### Entidades clave

`usuarios`, `configuracion`, `auditoria`, `contadores`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
