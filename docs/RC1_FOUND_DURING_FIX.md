# RC1 — hallazgos descubiertos durante los fixes

Lugar para anotar cosas que **no estaban en el plan** y que **no se
arreglan en esta sesión** (regla 0.1 del plan: "déjalo aquí, no lo
arregles"). Se procesan después de RC1.

---

## TODO #1 — Añadir grep `console.*` explícito en CI [B-07 follow-up] ✅ cerrado en `1b84a4f`

**Origen**: B-07. En el momento del commit B-07 la verificación local
de los 4 greps de bundle no fue posible en el shell del agente
(MINGW64 sobre Windows ARM64; `@rolldown/binding-win32-x64-msvc` no
disponible). El TODO dejaba el step CI explícito como follow-up.

**Cerrado en `1b84a4f`** (commit `ci(verify): add bundle dev-warn
guard [B-07-followup]`): step añadido a `.github/workflows/verify.yml`
entre Build y Size budgets:

```yaml
- name: Bundle has no dev warns (B-07 follow-up)
  run: |
    test "$(grep -c 'console\.' dist/index.js  || true)" = "0"
    test "$(grep -c 'console\.' dist/index.cjs || true)" = "0"
    test "$(grep -c '\[reactigoded\]' dist/index.js  || true)" = "0"
    test "$(grep -c '\[reactigoded\]' dist/index.cjs || true)" = "0"
```

**Verificación local del propio bundle** (descubierto post-cierre del
TODO que el agente sí tiene acceso a WSL Linux via `wsl.exe --exec`):
build ejecutado en WSL aarch64 con node 24.15 confirma:

```
grep -c console. dist/index.js  -> 0
grep -c console. dist/index.cjs -> 0
head -1 dist/index.js  -> "use client";
head -1 dist/index.cjs -> "use client";
```

Tanto B-07 (DCE de dev warns) como B-17 (use client banner) viajan
correctamente al bundle publicado.

---
