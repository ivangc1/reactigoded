import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./Dialog";
import { DialogContent } from "./DialogContent";
import { DialogTrigger } from "./DialogTrigger";
import { DialogHeader } from "./DialogHeader";
import { DialogBody } from "./DialogBody";
import { DialogFooter } from "./DialogFooter";
import { DialogClose } from "./DialogClose";

// D6 (beta.24): Dialog ahora es el Provider; el `<dialog>` real es
// DialogContent. Todos los tests usan el patrón compound canónico.
describe("DialogContent", () => {
  it("aplica ig-dialog y por defecto no añade clase de tamaño cuando size=md", () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent data-testid="m">
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByTestId("m")).toHaveClass("ig-dialog");
  });

  describe.each(["sm", "lg", "xl", "full"] as const)("size=%s", (s) => {
    it(`aplica clase ig-dialog-${s}`, () => {
      render(
        <Dialog open={false} onOpenChange={vi.fn()}>
          <DialogContent size={s} data-testid="m">
            <DialogBody>x</DialogBody>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByTestId("m")).toHaveClass(`ig-dialog-${s}`);
    });
  });

  describe.each([
    ["blur", "ig-dialog-backdrop-blur"],
    ["none", "ig-dialog-no-backdrop"],
  ] as const)("backdrop=%s", (b, klass) => {
    it(`aplica clase ${klass}`, () => {
      render(
        <Dialog open={false} onOpenChange={vi.fn()}>
          <DialogContent backdrop={b} data-testid="m">
            <DialogBody>x</DialogBody>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByTestId("m")).toHaveClass(klass);
    });
  });

  it("llama showModal cuando open pasa a true", () => {
    const spy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const { rerender } = render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(spy).not.toHaveBeenCalled();
    rerender(
      <Dialog open onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("llama close cuando open pasa a false", () => {
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    const { rerender } = render(
      <Dialog open onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    rerender(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(closeSpy).toHaveBeenCalled();
    closeSpy.mockRestore();
  });

  it("dispara onOpenChange cuando el dialog emite el evento close", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent data-testid="m">
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    fireEvent(screen.getByTestId("m"), new Event("close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("dispara onOpenChange al click en el backdrop (target === dialog)", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent data-testid="m">
          <DialogBody>contenido</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByTestId("m");
    fireEvent.click(dialog); // click sobre el propio dialog (backdrop)
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("no dispara onOpenChange al click dentro del contenido", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogBody>
            <button>dentro</button>
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: /dentro/i }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closeOnBackdrop=false ignora click en el backdrop", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent closeOnBackdrop={false} data-testid="m">
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    fireEvent.click(screen.getByTestId("m"));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  // H-02 (RC1 gate review): drag-out parity tracking. Mantenido en
  // DialogContent post-D6 refactor (la lógica del backdrop click vive
  // ahí ahora, no en el Provider).
  describe("H-02 drag-out parity", () => {
    it("pointerdown en contenido + pointerup en backdrop NO cierra (drag-out)", () => {
      const onOpenChange = vi.fn();
      render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent data-testid="m">
            <DialogBody>texto seleccionable largo</DialogBody>
          </DialogContent>
        </Dialog>,
      );
      const dialog = screen.getByTestId("m");
      const body = screen.getByText("texto seleccionable largo");
      fireEvent.pointerDown(body);
      fireEvent.pointerUp(dialog);
      fireEvent.click(dialog, { target: dialog });
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("backdrop click puro (pointerdown + click ambos en dialog) sigue cerrando", () => {
      const onOpenChange = vi.fn();
      render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent data-testid="m">
            <DialogBody>contenido</DialogBody>
          </DialogContent>
        </Dialog>,
      );
      const dialog = screen.getByTestId("m");
      fireEvent.pointerDown(dialog);
      fireEvent.click(dialog, { target: dialog });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    // Codex P2 sobre PR #72: consumer puede pasar onPointerDown/onClick;
    // los wrappers internos los chainean.
    it("chain consumer onPointerDown sin shadowearlo", () => {
      const consumerOnPointerDown = vi.fn();
      render(
        <Dialog open onOpenChange={vi.fn()}>
          <DialogContent
            onPointerDown={consumerOnPointerDown}
            data-testid="m"
          >
            <DialogBody>x</DialogBody>
          </DialogContent>
        </Dialog>,
      );
      fireEvent.pointerDown(screen.getByTestId("m"));
      expect(consumerOnPointerDown).toHaveBeenCalledOnce();
    });

    it("chain consumer onClick sin shadowearlo (cierra después)", () => {
      const consumerOnClick = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent onClick={consumerOnClick} data-testid="m">
            <DialogBody>x</DialogBody>
          </DialogContent>
        </Dialog>,
      );
      const dialog = screen.getByTestId("m");
      fireEvent.pointerDown(dialog);
      fireEvent.click(dialog, { target: dialog });
      expect(consumerOnClick).toHaveBeenCalledOnce();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("consumer onClick con preventDefault bloquea el close", () => {
      const onOpenChange = vi.fn();
      render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent
            onClick={(e) => {
              e.preventDefault();
            }}
            data-testid="m"
          >
            <DialogBody>x</DialogBody>
          </DialogContent>
        </Dialog>,
      );
      const dialog = screen.getByTestId("m");
      fireEvent.pointerDown(dialog);
      fireEvent.click(dialog, { target: dialog });
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("pointerdownTargetRef se resetea entre interacciones", () => {
      const onOpenChange = vi.fn();
      render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent data-testid="m">
            <DialogBody>texto</DialogBody>
          </DialogContent>
        </Dialog>,
      );
      const dialog = screen.getByTestId("m");
      const body = screen.getByText("texto");
      // Drag-out (no cierra).
      fireEvent.pointerDown(body);
      fireEvent.pointerUp(dialog);
      fireEvent.click(dialog, { target: dialog });
      expect(onOpenChange).not.toHaveBeenCalled();
      // Backdrop click puro tras reset.
      fireEvent.pointerDown(dialog);
      fireEvent.click(dialog, { target: dialog });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("closeOnEsc=false bloquea el evento cancel", () => {
    render(
      <Dialog open onOpenChange={vi.fn()}>
        <DialogContent closeOnEsc={false} data-testid="m">
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByTestId("m");
    const cancelEvent = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it("forwarda ref al <dialog>", () => {
    const ref = createRef<HTMLDialogElement>();
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent ref={ref}>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDialogElement);
  });

  it("className merge: la clase del consumer se añade al <dialog>", () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent className="my-modal extra" data-testid="m">
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByTestId("m");
    expect(dialog).toHaveClass("ig-dialog");
    expect(dialog).toHaveClass("my-modal");
    expect(dialog).toHaveClass("extra");
  });
});

// D6 (beta.24): nueva API. Tests específicos del Provider + compound.
describe("Dialog (Provider compound) — D6", () => {
  it("uncontrolled: defaultOpen=false arranca cerrado", () => {
    render(
      <Dialog defaultOpen={false}>
        <DialogContent data-testid="m">
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByTestId("m");
    expect(dialog).not.toHaveAttribute("open");
  });

  it("uncontrolled: defaultOpen=true arranca abierto", () => {
    const spy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("DialogTrigger abre el modal en uncontrolled (sin useState consumer)", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(
      <Dialog defaultOpen={false}>
        <DialogTrigger>Abrir</DialogTrigger>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(spy).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("DialogTrigger anuncia aria-haspopup=dialog + aria-controls", () => {
    render(
      <Dialog defaultOpen={false}>
        <DialogTrigger>Abrir</DialogTrigger>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Abrir" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls");
  });

  it("DialogTrigger.aria-expanded refleja open state", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen={false}>
        <DialogTrigger>Abrir</DialogTrigger>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Abrir" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("DialogClose cierra en uncontrolled vía contexto (sin onClick consumer)", async () => {
    const user = userEvent.setup();
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogBody>
            x
            <DialogClose>×</DialogClose>
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(closeSpy).toHaveBeenCalled();
    closeSpy.mockRestore();
  });

  it("DialogTrigger.onClick consumer con preventDefault NO abre", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(
      <Dialog defaultOpen={false}>
        <DialogTrigger
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          Abrir
        </DialogTrigger>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("controlled sigue funcionando con open + onOpenChange", () => {
    const onOpenChange = vi.fn();
    const spy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const { rerender } = render(
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(spy).not.toHaveBeenCalled();
    rerender(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  // El alias deprecated `onClose` sigue funcionando en 1.x (4 LOC en
  // `setOpen` wrapper de Dialog.tsx). El dev-warn cubre el migration
  // path; no añadimos test directo aquí para evitar eslint-disable
  // del rule `no-deprecated` — el behavior es trivial y la
  // deprecation visible en runtime.
});

describe("Dialog subcomponents", () => {
  it("DialogHeader aplica ig-dialog-header", () => {
    render(<DialogHeader data-testid="h">t</DialogHeader>);
    expect(screen.getByTestId("h")).toHaveClass("ig-dialog-header");
  });

  it("DialogBody aplica ig-dialog-body", () => {
    render(<DialogBody data-testid="b">t</DialogBody>);
    expect(screen.getByTestId("b")).toHaveClass("ig-dialog-body");
  });

  it("DialogFooter aplica ig-dialog-footer", () => {
    render(<DialogFooter data-testid="f">t</DialogFooter>);
    expect(screen.getByTestId("f")).toHaveClass("ig-dialog-footer");
  });

  it("DialogClose renderiza × por defecto con aria-label Cerrar (fuera de Dialog OK)", () => {
    render(<DialogClose />);
    const btn = screen.getByRole("button", { name: /cerrar/i });
    expect(btn).toHaveTextContent("×");
    expect(btn).toHaveClass("ig-dialog-close");
  });

  it("DialogClose permite override de children y aria-label", () => {
    render(<DialogClose aria-label="Close">X</DialogClose>);
    const btn = screen.getByRole("button", { name: /close/i });
    expect(btn).toHaveTextContent("X");
  });

  it("DialogClose.onClick consumer con preventDefault NO cierra el dialog", async () => {
    const user = userEvent.setup();
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogBody>
            <DialogClose
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              ×
            </DialogClose>
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(closeSpy).not.toHaveBeenCalled();
    closeSpy.mockRestore();
  });

  it("loading=true aplica ig-dialog-loading + aria-busy", () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent loading data-testid="m">
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByTestId("m");
    expect(dialog).toHaveClass("ig-dialog-loading");
    expect(dialog).toHaveAttribute("aria-busy", "true");
  });

  it("loading=false NO aplica aria-busy", () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent data-testid="m">
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByTestId("m")).not.toHaveAttribute("aria-busy");
  });

  it("DialogHeader registra su id en el dialog vía aria-labelledby", () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent data-testid="m">
          <DialogHeader>
            <h2>Título</h2>
          </DialogHeader>
          <DialogBody>x</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByTestId("m");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const header = document.getElementById(labelledBy ?? "");
    expect(header).not.toBeNull();
    expect(header).toHaveClass("ig-dialog-header");
  });

  it("aria-labelledby pasado por el consumer prevalece sobre el del header", () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent aria-labelledby="custom-id" data-testid="m">
          <DialogHeader>
            <h2>Otro título</h2>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByTestId("m")).toHaveAttribute(
      "aria-labelledby",
      "custom-id",
    );
  });
});
