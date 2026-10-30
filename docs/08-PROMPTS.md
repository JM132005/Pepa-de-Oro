# 08 · Prompts usados con GitHub Copilot (prompt engineering)

> Cómo usamos Copilot en Pepa de Oro: los prompts que funcionaron, los que no, qué corregimos y las reglas que
> sacamos. Copilot lee además `.github/copilot-instructions.md`, así responde en español y respeta la
> estructura del proyecto. **Regla del equipo: todo lo que genera Copilot se lee, se prueba y se revisa en un PR.**
>
> ⚠️ **Antes de entregar:** ejecuten cada prompt en su Copilot y cambien el texto de "Resultado" y "Corrección" por lo que
> Copilot les respondió de verdad (cada respuesta puede variar). Las capturas de esas respuestas son la evidencia.

## 1. Reglas para escribir un buen prompt

| Regla | Mal | Bien |
|---|---|---|
| Dar contexto (archivo, tecnología, regla) | "haz una validación" | "En `facturacion.reglas.ts` (NestJS, TypeScript) escribe una función pura para RN-19" |
| Decir el formato de salida | "dame pruebas" | "Escribe 3 pruebas Vitest con `describe`/`it`, una por caso" |
| Dar un ejemplo | "valida la cédula" | "Como `validarRuc()` de `identificacion.reglas.ts`, que devuelve `null` o `'RN-02: …'`" |
| Pedir pasos pequeños | "haz todo el módulo de ventas" | "Primero solo la regla, luego el servicio, luego el controlador" |
| Pedir que explique | (aceptar sin leer) | "Explica línea por línea qué hace y qué casos no cubre" |
| Poner límites | — | "Sin librerías nuevas", "sin tocar la base de datos", "en español" |

## 2. Prompts del proyecto

Cada prompt: dónde se usó, qué respondió Copilot, qué corregimos.

### P1 · Constitución del proyecto (Spec Kit)
**Dónde:** Copilot Chat, modo Agent → `/speckit.constitution`
```
/speckit.constitution Proyecto Pepa de Oro: sistema web para una empresa de cacao y café de El Oro.
Principios: reglas de negocio RN-xx con pruebas antes del código (TDD), un solo sistema con web pública
y sistema interno, trazabilidad del lote, el stock nunca negativo, permisos por rol, todo en español
y comentado, datos de prueba realistas. Stack: Angular 21, NestJS, MongoDB.
```
**Resultado:** borrador de `.specify/memory/constitution.md` con 7 principios.
**Corrección:** agregamos la tabla de restricciones técnicas y el flujo de ramas y PR.

### P2 · Especificación de una funcionalidad (Spec Kit)
**Dónde:** `/speckit.specify`
```
/speckit.specify La cajera de la tienda vende productos, cobra en efectivo o tarjeta y emite la factura
en PDF con formato del SRI. Una venta a consumidor final no puede pasar de 50 USD. El descuento manual
tiene un tope por rol. El número de factura es único y correlativo.
```
**Resultado:** `spec.md` con historias, escenarios Dado/Cuando/Entonces y requisitos FR-xxx.
**Corrección:** asignamos los identificadores RN-17, RN-19 y RN-20 y quitamos un requisito de pago en línea
(la web no vende).

### P3 · Regla de negocio como función pura
**Dónde:** Copilot Chat, archivo `backend/src/modulos/facturacion/facturacion.reglas.ts` abierto
```
Escribe una función pura verificarConsumidorFinal(tipoIdentificacion, total, limite) para RN-19:
si el cliente es CONSUMIDOR_FINAL y el total supera el límite, devuelve el texto
'RN-19: …' explicando el problema; si no, devuelve null. Sin acceso a base de datos. Comenta cada línea.
```
**Resultado:** función correcta en la primera respuesta.
**Corrección:** el mensaje decía "excede"; lo cambiamos para que diga qué hacer ("Registra los datos del cliente").

### P4 · Pruebas de la regla (TDD)
**Dónde:** Copilot Chat con `facturacion.reglas.ts` abierto
```
Escribe pruebas Vitest para verificarConsumidorFinal: total menor a 50, exactamente 50, mayor a 50,
y cliente con cédula por encima de 50. Usa describe/it en español.
```
**Resultado:** 4 pruebas.
**Corrección:** Copilot esperaba error con exactamente 50; la regla dice "no puede **pasar** de 50", así que 50
es válido. Corregimos la expectativa. Esto muestra por qué hay que revisar lo que genera.

### P5 · Explicar código existente
**Dónde:** Copilot Chat, seleccionando `inventario.service.ts → salida()`
```
/explain Explica paso a paso qué hace este método, cómo aplica FEFO (RN-13) y cómo evita que el stock
quede negativo (RN-12) si dos cajas venden al mismo tiempo.
```
**Resultado:** explicación del orden por vencimiento y de la actualización condicionada `$gte`.
**Uso:** la usamos para preparar la presentación y responder preguntas del docente.

### P6 · Encontrar un error
**Dónde:** Copilot Chat con el mensaje de error pegado
```
Al reservar stock sale "RN-12: el stock cambió mientras se reservaba" aunque hay 48 unidades y pido 48.
La cantidad guardada en MongoDB es 47.99999999999996. ¿Por qué pasa y cómo lo arreglo sin cambiar la regla?
```
**Resultado:** explicó el error de punto flotante y sugirió redondear.
**Corrección:** elegimos una tolerancia (`TOLERANCIA = 0.0005`) y redondear con `$round` en MongoDB después de
cada movimiento (`normalizar()`), en vez de redondear solo en JavaScript.

### P7 · Pipeline de GitHub Actions
**Dónde:** Copilot Chat en `.github/workflows/ci.yml`
```
Crea un workflow de GitHub Actions para un monorepo con backend/ (NestJS, npm test, npm run lint)
y frontend/ (Angular, ng build). Node 22, caché de npm, permisos mínimos y cancelar ejecuciones viejas.
Agrega un job que levante MongoDB 8 como servicio y ejecute "npm run seed -- --meses=1".
```
**Resultado:** workflow de 3 jobs.
**Corrección:** agregamos `needs: backend` al job de la semilla y la verificación final de que hay facturas.

### P8 · Revisión de un Pull Request
**Dónde:** en el PR → Reviewers → Copilot (o Copilot Chat con el diff)
```
Revisa este cambio buscando: reglas de negocio sin prueba, datos sensibles (.env, contraseñas),
código sin comentarios y consultas a MongoDB sin índice.
```
**Resultado:** sugirió agregar una prueba y un comentario.
**Uso:** complementa la revisión del compañero; no la reemplaza.

## 3. Lo que aprendimos

1. **Contexto antes que nada:** con el archivo abierto y el nombre de la regla, las respuestas mejoran mucho.
2. **Copilot se equivoca en los bordes** (P4: el caso de exactamente 50). Las pruebas lo descubren.
3. **La spec guía a la IA:** con una spec clara, Copilot genera código que cumple lo pedido; sin spec, inventa.
4. **Pedir en pasos pequeños** da código más fácil de revisar en un PR.
5. **Nunca pegar secretos** (`.env`, contraseñas) en un prompt.

## 4. Evidencias

Capturas en el informe: P3 (regla generada), P4 (pruebas y la corrección del caso 50), P5 (explicación),
P8 (revisión de Copilot en un PR).
