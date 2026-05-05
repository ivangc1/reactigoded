import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { queryAllByRoleSafe, expectAtLeast } from "./index";

describe("queryAllByRoleSafe", () => {
  it("resuelve role implícito de input[type=range]", () => {
    const { container } = render(
      <div>
        <input type="range" defaultValue={0} />
        <input type="range" defaultValue={50} />
      </div>,
    );
    const sliders = queryAllByRoleSafe(container, "slider");
    expect(sliders.length).toBe(2);
  });

  it("resuelve role implícito de input[type=checkbox]", () => {
    const { container } = render(
      <div>
        <input type="checkbox" />
        <input type="checkbox" />
        <input type="checkbox" />
      </div>,
    );
    expect(queryAllByRoleSafe(container, "checkbox").length).toBe(3);
  });

  it("también encuentra role explícito", () => {
    const { container } = render(
      <div>
        <div role="tab">A</div>
        <div role="tab">B</div>
      </div>,
    );
    expect(queryAllByRoleSafe(container, "tab").length).toBe(2);
  });

  it("devuelve array vacío si no hay matches", () => {
    const { container } = render(<div>nada</div>);
    expect(queryAllByRoleSafe(container, "slider").length).toBe(0);
  });
});

describe("expectAtLeast", () => {
  it("pasa cuando length === min", () => {
    expectAtLeast([1, 2, 3], 3);
  });

  it("pasa cuando length > min", () => {
    expectAtLeast([1, 2, 3, 4], 2);
  });

  it("falla cuando length < min", () => {
    let captured: unknown = null;
    try {
      expectAtLeast([1], 5);
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeTruthy();
  });

  it("acepta NodeList como input", () => {
    const div = document.createElement("div");
    div.innerHTML = "<span></span><span></span>";
    const spans = div.querySelectorAll("span");
    expectAtLeast(spans, 2);
  });

  it("usa message custom en error", () => {
    const warn = vi.fn();
    try {
      expectAtLeast([], 1, "esperaba al menos un cardinal");
    } catch (e) {
      warn(String(e));
    }
    expect(warn).toHaveBeenCalled();
    const captured = String(warn.mock.calls[0]?.[0] ?? "");
    expect(captured).toContain("esperaba al menos un cardinal");
  });
});
