# D-04 — Test runner SR (NVDA/VoiceOver) automatizado

**Fecha**: 2026-05-10
**Estado**: diferido indefinidamente
**Origen**: gate review § IV.5 línea 1295

## Contexto

> D-04: Test runner SR (NVDA/VoiceOver) automatizado. Defer indefinido.

Automatización de tests con lectores de pantalla reales (NVDA, VoiceOver, JAWS) en CI. Cubre regresiones a11y que `axe-core` y tests de unit no detectan (ej. orden de anuncio, doble lectura, omisión de live regions).

## Decisión

**Diferir indefinidamente**. Mantener cobertura actual basada en:
- `axe-core` integrado en Storybook play tests (cubre violaciones detectables estáticamente).
- Tests unit con `@testing-library/react` (cubren accessible name, role, aria-* attributes).
- `useLandmarkRegistry` runtime hook (detecta colisiones aria-label en mount).
- Decision docs M-09 (tabbable console.error legítimo) + L-03 (Firefox button-disabled caveat).

## Por qué NO ahora

- Infra masiva: setup de Docker con NVDA/VoiceOver, runners agentes, capturadores de output speech, validación.
- Coste de mantenimiento alto: cada upgrade de SR puede romper assertions.
- ROI bajo en pre-RC1: el DS ya pasa axe + a11y manual de Iván.
- Industria: ningún DS open-source mainstream (Mantine, Chakra, Radix) tiene esta infra. Validar antes de invertir.

## Plan post-RC1

- **Trigger 1**: aparece infra terciaria gratuita (cloud SR runners) que reduzca el coste setup.
- **Trigger 2**: bug a11y reportado por consumer que hubiera sido cazado por SR runner real.
- **Trigger 3**: equipo de a11y dedicado al DS que justifique el ROI.

Sin alguno de estos, mantener D-04 indefinido.

## Cierra

- **D-04** (DEFERRED del gate review § IV.5)
