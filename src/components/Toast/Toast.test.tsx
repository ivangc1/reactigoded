import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Toast } from "./Toast";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./ToastContext";

describe("Toast — primitivo", () => {
  it("aplica ig-toast y NO añade clase de variant cuando variant=neutral", () => {
    const { container } = render(<Toast title="x" />);
    const node = container.querySelector(".ig-toast");
    expect(node).not.toBeNull();
    expect(node?.className).not.toMatch(
      /ig-toast-(success|warning|danger|info|brand|secondary|neutral)/,
    );
  });

  it("aplica clase de variant cuando es != neutral", () => {
    const { container } = render(<Toast variant="success" title="x" />);
    expect(container.querySelector(".ig-toast")).toHaveClass(
      "ig-toast-success",
    );
  });

  it("usa role=alert y aria-live=assertive en danger/warning", () => {
    const { rerender } = render(
      <Toast variant="danger" title="x" data-testid="t" />,
    );
    expect(screen.getByTestId("t")).toHaveAttribute("role", "alert");
    expect(screen.getByTestId("t")).toHaveAttribute("aria-live", "assertive");
    rerender(<Toast variant="warning" title="x" data-testid="t" />);
    expect(screen.getByTestId("t")).toHaveAttribute("role", "alert");
  });

  it("usa role=status y aria-live=polite en variants no críticos", () => {
    render(<Toast variant="success" title="x" data-testid="t" />);
    expect(screen.getByTestId("t")).toHaveAttribute("role", "status");
    expect(screen.getByTestId("t")).toHaveAttribute("aria-live", "polite");
  });

  it("muestra icono por defecto del variant y permite override / ocultar", () => {
    const { rerender, container } = render(
      <Toast variant="success" title="ok" />,
    );
    expect(container.querySelector(".ig-toast-icon")?.textContent).toBe("✓");

    rerender(<Toast variant="success" title="ok" icon="🎉" />);
    expect(container.querySelector(".ig-toast-icon")?.textContent).toBe("🎉");

    rerender(<Toast variant="success" title="ok" icon={false} />);
    expect(container.querySelector(".ig-toast-icon")).toBeNull();
  });

  // L-06: defaults consistentes — pre-fix warning/info eran ASCII plain
  // ("!" y "i") mientras los demás eran Unicode. Este test cubre los 6
  // variants no-neutral y verifica que ninguno cae a un char [0-9A-Za-z!]
  // (regression guard contra reintroducir defaults estilo letra).
  it.each([
    ["success", "✓"],
    ["warning", "⚠︎"],
    ["danger", "✕"],
    ["info", "ℹ︎"],
    ["brand", "★"],
    ["secondary", "•"],
  ] as const)(
    "default icon variant=%s es '%s' (Unicode no-ASCII) [L-06]",
    (variant, expected) => {
      const { container } = render(<Toast variant={variant} title="x" />);
      const iconEl = container.querySelector(".ig-toast-icon");
      expect(iconEl?.textContent).toBe(expected);
      // Regression guard: ningún default cae a ASCII basic (letras/símbolos
      // del flow text). Sin esto, alguien podría re-introducir 'i'/'!' por
      // simplicidad y romper la consistencia visual sin que un test lo cace.
      expect(iconEl?.textContent).not.toMatch(/^[ -~]+$/);
    },
  );

  it("neutral variant no muestra icono salvo override explícito", () => {
    const { container, rerender } = render(<Toast title="ok" />);
    expect(container.querySelector(".ig-toast-icon")).toBeNull();
    rerender(<Toast title="ok" icon="ℹ" />);
    expect(container.querySelector(".ig-toast-icon")?.textContent).toBe("ℹ");
  });

  it("renderiza title y message", () => {
    render(<Toast title="Guardado" message="Cambios persistidos" />);
    expect(screen.getByText("Guardado")).toHaveClass("ig-toast-title");
    expect(screen.getByText("Cambios persistidos")).toHaveClass(
      "ig-toast-message",
    );
  });

  it("dispara onClose al click en ×", () => {
    const onClose = vi.fn();
    render(<Toast title="x" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("dismissible=false oculta el botón cerrar", () => {
    render(<Toast title="x" dismissible={false} />);
    expect(screen.queryByRole("button", { name: /cerrar/i })).not.toBeInTheDocument();
  });
});

describe("ToastProvider — cola y portal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function ToastTrigger({
    options,
    label = "lanzar",
  }: {
    options: Parameters<ReturnType<typeof useToast>["toast"]>[0];
    label?: string;
  }) {
    const { toast } = useToast();
    return <button onClick={() => toast(options)}>{label}</button>;
  }

  it("toast() añade un toast al container", () => {
    render(
      <ToastProvider container={null}>
        <ToastTrigger options={{ title: "Hola", variant: "success" }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /lanzar/i }));
    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(screen.getByText("Hola").closest(".ig-toast")).toHaveClass(
      "ig-toast-success",
    );
  });

  it("aplica clase de posición al container", () => {
    const { container } = render(
      <ToastProvider position="bottom-center" container={null}>
        <span />
      </ToastProvider>,
    );
    expect(container.querySelector(".ig-toast-container")).toHaveClass(
      "ig-toast-bottom-center",
    );
  });

  it("auto-dismiss tras duration ms", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider container={null} defaultDuration={1000}>
        <ToastTrigger options={{ title: "Tic" }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /lanzar/i }));
    expect(screen.getByText("Tic")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(999); });
    expect(screen.getByText("Tic")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText("Tic")).not.toBeInTheDocument();
  });

  it("duration=0 desactiva el auto-dismiss", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider container={null} defaultDuration={1000}>
        <ToastTrigger options={{ title: "Persistente", duration: 0 }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /lanzar/i }));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByText("Persistente")).toBeInTheDocument();
  });

  it("click en × cierra y dispara onDismiss", () => {
    const onDismiss = vi.fn();
    render(
      <ToastProvider container={null} defaultDuration={0}>
        <ToastTrigger options={{ title: "Hola", onDismiss }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /lanzar/i }));
    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(screen.queryByText("Hola")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("dismissAll cierra todos los toasts", () => {
    function Harness() {
      const { toast, dismissAll } = useToast();
      return (
        <>
          <button onClick={() => toast({ title: "Toast-A", duration: 0 })}>
            lanzarA
          </button>
          <button onClick={() => toast({ title: "Toast-B", duration: 0 })}>
            lanzarB
          </button>
          <button onClick={dismissAll}>clear</button>
        </>
      );
    }
    render(
      <ToastProvider container={null}>
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "lanzarA" }));
    fireEvent.click(screen.getByRole("button", { name: "lanzarB" }));
    expect(screen.getByText("Toast-A")).toBeInTheDocument();
    expect(screen.getByText("Toast-B")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "clear" }));
    expect(screen.queryByText("Toast-A")).not.toBeInTheDocument();
    expect(screen.queryByText("Toast-B")).not.toBeInTheDocument();
  });

  it("renderiza en portal a document.body por defecto", () => {
    render(
      <ToastProvider>
        <ToastTrigger options={{ title: "Portal", duration: 0 }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /lanzar/i }));
    const toastNode = screen.getByText("Portal").closest(".ig-toast");
    // El container del portal cuelga directamente del body (no del wrapper de RTL).
    expect(toastNode?.closest(".ig-toast-container")?.parentElement).toBe(
      document.body,
    );
  });
});

