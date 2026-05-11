import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dialog } from "./Dialog";
import { DialogHeader } from "./DialogHeader";
import { DialogBody } from "./DialogBody";
import { DialogFooter } from "./DialogFooter";
import { DialogClose } from "./DialogClose";

describe("Dialog", () => {
  it("aplica ig-dialog y por defecto no añade clase de tamaño cuando size=md", () => {
    render(
      <Dialog open={false} data-testid="m">
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    expect(screen.getByTestId("m")).toHaveClass("ig-dialog");
  });

  describe.each(["sm", "lg", "xl", "full"] as const)("size=%s", (s) => {
    it(`aplica clase ig-dialog-${s}`, () => {
      render(
        <Dialog open={false} size={s} data-testid="m">
          <DialogBody>x</DialogBody>
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
        <Dialog open={false} backdrop={b} data-testid="m">
          <DialogBody>x</DialogBody>
        </Dialog>,
      );
      expect(screen.getByTestId("m")).toHaveClass(klass);
    });
  });

  it("llama showModal cuando open pasa a true", () => {
    const spy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const { rerender } = render(
      <Dialog open={false}>
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    expect(spy).not.toHaveBeenCalled();
    rerender(
      <Dialog open>
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("llama close cuando open pasa a false", () => {
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    const { rerender } = render(
      <Dialog open>
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    rerender(
      <Dialog open={false}>
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    expect(closeSpy).toHaveBeenCalled();
    closeSpy.mockRestore();
  });

  it("dispara onOpenChange cuando el dialog emite el evento close", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} data-testid="m">
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    fireEvent(screen.getByTestId("m"), new Event("close"));
    expect(onOpenChange).toHaveBeenCalledOnce();
  });

  it("dispara onOpenChange al click en el backdrop (target === dialog)", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} data-testid="m">
        <DialogBody>contenido</DialogBody>
      </Dialog>,
    );
    const dialog = screen.getByTestId("m");
    fireEvent.click(dialog); // click sobre el propio dialog (backdrop)
    expect(onOpenChange).toHaveBeenCalledOnce();
  });

  it("no dispara onOpenChange al click dentro del contenido", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogBody>
          <button>dentro</button>
        </DialogBody>
      </Dialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: /dentro/i }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closeOnBackdrop=false ignora click en el backdrop", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} closeOnBackdrop={false} data-testid="m">
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    fireEvent.click(screen.getByTestId("m"));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closeOnEsc=false bloquea el evento cancel", () => {
    render(
      <Dialog open closeOnEsc={false} data-testid="m">
        <DialogBody>x</DialogBody>
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
      <Dialog open={false} ref={ref}>
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDialogElement);
  });

  it("className merge: la clase del consumer se añade al <dialog>", () => {
    render(
      <Dialog open={false} className="my-modal extra" data-testid="m">
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    const dialog = screen.getByTestId("m");
    expect(dialog).toHaveClass("ig-dialog");
    expect(dialog).toHaveClass("my-modal");
    expect(dialog).toHaveClass("extra");
  });
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

  it("DialogClose renderiza × por defecto con aria-label Cerrar", () => {
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

  it("loading=true aplica ig-dialog-loading + aria-busy", () => {
    render(
      <Dialog open={false} loading data-testid="m">
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    const dialog = screen.getByTestId("m");
    expect(dialog).toHaveClass("ig-dialog-loading");
    expect(dialog).toHaveAttribute("aria-busy", "true");
  });

  it("loading=false NO aplica aria-busy", () => {
    render(
      <Dialog open={false} data-testid="m">
        <DialogBody>x</DialogBody>
      </Dialog>,
    );
    expect(screen.getByTestId("m")).not.toHaveAttribute("aria-busy");
  });

  it("DialogHeader registra su id en el dialog vía aria-labelledby", () => {
    render(
      <Dialog open={false} data-testid="m">
        <DialogHeader>
          <h2>Título</h2>
        </DialogHeader>
        <DialogBody>x</DialogBody>
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
      <Dialog open={false} aria-labelledby="custom-id" data-testid="m">
        <DialogHeader>
          <h2>Otro título</h2>
        </DialogHeader>
      </Dialog>,
    );
    expect(screen.getByTestId("m")).toHaveAttribute(
      "aria-labelledby",
      "custom-id",
    );
  });
});
