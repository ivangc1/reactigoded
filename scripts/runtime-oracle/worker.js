// Oráculo de runtime del catálogo @server-safe (Auditoría B R5 §4.2 / D3, absorbe #190).
// Se ejecuta DENTRO de workerd (el baseline Edge REAL, no una emulación con fugas como @edge-runtime/vm)
// y reporta el hazard-kind medido de cada premisa del catálogo. El spec de CI arranca este worker en un
// puerto efímero, fetch-ea, y compara el JSON con las premisas pineadas — convirtiendo "premisa asertada"
// en "premisa medida-continuamente". Si workerd cambia una premisa (o un miembro migra absence↔present-throws),
// el diff de test lo revela ANTES de que el gate clasifique mal (la lección root-H: medir, no asumir).
export default {
  async fetch() {
    const out = {
      // absence-hazard: el miembro FALTA en workerd (undefined) → `?.()`/`?? fb` lo protegen.
      elu: typeof performance?.eventLoopUtilization,
      table: typeof console.table,
    };
    // present-but-throws: typeof da "function" pero la LLAMADA lanza → la sonda NO protege.
    try {
      URL.createObjectURL(new Blob(["x"]));
      out.createObjectURL = "OK";
    } catch (e) {
      out.createObjectURL = "THROWS:" + e.message.slice(0, 40);
    }
    try {
      await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
      out.waCompile = "OK";
    } catch (e) {
      out.waCompile = "THROWS:" + e.constructor.name;
    }
    try {
      new Function("return 1");
      out.fnCtor = "OK";
    } catch (e) {
      out.fnCtor = "THROWS:" + e.constructor.name;
    }
    return new Response(JSON.stringify(out));
  },
};
