/**
 * Oráculo de runtime — fixture worker (Auditoría B R5 §4.2 / D3).
 * Corre DENTRO de workerd y reporta las premisas del catálogo del gate `@server-safe`.
 * Cada entrada nueva del catálogo añade aquí su sonda (typeof + llamada si el hazard es
 * present-but-throws) y su aserción en run.mjs. Las premisas pineadas provienen de la
 * medición del 2026-07-17 (workerd 2026-07-17, compat 2026-07-01 y 2026-07-17, idénticas;
 * corroborado en Deno 2.9.3 —única divergencia elu-ausente, ya cubierta— y @edge-runtime/vm
 * —console.table ausente, resto no-fiable por fuga-de-Node).
 */
export default {
  async fetch() {
    const out = {
      perf: typeof performance,
      elu: typeof performance?.eventLoopUtilization,
      createObjectURL: typeof URL.createObjectURL,
      canParse: typeof URL.canParse,
      blob: typeof Blob,
      consoleTable: typeof console.table,
      waCompile: typeof WebAssembly.compile,
    };
    try {
      out.newURL = new URL("https://a.b/c").href;
    } catch (e) {
      out.newURL = "THROWS: " + String(e.message);
    }
    try {
      out.createObjectURLCall = String(URL.createObjectURL(new Blob(["x"])));
    } catch (e) {
      out.createObjectURLCall = "THROWS: " + String(e.message);
    }
    try {
      URL.revokeObjectURL("blob:x");
      out.revokeCall = "OK";
    } catch (e) {
      out.revokeCall = "THROWS: " + String(e.message);
    }
    try {
      await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
      out.waCompileCall = "OK";
    } catch (e) {
      out.waCompileCall = "THROWS " + e.constructor.name + ": " + String(e.message);
    }
    try {
      new Function("return 1");
      out.fnCtor = "OK";
    } catch (e) {
      out.fnCtor = "THROWS " + e.constructor.name;
    }
    try {
      console.table([{ a: 1 }]);
      out.tableCall = "OK";
    } catch (e) {
      out.tableCall = "THROWS: " + String(e.message);
    }
    return new Response(JSON.stringify(out));
  },
};
