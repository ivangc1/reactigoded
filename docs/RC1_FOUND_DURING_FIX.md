# RC1 — hallazgos descubiertos durante los fixes

Lugar para anotar cosas que **no estaban en el plan** y que **no se
arreglan en esta sesión** (regla 0.1 del plan: "déjalo aquí, no lo
arregles"). Se procesan después de RC1.

---

## TODO #1 — Añadir grep `console.*` explícito en CI [B-07 follow-up]

**Origen**: B-07. La verificación local de los 4 greps de bundle (`grep
-c "console\." dist/index.js`) no fue posible en Windows por el bug de
`@rolldown/binding-win32-x64-msvc`. CI (Linux) sí los puede correr.

**Hoy** la regresión queda **cubierta indirectamente**: si un `console.*`
sobrevive a producción, el bundle crece y `size-limit` lo detecta. Pero
no es una señal limpia (un crecimiento de 60 B podría también venir de
features legítimas, como pasó en beta.21).

**Propuesta** (post-RC1):

Añadir step explícito en `.github/workflows/verify.yml`:

```yaml
- name: Bundle has no dev warns
  run: |
    test "$(grep -c 'console\.' dist/index.js || true)" = "0"
    test "$(grep -c 'console\.' dist/index.cjs || true)" = "0"
    test "$(grep -c '\[reactigoded\]' dist/index.js || true)" = "0"
```

**Por qué no se hace en B-07**: scope creep. B-07 es la migración de
`isDev()` → `import.meta.env.DEV`. Añadir CI guards es una tarea
ortogonal con su propio impacto en el workflow.

---
