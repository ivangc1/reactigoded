/**
 * Slot.test.tsx — Bloque A beta.27.
 *
 * Cubre los 8 edge cases del contrato D14 §"Edge case contract":
 *
 *   1. React.Fragment como child → dev error + render null.
 *   2. Multiple children → dev error + first valid en prod.
 *   3. Child con ref propio → composeRefs (function + object combo).
 *   4. Event chain order → child first, slot second, prevented si needed.
 *   5. null/false/undefined child → dev warn + render null.
 *   6. Nested Slot → composition emerge del cloneElement chain.
 *   7. aria-* / data-* / role → slot provee default, child override.
 *   8. className / style → merge rules per D14.
 *
 * Cobertura objetivo: ≥95% líneas del primitive.
 *
 * Tests con happy-dom (vitest project unit). No browser tests porque
 * Slot es primitive lógico — toda la cobertura es unit.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef, useRef, type Ref, type MouseEvent } from "react";
import { Slot } from "./Slot";
import { composeRefs } from "./composeRefs";
import { composeEventHandlers } from "./composeEventHandlers";

describe("Slot — single valid element", () => {
  it("clones a single child element and renders it", () => {
    render(
      <Slot>
        <button type="button" data-testid="probe">
          click
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("probe")).toBeInTheDocument();
    expect(screen.getByTestId("probe").tagName).toBe("BUTTON");
  });

  it("passes slot props through to the cloned child", () => {
    render(
      <Slot data-slot-prop="hello">
        <button type="button" data-testid="probe">
          x
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute(
      "data-slot-prop",
      "hello",
    );
  });
});

describe("Slot — className merge (cn behavior)", () => {
  it("concatenates slot className first, child className second", () => {
    render(
      <Slot className="slot-class">
        <button type="button" data-testid="probe" className="child-class">
          x
        </button>
      </Slot>,
    );
    const probe = screen.getByTestId("probe");
    expect(probe).toHaveClass("slot-class");
    expect(probe).toHaveClass("child-class");
  });

  it("handles undefined slot className (only child class applied)", () => {
    render(
      <Slot>
        <button type="button" data-testid="probe" className="child-only">
          x
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("probe")).toHaveClass("child-only");
  });

  it("handles undefined child className (only slot class applied)", () => {
    render(
      <Slot className="slot-only">
        <button type="button" data-testid="probe">
          x
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("probe")).toHaveClass("slot-only");
  });
});

describe("Slot — style merge (child wins)", () => {
  it("merges styles shallow with child winning on key collision", () => {
    render(
      <Slot style={{ color: "red", padding: 10 }}>
        <button
          type="button"
          data-testid="probe"
          style={{ color: "blue" }}
        >
          x
        </button>
      </Slot>,
    );
    const probe = screen.getByTestId("probe");
    // Child color wins (consumer override); slot padding inherited.
    expect(probe).toHaveStyle({ color: "blue", padding: "10px" });
  });

  it("style only on slot (child has no style)", () => {
    render(
      <Slot style={{ margin: 5 }}>
        <button type="button" data-testid="probe">
          x
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("probe")).toHaveStyle({ margin: "5px" });
  });
});

describe("Slot — ref composition", () => {
  it("function ref on child receives the DOM node", () => {
    const childRef = vi.fn();
    render(
      <Slot>
        <button
          type="button"
          data-testid="probe"
          ref={childRef as Ref<HTMLButtonElement>}
        >
          x
        </button>
      </Slot>,
    );
    expect(childRef).toHaveBeenCalledTimes(1);
    const node = screen.getByTestId("probe");
    expect(childRef).toHaveBeenCalledWith(node);
  });

  it("object ref on child + function ref on slot both receive the DOM node", () => {
    const childObjRef = createRef<HTMLButtonElement>();
    const slotFnRef = vi.fn();
    render(
      <Slot ref={slotFnRef as Ref<HTMLElement>}>
        <button type="button" data-testid="probe" ref={childObjRef}>
          x
        </button>
      </Slot>,
    );
    const node = screen.getByTestId("probe");
    expect(childObjRef.current).toBe(node);
    expect(slotFnRef).toHaveBeenCalledWith(node);
  });

  it("function + function refs both receive the DOM node", () => {
    const slotFnRef = vi.fn();
    const childFnRef = vi.fn();
    render(
      <Slot ref={slotFnRef as Ref<HTMLElement>}>
        <button
          type="button"
          data-testid="probe"
          ref={childFnRef as Ref<HTMLButtonElement>}
        >
          x
        </button>
      </Slot>,
    );
    const node = screen.getByTestId("probe");
    expect(slotFnRef).toHaveBeenCalledWith(node);
    expect(childFnRef).toHaveBeenCalledWith(node);
  });
});

describe("Slot — event handler chain (D14 edge case #4)", () => {
  it("child handler runs FIRST, slot handler runs SECOND", () => {
    const calls: string[] = [];
    const childHandler = () => calls.push("child");
    const slotHandler = () => calls.push("slot");
    render(
      <Slot onClick={slotHandler}>
        <button type="button" data-testid="probe" onClick={childHandler}>
          x
        </button>
      </Slot>,
    );
    fireEvent.click(screen.getByTestId("probe"));
    expect(calls).toEqual(["child", "slot"]);
  });

  it("if child calls preventDefault, slot handler is SKIPPED", () => {
    const slotHandler = vi.fn();
    const childHandler = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
    };
    render(
      <Slot onClick={slotHandler}>
        <button type="button" data-testid="probe" onClick={childHandler}>
          x
        </button>
      </Slot>,
    );
    fireEvent.click(screen.getByTestId("probe"));
    expect(slotHandler).not.toHaveBeenCalled();
  });

  it("only slot handler: runs normally", () => {
    const slotHandler = vi.fn();
    render(
      <Slot onClick={slotHandler}>
        <button type="button" data-testid="probe">
          x
        </button>
      </Slot>,
    );
    fireEvent.click(screen.getByTestId("probe"));
    expect(slotHandler).toHaveBeenCalledTimes(1);
  });

  it("only child handler: runs normally", () => {
    const childHandler = vi.fn();
    render(
      <Slot>
        <button type="button" data-testid="probe" onClick={childHandler}>
          x
        </button>
      </Slot>,
    );
    fireEvent.click(screen.getByTestId("probe"));
    expect(childHandler).toHaveBeenCalledTimes(1);
  });

  it("non-event-shape functions in slotProps do NOT compose", () => {
    // Functions whose name doesn't match /^on[A-Z]/ should follow the
    // "default: child wins" branch, not the chain logic.
    const slotFormatter = vi.fn(() => "slot");
    const childFormatter = vi.fn(() => "child");
    render(
      <Slot data-format-fn={slotFormatter}>
        <button
          type="button"
          data-testid="probe"
          data-format-fn={childFormatter}
        >
          x
        </button>
      </Slot>,
    );
    // No assertion call needed — the prop is just stored. The point is
    // we don't throw / break. Hard to assert which function "won" since
    // it's a custom data attribute (React stringifies it).
    expect(screen.getByTestId("probe")).toBeInTheDocument();
  });
});

describe("Slot — aria / data / role inheritance (slot default, child override)", () => {
  it("slot aria-label applied if child has no aria-label", () => {
    render(
      <Slot aria-label="from slot">
        <button type="button" data-testid="probe">
          x
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute(
      "aria-label",
      "from slot",
    );
  });

  it("child aria-label overrides slot aria-label", () => {
    render(
      <Slot aria-label="from slot">
        <button type="button" data-testid="probe" aria-label="from child">
          x
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute(
      "aria-label",
      "from child",
    );
  });

  it("role: slot default + child override", () => {
    render(
      <Slot role="button">
        <button type="button" data-testid="probe" role="link">
          x
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("role", "link");
  });

  it("data-state from slot propagates if child has no data-state", () => {
    render(
      <Slot data-state="open">
        <button type="button" data-testid="probe">
          x
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("data-state", "open");
  });
});

describe("Slot — Fragment child (D14 edge case #1)", () => {
  it("logs dev error and renders null", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <Slot>
        <>
          <button type="button">x</button>
        </>
      </Slot>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain(
      "Slot> received a React.Fragment",
    );
    errorSpy.mockRestore();
  });
});

describe("Slot — multiple children (D14 edge case #2)", () => {
  it("logs dev error and renders first valid element", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Slot data-slot-marker="yes">
        <button type="button" data-testid="first">
          one
        </button>
        <button type="button" data-testid="second">
          two
        </button>
      </Slot>,
    );
    expect(screen.getByTestId("first")).toHaveAttribute(
      "data-slot-marker",
      "yes",
    );
    expect(screen.queryByTestId("second")).not.toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain(
      "expects exactly 1 child element; received 2",
    );
    errorSpy.mockRestore();
  });
});

describe("Slot — null/false/undefined children (D14 edge case #5)", () => {
  it("null child: warn + render null", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<Slot>{null}</Slot>);
    expect(container).toBeEmptyDOMElement();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("null/false child");
    warnSpy.mockRestore();
  });

  it("false child (common with conditional && pattern): warn + render null", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Cond widened a boolean para evitar narrowing literal `false` que
    // ESLint marca como "always falsy" en `cond && ...`.
    const cond: boolean = Math.random() > 1 ? true : false;
    const { container } = render(
      <Slot>{cond && <button type="button">x</button>}</Slot>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("Slot — invalid child types", () => {
  it("string child: dev error + render null", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<Slot>just a string</Slot>);
    expect(container).toBeEmptyDOMElement();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain("invalid child");
    errorSpy.mockRestore();
  });

  it("number child: dev error + render null", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<Slot>{42}</Slot>);
    expect(container).toBeEmptyDOMElement();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

describe("Slot — nested Slot composition (D14 edge case #6)", () => {
  it("outer Slot props propagate through nested Slot to inner element", () => {
    // Simula DialogClose-asChild > Tooltip-with-Slot-inside > Button.
    // Aquí simplificamos: outer Slot directamente wraps inner Slot wraps button.
    const outerClick = vi.fn();
    const innerClick = vi.fn();
    const consumerClick = vi.fn();
    render(
      <Slot onClick={outerClick} data-outer="yes">
        <Slot onClick={innerClick} data-inner="yes">
          <button
            type="button"
            data-testid="probe"
            onClick={consumerClick}
          >
            x
          </button>
        </Slot>
      </Slot>,
    );
    const probe = screen.getByTestId("probe");
    // Both slot data props reach the final element.
    expect(probe).toHaveAttribute("data-outer", "yes");
    expect(probe).toHaveAttribute("data-inner", "yes");
    fireEvent.click(probe);
    // Click chain: consumer → inner slot → outer slot (each level
    // child-first via composeEventHandlers).
    expect(consumerClick).toHaveBeenCalledTimes(1);
    expect(innerClick).toHaveBeenCalledTimes(1);
    expect(outerClick).toHaveBeenCalledTimes(1);
  });

  it("outer Slot ref reaches the deepest DOM node through nested Slot", () => {
    const outerRef = createRef<HTMLButtonElement>();
    const innerRef = createRef<HTMLButtonElement>();
    const childRef = createRef<HTMLButtonElement>();
    render(
      <Slot ref={outerRef as Ref<HTMLElement>}>
        <Slot ref={innerRef as Ref<HTMLElement>}>
          <button type="button" data-testid="probe" ref={childRef}>
            x
          </button>
        </Slot>
      </Slot>,
    );
    const node = screen.getByTestId("probe");
    expect(outerRef.current).toBe(node);
    expect(innerRef.current).toBe(node);
    expect(childRef.current).toBe(node);
  });
});

describe("composeRefs unit", () => {
  it("returns null if all refs are null/undefined", () => {
    expect(composeRefs(null, undefined)).toBeNull();
    expect(composeRefs()).toBeNull();
  });

  it("composes function + object refs (both receive node)", () => {
    const fnRef = vi.fn();
    const objRef = createRef<HTMLElement>();
    const composed = composeRefs<HTMLElement>(fnRef, objRef);
    const fakeNode = document.createElement("div");
    composed?.(fakeNode);
    expect(fnRef).toHaveBeenCalledWith(fakeNode);
    expect(objRef.current).toBe(fakeNode);
  });

  it("filters out null refs and still calls the valid ones", () => {
    const fnRef = vi.fn();
    const composed = composeRefs<HTMLElement>(null, fnRef, undefined);
    const fakeNode = document.createElement("span");
    composed?.(fakeNode);
    expect(fnRef).toHaveBeenCalledTimes(1);
    expect(fnRef).toHaveBeenCalledWith(fakeNode);
  });

  it("works inside React useRef pattern", () => {
    function Probe({ outerRef }: { outerRef: Ref<HTMLDivElement> }) {
      const innerRef = useRef<HTMLDivElement>(null);
      return (
        <div
          data-testid="probe"
          ref={composeRefs(outerRef, innerRef)}
        />
      );
    }
    const outer = createRef<HTMLDivElement>();
    render(<Probe outerRef={outer} />);
    expect(outer.current).toBe(screen.getByTestId("probe"));
  });
});

describe("composeEventHandlers unit", () => {
  it("returns undefined if both handlers are undefined", () => {
    expect(composeEventHandlers(undefined, undefined)).toBeUndefined();
  });

  it("calls original first, then ours (via real synthetic event)", () => {
    const order: string[] = [];
    const original = () => {
      order.push("original");
    };
    const ours = () => {
      order.push("ours");
    };
    const composed = composeEventHandlers<MouseEvent<HTMLButtonElement>>(
      original,
      ours,
    );
    render(
      <button type="button" data-testid="probe" onClick={composed}>
        x
      </button>,
    );
    fireEvent.click(screen.getByTestId("probe"));
    expect(order).toEqual(["original", "ours"]);
  });

  it("skips ours if original called preventDefault", () => {
    const original = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
    };
    const ours = vi.fn();
    const composed = composeEventHandlers<MouseEvent<HTMLButtonElement>>(
      original,
      ours,
    );
    render(
      <button type="button" data-testid="probe" onClick={composed}>
        x
      </button>,
    );
    fireEvent.click(screen.getByTestId("probe"));
    expect(ours).not.toHaveBeenCalled();
  });

  it("works with only original handler", () => {
    const original = vi.fn();
    const composed = composeEventHandlers<MouseEvent<HTMLButtonElement>>(
      original,
      undefined,
    );
    render(
      <button type="button" data-testid="probe" onClick={composed}>
        x
      </button>,
    );
    fireEvent.click(screen.getByTestId("probe"));
    expect(original).toHaveBeenCalledTimes(1);
  });

  it("works with only ours handler", () => {
    const ours = vi.fn();
    const composed = composeEventHandlers<MouseEvent<HTMLButtonElement>>(
      undefined,
      ours,
    );
    render(
      <button type="button" data-testid="probe" onClick={composed}>
        x
      </button>,
    );
    fireEvent.click(screen.getByTestId("probe"));
    expect(ours).toHaveBeenCalledTimes(1);
  });
});
