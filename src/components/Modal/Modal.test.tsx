import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "./Modal";
import { ModalHeader } from "./ModalHeader";
import { ModalBody } from "./ModalBody";
import { ModalFooter } from "./ModalFooter";
import { ModalClose } from "./ModalClose";

describe("Modal", () => {
  it("aplica ig-dialog y por defecto no añade clase de tamaño cuando size=md", () => {
    render(
      <Modal open={false} data-testid="m">
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    expect(screen.getByTestId("m")).toHaveClass("ig-dialog");
  });

  describe.each(["sm", "lg", "xl", "full"] as const)("size=%s", (s) => {
    it(`aplica clase ig-dialog-${s}`, () => {
      render(
        <Modal open={false} size={s} data-testid="m">
          <ModalBody>x</ModalBody>
        </Modal>,
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
        <Modal open={false} backdrop={b} data-testid="m">
          <ModalBody>x</ModalBody>
        </Modal>,
      );
      expect(screen.getByTestId("m")).toHaveClass(klass);
    });
  });

  it("llama showModal cuando open pasa a true", () => {
    const spy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const { rerender } = render(
      <Modal open={false}>
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    expect(spy).not.toHaveBeenCalled();
    rerender(
      <Modal open>
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("llama close cuando open pasa a false", () => {
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    const { rerender } = render(
      <Modal open>
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    rerender(
      <Modal open={false}>
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    expect(closeSpy).toHaveBeenCalled();
    closeSpy.mockRestore();
  });

  it("dispara onOpenChange cuando el dialog emite el evento close", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} data-testid="m">
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    fireEvent(screen.getByTestId("m"), new Event("close"));
    expect(onOpenChange).toHaveBeenCalledOnce();
  });

  it("dispara onOpenChange al click en el backdrop (target === dialog)", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} data-testid="m">
        <ModalBody>contenido</ModalBody>
      </Modal>,
    );
    const dialog = screen.getByTestId("m");
    fireEvent.click(dialog); // click sobre el propio dialog (backdrop)
    expect(onOpenChange).toHaveBeenCalledOnce();
  });

  it("no dispara onOpenChange al click dentro del contenido", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange}>
        <ModalBody>
          <button>dentro</button>
        </ModalBody>
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button", { name: /dentro/i }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closeOnBackdrop=false ignora click en el backdrop", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} closeOnBackdrop={false} data-testid="m">
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId("m"));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closeOnEsc=false bloquea el evento cancel", () => {
    render(
      <Modal open closeOnEsc={false} data-testid="m">
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    const dialog = screen.getByTestId("m");
    const cancelEvent = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it("forwarda ref al <dialog>", () => {
    const ref = createRef<HTMLDialogElement>();
    render(
      <Modal open={false} ref={ref}>
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDialogElement);
  });

  it("className merge: la clase del consumer se añade al <dialog>", () => {
    render(
      <Modal open={false} className="my-modal extra" data-testid="m">
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    const dialog = screen.getByTestId("m");
    expect(dialog).toHaveClass("ig-dialog");
    expect(dialog).toHaveClass("my-modal");
    expect(dialog).toHaveClass("extra");
  });
});

describe("Modal subcomponents", () => {
  it("ModalHeader aplica ig-dialog-header", () => {
    render(<ModalHeader data-testid="h">t</ModalHeader>);
    expect(screen.getByTestId("h")).toHaveClass("ig-dialog-header");
  });

  it("ModalBody aplica ig-dialog-body", () => {
    render(<ModalBody data-testid="b">t</ModalBody>);
    expect(screen.getByTestId("b")).toHaveClass("ig-dialog-body");
  });

  it("ModalFooter aplica ig-dialog-footer", () => {
    render(<ModalFooter data-testid="f">t</ModalFooter>);
    expect(screen.getByTestId("f")).toHaveClass("ig-dialog-footer");
  });

  it("ModalClose renderiza × por defecto con aria-label Cerrar", () => {
    render(<ModalClose />);
    const btn = screen.getByRole("button", { name: /cerrar/i });
    expect(btn).toHaveTextContent("×");
    expect(btn).toHaveClass("ig-dialog-close");
  });

  it("ModalClose permite override de children y aria-label", () => {
    render(<ModalClose aria-label="Close">X</ModalClose>);
    const btn = screen.getByRole("button", { name: /close/i });
    expect(btn).toHaveTextContent("X");
  });

  it("loading=true aplica ig-dialog-loading + aria-busy", () => {
    render(
      <Modal open={false} loading data-testid="m">
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    const dialog = screen.getByTestId("m");
    expect(dialog).toHaveClass("ig-dialog-loading");
    expect(dialog).toHaveAttribute("aria-busy", "true");
  });

  it("loading=false NO aplica aria-busy", () => {
    render(
      <Modal open={false} data-testid="m">
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    expect(screen.getByTestId("m")).not.toHaveAttribute("aria-busy");
  });

  it("ModalHeader registra su id en el dialog vía aria-labelledby", () => {
    render(
      <Modal open={false} data-testid="m">
        <ModalHeader>
          <h2>Título</h2>
        </ModalHeader>
        <ModalBody>x</ModalBody>
      </Modal>,
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
      <Modal open={false} aria-labelledby="custom-id" data-testid="m">
        <ModalHeader>
          <h2>Otro título</h2>
        </ModalHeader>
      </Modal>,
    );
    expect(screen.getByTestId("m")).toHaveAttribute(
      "aria-labelledby",
      "custom-id",
    );
  });
});