// M-11 (gate review): maxToasts FIFO eviction + dedupeBy.
describe("ToastProvider — M-11 maxToasts + dedupeBy", () => {
  // Buttons con prefijo 'btn-' para no colisionar con title del toast.
  function MultiTrigger() {
    const { toast } = useToast();
    return (
      <>
        <button onClick={() => toast({ title: "title-A" })}>btn-A</button>
        <button onClick={() => toast({ title: "title-B" })}>btn-B</button>
        <button onClick={() => toast({ title: "title-C" })}>btn-C</button>
      </>
    );
  }

  it("maxToasts={2}: tras 3 toast() solo 2 visibles, FIFO drop", () => {
    render(
      <ToastProvider container={null} maxToasts={2}>
        <MultiTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "btn-A" }));
    fireEvent.click(screen.getByRole("button", { name: "btn-B" }));
    fireEvent.click(screen.getByRole("button", { name: "btn-C" }));
    // title-A debe haberse desmontado (FIFO), title-B y title-C visibles.
    expect(screen.queryByText("title-A")).not.toBeInTheDocument();
    expect(screen.getByText("title-B")).toBeInTheDocument();
    expect(screen.getByText("title-C")).toBeInTheDocument();
  });

  it("maxToasts dispara onDismiss del toast dropeado", () => {
    const onDismissA = vi.fn();
    function CustomTrigger() {
      const { toast } = useToast();
      return (
        <>
          <button
            onClick={() =>
              toast({ title: "title-A", onDismiss: onDismissA, duration: 0 })
            }
          >
            btn-A
          </button>
          <button onClick={() => toast({ title: "title-B", duration: 0 })}>
            btn-B
          </button>
        </>
      );
    }
    render(
      <ToastProvider container={null} maxToasts={1}>
        <CustomTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "btn-A" }));
    expect(onDismissA).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "btn-B" }));
    // title-A fue evictado por maxToasts=1 → onDismiss disparado.
    expect(onDismissA).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("title-A")).not.toBeInTheDocument();
    expect(screen.getByText("title-B")).toBeInTheDocument();
  });

  it("dedupeBy: segundo toast con misma key se ignora, devuelve id existente", () => {
    let firstId = "";
    let secondId = "";
    function DedupeTrigger() {
      const { toast } = useToast();
      return (
        <>
          <button
            onClick={() => {
              firstId = toast({ title: "Save", variant: "success" });
            }}
          >
            first
          </button>
          <button
            onClick={() => {
              secondId = toast({ title: "Save", variant: "success" });
            }}
          >
            second
          </button>
        </>
      );
    }
    render(
      <ToastProvider
        container={null}
        dedupeBy={(t) =>
          // En los tests usamos title:string. ReactNode genérico no es
          // safe para template-stringificar, así que type-narrow.
          `${t.variant ?? ""}:${typeof t.title === "string" ? t.title : ""}`
        }
      >
        <DedupeTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "first" }));
    fireEvent.click(screen.getByRole("button", { name: "second" }));
    // Solo un toast visible.
    expect(screen.getAllByText("Save")).toHaveLength(1);
    // Y secondId === firstId (no hubo nueva inserción, devolvió existing).
    expect(secondId).toBe(firstId);
    expect(firstId).toBeTruthy();
  });

  // Codex P1 sobre PR #38: si el consumer hace `dismiss(id) +
  // toast(sameKey)` en el mismo tick, el toast nuevo DEBE insertarse
  // (no dedupe-skip contra una entry recién removida).
  it("dedupeBy: insert tras dismiss(sameKey) en mismo tick (codex P1)", () => {
    let firstId = "";
    let secondId = "";
    function ReplaceTrigger() {
      const { toast, dismiss } = useToast();
      return (
        <>
          <button
            onClick={() => {
              firstId = toast({ title: "Welcome" });
            }}
          >
            first
          </button>
          <button
            onClick={() => {
              dismiss(firstId);
              secondId = toast({ title: "Welcome" });
            }}
          >
            replace
          </button>
        </>
      );
    }
    render(
      <ToastProvider
        container={null}
        dedupeBy={(t) => (typeof t.title === "string" ? t.title : "")}
      >
        <ReplaceTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "first" }));
    fireEvent.click(screen.getByRole("button", { name: "replace" }));
    // Debe haber un toast "Welcome" visible (el nuevo, no el original).
    expect(screen.getAllByText("Welcome")).toHaveLength(1);
    // El segundo id NO debe ser el del primero (no fue dedupe-skip).
    expect(secondId).not.toBe(firstId);
    expect(secondId).toBeTruthy();
  });

  it("dedupeBy: claves distintas no se fusionan", () => {
    function VariedTrigger() {
      const { toast } = useToast();
      return (
        <>
          <button onClick={() => toast({ title: "A" })}>btn-a</button>
          <button onClick={() => toast({ title: "B" })}>btn-b</button>
        </>
      );
    }
    render(
      <ToastProvider
        container={null}
        dedupeBy={(t) => (typeof t.title === "string" ? t.title : "")}
      >
        <VariedTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "btn-a" }));
    fireEvent.click(screen.getByRole("button", { name: "btn-b" }));
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});

describe("ToastProvider — cleanup", () => {
  it("desmontar el provider limpia los timers pendientes", () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    function Trigger() {
      const { toast } = useToast();
      return (
        <button
          onClick={() => {
            toast({ title: "X", duration: 5000 });
          }}
        >
          go
        </button>
      );
    }

    const { unmount } = render(
      <ToastProvider container={null}>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    clearSpy.mockClear();
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
    vi.useRealTimers();
  });
});

describe("useToast fuera de provider", () => {
  it("lanza error al usar el hook sin <ToastProvider>", () => {
    function Boom() {
      useToast();
      return null;
    }
    // Suprime el error de React en consola para mantener el output limpio.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
