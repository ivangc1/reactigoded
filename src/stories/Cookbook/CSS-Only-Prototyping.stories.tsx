import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * H-07 (RC1) decision documented in
 * `docs/decisions/H-07-state-css-and-future.md`:
 *
 * `state.css` se conserva en el paquete principal con su wildcard
 * `./styles/state/*.css` (28 fragments granulares). Este story
 * demuestra el caso de uso intencionado — HTML estático
 * utility-first sin React ni build pipeline — para que el valor de
 * los 713 KB sea visible al evaluar el paquete.
 *
 * Próxima revisión: rc.1 + 6 meses.
 */

const meta = {
  title: "Cookbook/CSS-Only HTML Prototyping",
  parameters: {
    docs: {
      description: {
        component:
          "**Caso de uso**: HTML estático utility-first sin React, sin Tailwind, sin build pipeline. Importas fragmentos granulares de `reactigoded/styles/state/*.css` (`hover.css`, `focus.css`, `disabled.css`, etc) y usas las clases directamente en HTML. Útil para: micro-apps, landing pages, demos rápidos, prototipos one-off, dashboards estáticos.\n\n**Cuándo NO usar**: apps React medianas/grandes (usa los componentes del DS); apps con Tailwind ya configurado (usa utilities de Tailwind directamente). Ver `docs/CSSAPI.mdx` § state.css para guía completa.\n\n**Import granular vs bundle completo**: cada fragmento (~50 KB gz) es opt-in. Importar solo `state/hover.css` evita los 713 KB del bundle completo si solo necesitas pseudo-class hover.\n\nEl iframe debajo demuestra un button con `hover:` + `focus:` + `disabled:` funcionando 100% en HTML estático.",
      },
    },
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// El HTML de demo se sirve dentro de un iframe con srcdoc para
// aislar el CSS del Storybook host (que ya tiene styled. de
// reactigoded inyectado vía decorators globales).
//
// Las clases se aplican como string para que Storybook NO las
// procese como utilities suyas — son tokens públicos del DS que
// el browser interpreta directamente con CSS pseudo-class
// variants.
const DEMO_HTML = `<!DOCTYPE html>
<html data-theme="light">
<head>
  <meta charset="utf-8" />
  <style>
    /* Inline minimal del state.css fragment hover + focus + disabled
       para que el iframe funcione standalone (en producción el consumer
       importa los fragments .css normales desde el paquete). */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 2rem;
      margin: 0;
      background: #faf9fc;
    }
    .demo {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .ig-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      border: 0;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 150ms ease;
    }
    .ig-bg-vitreus { background: #053a40; color: #faf9fc; }
    .ig-bg-axis    { background: #2c6e7a; color: #faf9fc; }
    .ig-bg-laurus  { background: #4a7c59; color: #faf9fc; }
    .ig-bg-malum   { background: #8b1e3f; color: #faf9fc; }
    .ig-text-cinis { color: #0c1515; }
    .ig-p-4 { padding: 1rem; }
    .ig-rounded { border-radius: 0.5rem; }
    /* state.css fragments inline (versión reducida para el iframe demo) */
    .hover\\:ig-bg-axis:hover { background: #2c6e7a; }
    .hover\\:ig-bg-laurus:hover { background: #4a7c59; }
    .focus\\:ig-outline-2:focus { outline: 2px solid #3ae2f7; outline-offset: 2px; }
    .disabled\\:ig-bg-cinis:disabled,
    .disabled\\:ig-opacity-50:disabled { opacity: 0.5; cursor: not-allowed; }
    .group:hover .group-hover\\:ig-text-vitreus { color: #053a40; }
    .peer:checked ~ .peer-checked\\:ig-text-laurus { color: #4a7c59; }
    /* user-select utilities (preservadas del componente NativeSelect rename) */
    .ig-select-none { user-select: none; }
    .ig-select-all { user-select: all; }
  </style>
</head>
<body>
  <h2 style="margin-top:0;font-weight:500;">CSS-Only HTML Prototyping</h2>
  <p style="color:#555;font-size:14px;max-width:480px;">
    Cada botón usa clases <code>.ig-*</code> del DS + variants
    <code>hover:</code> / <code>focus:</code> / <code>disabled:</code>
    de <code>state.css</code>. <strong>Sin React, sin Tailwind, sin
    build.</strong> Hover / focus / click para verlo funcionar.
  </p>

  <div class="demo">
    <button class="ig-btn ig-bg-vitreus hover:ig-bg-axis focus:ig-outline-2">
      Hover & focus
    </button>

    <button class="ig-btn ig-bg-laurus hover:ig-bg-laurus disabled:ig-opacity-50" disabled>
      Disabled state
    </button>

    <label class="group ig-text-cinis" style="cursor:pointer;">
      <input type="checkbox" class="peer" />
      <span class="peer-checked:ig-text-laurus">peer-checked variant</span>
    </label>
  </div>

  <div style="margin-top:2rem;">
    <p style="color:#555;font-size:14px;">
      Utilities <code>user-select</code> también disponibles:
    </p>
    <p class="ig-select-none" style="font-size:13px;color:#888;">
      Este texto NO se puede seleccionar (<code>.ig-select-none</code>).
    </p>
    <code class="ig-select-all" style="font-size:13px;display:inline-block;padding:0.5rem;background:#e8e8e8;border-radius:4px;">
      Click-to-select-all-this-content (<strong>.ig-select-all</strong>)
    </code>
  </div>

  <h3 style="margin-top:2rem;font-weight:500;">Migración a producción</h3>
  <p style="color:#555;font-size:14px;max-width:560px;">
    En producción importa solo los fragments que necesitas:
  </p>
  <pre style="background:#0c1515;color:#3ae2f7;padding:1rem;border-radius:6px;font-size:13px;overflow:auto;"><code>&lt;!-- Solo el variant que usas (50 KB gz cada uno) --&gt;
&lt;link rel="stylesheet" href="reactigoded/styles/state/hover.css" /&gt;
&lt;link rel="stylesheet" href="reactigoded/styles/state/focus-visible.css" /&gt;

&lt;!-- O el bundle completo (713 KB gz) si usas muchos --&gt;
&lt;link rel="stylesheet" href="reactigoded/styles/state.css" /&gt;</code></pre>
</body>
</html>`;

export const HtmlPrototyping: Story = {
  render: () => (
    <iframe
      srcDoc={DEMO_HTML}
      style={{
        width: "100%",
        height: 540,
        border: "1px solid var(--ig-cinis-2, #e0e0e0)",
        borderRadius: 8,
      }}
      title="CSS-Only HTML Prototyping Demo"
    />
  ),
};
