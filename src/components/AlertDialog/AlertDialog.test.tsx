import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "./index";

// D8 (beta.24): AlertDialog hereda la infraestructura de Dialog (D6).
// Tests aquí solo cubren las diferencias semánticas: role="alertdialog"
// + closeOnBackdrop=false default. La cobertura completa del compound
// está en Dialog.test.tsx (no replicamos para evitar drift).
describe("AlertDialog", () => {
  it("AlertDialogContent expone role=alertdialog (override del role=dialog automático)", () => {
    render(
      <AlertDialog open onOpenChange={vi.fn()}>
        <AlertDialogContent data-testid="m">
          <AlertDialogBody>x</AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByTestId("m")).toHaveAttribute("role", "alertdialog");
  });

  it("AlertDialogContent permite override del role por el consumer", () => {
    render(
      <AlertDialog open onOpenChange={vi.fn()}>
        <AlertDialogContent role="dialog" data-testid="m">
          <AlertDialogBody>x</AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByTestId("m")).toHaveAttribute("role", "dialog");
  });

  it("AlertDialogContent NO cierra al click en backdrop por defecto", () => {
    const onOpenChange = vi.fn();
    render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent data-testid="m">
          <AlertDialogBody>x</AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>,
    );
    fireEvent.click(screen.getByTestId("m"));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("AlertDialogContent permite override de closeOnBackdrop=true", () => {
    const onOpenChange = vi.fn();
    render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent closeOnBackdrop data-testid="m">
          <AlertDialogBody>x</AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>,
    );
    fireEvent.click(screen.getByTestId("m"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("AlertDialogTrigger es alias funcional de DialogTrigger (abre via context)", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(
      <AlertDialog defaultOpen={false}>
        <AlertDialogTrigger>Abrir</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogBody>x</AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(spy).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("AlertDialogClose cierra via context (igual que DialogClose)", async () => {
    const user = userEvent.setup();
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogBody>
            <AlertDialogClose>×</AlertDialogClose>
          </AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(closeSpy).toHaveBeenCalled();
    closeSpy.mockRestore();
  });

  it("Composición completa AlertDialog uncontrolled funciona end-to-end", async () => {
    const user = userEvent.setup();
    const showSpy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    render(
      <AlertDialog defaultOpen={false}>
        <AlertDialogTrigger>Borrar</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <h2>Confirmar borrado</h2>
          </AlertDialogHeader>
          <AlertDialogBody>Esta acción es irreversible.</AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogClose aria-label="Cancelar">Cancelar</AlertDialogClose>
            <AlertDialogClose aria-label="Sí, borrar">
              Sí, borrar
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    // Trigger abre.
    await user.click(screen.getByRole("button", { name: "Borrar" }));
    expect(showSpy).toHaveBeenCalledOnce();
    // Cancelar cierra (via context, sin onClick consumer).
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(closeSpy).toHaveBeenCalled();
    showSpy.mockRestore();
    closeSpy.mockRestore();
  });
});
