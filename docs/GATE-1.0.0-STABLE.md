# Gate `1.0.0` estable — mandato de auditoría (cruce A+B)

> **Objeto**: `reactigoded@1.0.0-rc.1` (npm dist-tag `rc`, tag `v1.0.0-rc.1`).
> **Decisión que habilita**: promover a `1.0.0` estable, o rechazarlo.
> **Formato**: dos auditores independientes, sin coordinarse entre ellos.

---

## 0. Por qué este gate es más duro que el anterior

El gate de rc.1 auditaba un **congelado reversible**: la API quedaba fija, pero seguía siendo pre-release y
`npm install reactigoded` ni siquiera resolvía al paquete.

Este audita el paso a **estable**, y ahí cambian tres cosas a la vez:

1. **`latest` se mueve a 1.0.0.** Hoy apunta a `1.0.0-beta.26`. Quien tenga `reactigoded` instalado a secas
   salta de `beta.26` a `1.0.0` **cruzando los renames BREAKING de rc.1** (`NavbarBrand`→`NavbarLogo`,
   `.ig-tooltip-color-*`, `.ig-input-error/success`). Nadie ha probado ese salto.
2. **Semver deja de ser aspiracional.** Cualquier defecto en superficie pública que shippee en 1.0.0 solo se
   arregla con un **2.0.0**. No hay ventana de gracia.
3. **`@server-safe` pasa a ser una promesa a terceros.** Su ADR del eval-sink lleva una *cláusula de
   caducidad* explícita: la frontera declarada se anula «si `@server-safe` pasa a frontera de confianza sobre
   código no auditado». **Parte del trabajo es decidir si 1.0.0 dispara esa cláusula.**

El criterio de aceptación no es «no encontré nada». Es **«barrí X con el predicado Y, y lo que no cubrí lo
declaro»**.

---

## 1. Reparto A/B — ninguna celda en tierra de nadie

| | **Auditor A** | **Auditor B** |
|---|---|---|
| Entorno | Windows · Node 24 · PowerShell | Linux/WSL · Node 22.12 (engine floor) · bash |
| Resolución | NodeNext, drive letters, rutas UNC | Bundler, ext4, symlinks |
| Dueño de | matriz CI, packaging del tarball, `.d.ts` bajo NodeNext | engine mínimo, gate `@server-safe`, runtime SSR/Edge |
| Consumer sintético | Next.js App Router (RSC) | Vite + SSR manual |

**Celdas no reproducibles**: si no puedes ejecutar una, **dilo explícitamente** en el informe en vez de
omitirla. Una celda silenciada es peor que una declarada.

---

## 2. Qué NO cuenta como hallazgo

Estos ya están documentados con su razón. Re-reportarlos es ruido; **atacar su razón sí es un hallazgo**:

- **Residuales por diseño del gate** (`docs/server-safe-limitations.md`): data-flow/provenance (§141),
  frontera del eval-sink (token-en-su-sitio vs token-ensamblado), sobre-flagueo deliberado (§373),
  P-M2-PROSE, y lo declarado fuera de mandato.
- **Diferidos con línea**: `process.env` con guard, patas workerd/Deno de #190, los 10 `EDGE_MISSING`
  sobre-estrictos, `console.clear`, `typescript@7`, go-to-definition al source, `attw` como gate.
- **`latest` apuntando a `beta.26`** en rc.1 — conocido y documentado. Lo que **sí** es hallazgo es lo que
  pase al moverlo.
- **Confirmar que un gate existente funciona.** No es hallazgo. Romperlo, sí.

**Un hallazgo válido demuestra que una razón declarada ya no aguanta sobre los hechos de hoy**, o abre
terreno que ningún documento cubre.

---

## 3. Ejes sembrados — verificados, no hipotéticos

No son pistas gratis: son puntos de partida **confirmados contra el código**, para que nadie los descubra en
la última hora.

### 3.1 El gate del freeze es **unidireccional**

`scripts/check-public-api-names.mjs`, línea 19, literal: *«El test comprueba `JSON ⊆ dist`, nada más.»*

Caza que un nombre congelado desaparezca o se renombre. **No caza lo contrario**: superficie pública que
existe en `dist` y **no** está en el freeze shippea **sin congelar** y sin que nadie se entere.

Preguntas a responder con datos: ¿qué hay hoy en `dist` (clases `ig-*`, data-attrs emitidos, custom
properties, exports de tipos) que **no** esté en `public-api-names.json`? ¿Algo de eso es de facto público —
lo usaría un consumer razonable, aparece en docs o stories? En 1.0.0, ¿queda congelado *de hecho* aunque no
*de derecho*?

### 3.2 El salto `beta.26` → `1.0.0` cruzando los renames

