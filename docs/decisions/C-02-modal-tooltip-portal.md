# C-02 — Tooltip dentro de Dialog

**Fecha**: 2026-05-10
**Estado**: decisión consciente con trigger de re-evaluación
**Origen**: gate review § VI línea 1343

## Decisión

Mantener patrón manual: el consumer pasa `container={modalRef}` explícitamente cuando un Tooltip vive dentro de un Dialog.

## Por qué no resolver automáticamente ahora

**No es por preferencia ideológica de "cero magic".** Es por preservar la opción de migrar a context interno post-rc.1 sin breaking change.

### Trade-off real

- **Implementación A (manual, hoy) → migración a D con context interno post-rc.1**: backwards-compatible. La prop `container` sigue funcionando como override; el context se añade entre componentes del DS sin exportar al barrel root. Cero breaking para el consumer.

- **Implementación C o D con context público en rc.1**: el context queda firmado como API (sección V freeze decisions del review). Cualquier cambio futuro de shape, sustitución por otro mecanismo o eliminación = breaking permanente para los consumers que lo importaron.

La opción A no cierra puertas. C/D público las cierra para siempre.

## Lo que NO hacer

Documentado explícitamente para evitar trap futuro:

- **NO exportar `ModalPortalContext`** (o cualquier context equivalente) en `src/index.ts`. Si futuro Iván / futuro Claude Code mira C-02 dentro de seis meses y decide implementar la opción D pero accidentalmente exporta el context, **eso es trap permanente**.
- **NO implementar opción B** (DOM walk auto-detección): frágil contra shadow roots, debug imposible, falla silenciosa cuando `dialog` no está abierto.
- **NO marcar C-02 como "decisión final"**: es decisión por ahora con trigger explícito de re-evaluación.

## Trigger para reabrir C-02

Reabrir si ocurre cualquiera de estos:

1. **≥3 issues de consumers** reportando "Tooltip detrás del backdrop en Dialog" en los primeros 6 meses post-rc.1.
2. **≥2 PRs de proyectos consumer** pegándose con el patrón manual (workarounds explícitos en su código consumer).
3. **Decisión interna** de migrar el resto de componentes floating a un sistema de context unificado (entonces Tooltip-en-Dialog es un caso natural del sistema, no una excepción).

Si se reabre, la opción a evaluar es **D con context interno NO exportado**. Nunca C ni D con context público.

## Documentación al consumer

Aplicada en este PR:
- Story `TooltipDentroDeModal` en `src/components/floating/Tooltip/Tooltip.stories.tsx` con código de ejemplo pasando `container={dialogRef}`. Verificable visualmente en Storybook.
- JSDoc del prop `container` ampliado: frase explícita sobre el caso Dialog con snippet copy-paste.

## Próxima revisión

- **Programada**: rc.1 + 6 meses (tentativo: 2026-11-10).
- **Anticipada**: si se cumple algún trigger antes.
