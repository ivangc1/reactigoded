/**
 * Script runtime del manager de Storybook — externalizado en post-RC1
 * para permitir CSP estricta (`script-src 'self'`) en deploys que la
 * exijan. Sustituye al `<script>` inline que estaba en `managerHead`
 * de `.storybook/main.ts` (beta.22).
 *
 * Comportamiento (idéntico al inline anterior):
 * (1) fuerza lang="es" en <html> (B-04 — Storybook publica con
 *     lang="" por defecto, este lo fija antes del paint).
 * (2) reescribe <title> cuando Storybook lo cambia tras navegación
 *     (router del manager pone "<story> ⋅ Storybook").
 * (3) dedupe defensivo: red de seguridad por si Storybook clona el
 *     <title> en algún path interno. Tras la consolidación de
 *     metas estáticas en .storybook/manager-head.html (beta.22),
 *     el dedupe ya no es CURATIVO sino DEFENSIVO; los observers se
 *     mantienen porque cuestan ~0 y protegen contra futuras versiones
 *     de Storybook que reintroduzcan el bug.
 *
 * Cargado vía `<script src="/static/manager-runtime.js"></script>` en
 * el `managerHead` de `main.ts`. El archivo se copia a
 * `storybook-static/static/` por `staticDirs` en `main.ts`.
 */
(function () {
  var BRAND = "Igoded Design System";

  // 1. Lang correcto (B-04).
  if (document.documentElement.lang !== "es") {
    document.documentElement.lang = "es";
  }

  // 2. Dedupe defensivo (red de seguridad post-consolidación).
  function dedupe() {
    var titles = document.querySelectorAll("head > title");
    for (var i = 1; i < titles.length; i++) titles[i].remove();
    var descs = document.querySelectorAll('head > meta[name="description"]');
    for (var j = 1; j < descs.length; j++) descs[j].remove();
  }

  // 3. Rewrite del título a brand cuando Storybook lo restaura a su default.
  function rewrite() {
    var t = document.title;
    if (!t) return;
    if (t === "Storybook" || t === "storybook - Storybook") {
      document.title = BRAND;
    } else if (/⋅\s*Storybook$/.test(t)) {
      document.title = t.replace(/⋅\s*Storybook$/, "· " + BRAND);
    } else if (/-\s*Storybook$/.test(t)) {
      document.title = t.replace(/-\s*Storybook$/, "· " + BRAND);
    }
  }

  dedupe();
  rewrite();

  // MutationObserver sobre <title> — captura cualquier cambio sin polling.
  var titleEl = document.querySelector("title");
  if (titleEl && typeof MutationObserver !== "undefined") {
    new MutationObserver(function () {
      rewrite();
      dedupe();
    }).observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
  // Fallback: si el <title> se reemplaza entero (no solo su texto),
  // observa el <head> también para re-disparar dedupe + rewrite.
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(function () {
      rewrite();
      dedupe();
    }).observe(document.head, {
      childList: true,
    });
  }
})();
