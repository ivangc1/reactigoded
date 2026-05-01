import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Toast } from "./Toast";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./ToastContext";

describe("Toast — primitivo", () => {
  it("aplica ig-toast y NO añade clase de variant cuando variant=default", () => {
    const { container } = render(<Toast title="x" />);
    const node = container.querySelector(".ig-toast");
    expect(node).not.toBeNull();
    expect(node?.className).not.toMatch(/ig-toast-(success|warning|danger|info|brand|secondary|default)/);
  });

  it("aplica clase de variant cuando es != default", () => {
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

  it("default variant no muestra icono salvo override explícito", () => {
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
