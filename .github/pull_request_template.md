<!-- pull_request_template.md → GitHub llena con esto la descripción de cada Pull Request nuevo. -->

## ¿Qué cambia?

<!-- Una o dos frases. Ejemplo: "Agrega la nota de crédito al anular una factura". -->

Cierra #<!-- número del Issue: al fusionar, GitHub lo cierra solo -->

**Especificación**: `specs/NNN-.../spec.md`

## Reglas de negocio

- [ ] No toca reglas
- [ ] Toca RN-__ y su prueba en `*.reglas.spec.ts` se escribió **antes** del código

## Cómo probarlo

1. `npm run seed -- --meses=1` en `backend/`
2. Entrar como `______@pepadeoro.ec` (contraseña `PepaDeOro2026*`)
3. Ir a … y comprobar que …

## Lista de verificación

- [ ] `npm run lint` y `npm test` pasan en `backend/`
- [ ] `npx ng build` pasa en `frontend/`
- [ ] Los archivos nuevos empiezan con un comentario que explica qué son
- [ ] Sin contraseñas ni `.env` en el commit
- [ ] Capturas de pantalla si cambia la interfaz