Nadie lo ha ejecutado. Monta un consumer real sobre `beta.26` usando las clases y componentes viejos
(`NavbarBrand`, `.ig-tooltip-color-brand`, `.ig-input-error`, `state="error"`), actualiza a `1.0.0-rc.1`, y
**mide qué se rompe y cómo de silencioso es el fallo**. Un rename de clase CSS no da error de compilación:
da un componente sin estilo. ¿Lo avisa algo?

### 3.3 La cláusula de caducidad del eval-sink

El ADR declara la frontera del eval-sink como residual **bajo el modelo opt-in/first-party**: el «atacante»
sería un autor saboteando su propio marcador. Argumenta con hechos si 1.0.0 —paquete público, consumers de
terceros, provenance firmada— cambia ese modelo de amenaza. Si lo cambia, la frontera declarada deja de ser
legítima y pasa a ser un hueco.

### 3.4 Superficie de tipos bajo configuraciones de consumer

`exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `moduleResolution: node16|nodenext|bundler`, `strict`
en todas sus variantes, y `skipLibCheck: false`. Las 2 fronteras EOPT documentadas no cuentan (§2); lo que
cuenta es cualquier **otra** combinación que rompa.

---

## 4. Estándar de evidencia — no negociable

Este apartado existe porque los fallos más caros de la campaña anterior **no fueron bugs no encontrados,
sino afirmaciones con más confianza de la que la evidencia sostenía**.

1. **Toda afirmación lleva su medición.** Comando y salida. «Revisé X y está bien» no vale.
2. **Separa MEDIDO de INFERIDO en cada hallazgo.** Haber medido un efecto **no** verifica tu explicación de
   la causa. Si la causa es inferida, dilo — y di qué experimento la confirmaría.
3. **Un resultado vacío solo prueba ausencia si el predicado podía cazar el objetivo.** Antes de escribir «no
   existe / no encontrado», declara el predicado y su cobertura. Un `grep` por el nombre equivocado no es
   evidencia de nada.
4. **Prohibido el sello sin comprobación.** No escribas «verificado», «permanente», «cubierto» o
   «garantizado» sin haber comprobado el alcance de esa palabra. Un log de CI **no** es permanente
   (caduca); un dist-tag **no** es evidencia (es un puntero mutable).
5. **Nada de referencias hacia adelante.** No afirmes cobertura apoyándote en algo que no está en el árbol
   que auditaste.
6. **Distingue fallo-de-entorno de regresión** antes de reportar. Re-ejecuta con caché limpia.

---

## 5. Criterio de parada

Cada auditor entrega **≥3 hallazgos [NUEVO]**, o una **declaración de agotamiento** que enumere: ejes
barridos, predicado usado en cada uno, y qué queda fuera de su cobertura.

«No encontré nada» sin esa declaración **no cierra el gate** — es indistinguible de no haber mirado.

---

## 6. Formato de entrega

Por hallazgo:

- **ID y severidad** — BLOCKER (rompe a un consumer en 1.0.0 y solo se arregla con 2.0) · HIGH (fallo
  silencioso o pérdida de datos) · MEDIUM (DX/packaging) · LOW (doc/ruido).
- **Reproducción** — comandos exactos, entorno, salida.
- **Medido vs inferido** — explícito.
- **Blast radius en 1.0.0** — qué le pasa a un consumer real, y si el arreglo posterior sería major.
- **Recomendación** — arreglar / declarar como limitación / diferir con línea.

Al final: **veredicto GO / NO-GO** para promover a estable, y si es GO, condicionado a qué.

---

## 7. Anti-teatro

Se rechazan, y se dicen rechazados:

- Hallazgos que exigen un adversario que el modelo de amenaza excluye (autor saboteando su propio código
  first-party), **salvo** que el argumento sea precisamente que 1.0.0 cambia ese modelo (§3.3).
- Reformulaciones de residuales documentados sin atacar su razón.
- «Podría fallar si…» sin una reproducción.
- Cobertura falsa: cazar 1 de ∞ escrituras equivalentes y presentarlo como clase cerrada.

---

## 8. Contexto de partida

- **Estado**: `1.0.0-rc.1` publicado, API congelada (332 clases + 2 classHooks + 6 data-attrs + 37 tokens
  Tier-2), `verify` completo en verde, release automatizado por tag con Trusted Publishing (OIDC) y
  provenance firmada.
- **Lectura previa obligatoria**: `CHANGELOG.md` (sección `1.0.0-rc.1`, incluidas *Limitaciones conocidas* y
  *Diferido*), `docs/server-safe-limitations.md` entero, `docs/RC1_DECISIONS.md`, `docs/POST_RC1_BACKLOG.md`.
- **Deriva conocida sin cerrar**: `docs/RC1_GATE_REVIEW.md` (líneas 95 y 1719) documenta
  `npm ci --legacy-peer-deps`, estado muerto desde el fix de `overrides`. Reportarla **no** cuenta como
  hallazgo; ya está aquí.

**Este gate + el cruce A+B ES el check de promoción a estable.** No hay checklist humano adicional detrás.
