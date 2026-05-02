import { describe, it, expect } from "vitest";
import { mergeDescribedBy } from "./mergeDescribedBy";

describe("mergeDescribedBy", () => {
  it("solo native rest → devuelve native", () => {
    expect(mergeDescribedBy("native-id")).toBe("native-id");
  });

  it("solo prop string → devuelve prop", () => {
    expect(mergeDescribedBy(undefined, "prop-id")).toBe("prop-id");
  });

  it("solo prop array → join con espacio", () => {
    expect(mergeDescribedBy(undefined, ["a", "b", "c"])).toBe("a b c");
  });

  it("native + prop string → concatena con espacio", () => {
    expect(mergeDescribedBy("native-id", "prop-id")).toBe("native-id prop-id");
  });

  it("native + prop array → concatena", () => {
    expect(mergeDescribedBy("native-id", ["a", "b"])).toBe("native-id a b");
  });

  it("ambos vacíos → undefined", () => {
    expect(mergeDescribedBy(undefined, undefined)).toBeUndefined();
    expect(mergeDescribedBy("")).toBeUndefined();
    expect(mergeDescribedBy(undefined, "")).toBeUndefined();
    expect(mergeDescribedBy(undefined, [])).toBeUndefined();
    expect(mergeDescribedBy(undefined, ["", "", ""])).toBeUndefined();
  });

  it("filtra ids vacíos del array", () => {
    expect(mergeDescribedBy(undefined, ["a", "", "b", ""])).toBe("a b");
  });

  it("trim espacios en native string", () => {
    expect(mergeDescribedBy("  trimmed  ", "x")).toBe("trimmed x");
  });

  it("native que no es string se ignora", () => {
    expect(mergeDescribedBy(42, "x")).toBe("x");
    expect(mergeDescribedBy(null, "x")).toBe("x");
    expect(mergeDescribedBy({}, "x")).toBe("x");
  });
});
