/**
 * Combina el `aria-describedby` que el consumer haya pasado vía spread
 * (`{...rest}`) con la prop `describedBy` opcional del componente.
 *
 * Se introdujo en `1.0.0-beta.3` para arreglar un bug donde el patrón
 * `<input {...rest} aria-describedby={describedByValue} />` sobreescribía
 * a `undefined` el `aria-describedby` que el consumer ponía directamente
 * cuando `describedBy` no se pasaba. Resultado: el atributo desaparecía
 * del DOM final pese a estar declarado en el JSX del consumer.
 *
 * @param native  el `aria-describedby` que llegó vía rest props (string,
 *                undefined, u otro tipo no string que ignoramos).
 * @param prop    la prop `describedBy` del componente (string | string[]).
 * @returns string concatenado con espacios, o `undefined` si no hay nada.
 *
 * @example
 * mergeDescribedBy("a b", "c");        // "a b c"
 * mergeDescribedBy(undefined, ["c","d"]); // "c d"
 * mergeDescribedBy("a", undefined);    // "a"
 * mergeDescribedBy(undefined, "");     // undefined
 */
export function mergeDescribedBy(
  native: unknown,
  prop?: string | string[],
): string | undefined {
  const nativeValue = typeof native === "string" ? native.trim() : "";
  const propValue = Array.isArray(prop)
    ? prop.filter((id) => typeof id === "string" && id.length > 0).join(" ")
    : typeof prop === "string"
      ? prop.trim()
      : "";

  const combined = [nativeValue, propValue]
    .filter((s) => s.length > 0)
    .join(" ");

  return combined.length > 0 ? combined : undefined;
}
