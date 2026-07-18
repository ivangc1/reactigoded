import { describe, it, expect, vi } from "vitest";
import { allowIncidentalConsoleError } from "@/test-utils/allowIncidentalConsoleError";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Alert } from "./Alert";

// #28 cat 3 — dev-warning de useControllableState (Alert controla `open` sin
// onChange en los tests de modo controlado); su contrato se testea en
// useControllableState.test.ts, aquí es incidental → suprimimos SOLO ese
// patrón; cualquier otro console.error/warn sigue fallando.
allowIncidentalConsoleError(/^\[useControllableState\]/);

describe("Alert", () => {
  it("renderiza con role=status y aria-live=polite por defecto (info)", () => {
    render(<Alert>Mensaje informativo</Alert>);
    const el = screen.getByRole("status");
    expect(el).toHaveClass("ig-alert", "ig-alert-info");
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it("usa role=alert + aria-live=assertive para variant danger", () => {
    render(<Alert variant="danger">Algo falló</Alert>);
    const el = screen.getByRole("alert");
    expect(el).toHaveClass("ig-alert-danger");
    expect(el).toHaveAttribute("aria-live", "assertive");
  });

  it("usa role=alert también para variant warning", () => {
    render(<Alert variant="warning">Cuidado</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("ig-alert-warning");
  });

  it("renderiza title y description", () => {
    render(<Alert title="Cabecera">Detalle</Alert>);
    expect(screen.getByText("Cabecera")).toHaveClass("ig-alert-title");
    expect(screen.getByText("Detalle")).toHaveClass("ig-alert-description");
  });

  it("dismissible cierra al pulsar el botón (no controlado)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Alert dismissible onClose={onClose}>
        Adiós
      </Alert>,
    );
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("modo controlado: open=false oculta", () => {
    render(
      <Alert open={false} dismissible>
        Hola
      </Alert>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("modo controlado: no oculta solo aunque pulses cerrar (delegado al consumidor)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Alert open dismissible onClose={onClose}>
        x
      </Alert>,
    );
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("forwarda ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Alert ref={ref}>x</Alert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("defaultOpen=false oculta el alert al render inicial (uncontrolled)", () => {
    render(<Alert defaultOpen={false}>oculto</Alert>);
    expect(screen.queryByText("oculto")).not.toBeInTheDocument();
  });

  it("onOpenChange(false) se dispara al pulsar cerrar (uncontrolled)", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Alert dismissible onOpenChange={onOpenChange}>
        Mensaje
      </Alert>,
    );
    await user.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText("Mensaje")).not.toBeInTheDocument();
  });

  it("modo controlado: open=true muestra; reabrir tras cerrar requiere setear open=true", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <Alert dismissible open onOpenChange={onOpenChange}>
        Hola
      </Alert>,
    );
    await user.click(screen.getByRole("button", { name: /cerrar/i }));
    // Como es controlado, solo dispara callback; el alert sigue abierto.
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByText("Hola")).toBeInTheDocument();
    // Solo el consumer puede cerrarlo cambiando open.
    rerender(
      <Alert dismissible open={false} onOpenChange={onOpenChange}>
        Hola
      </Alert>,
    );
    expect(screen.queryByText("Hola")).not.toBeInTheDocument();
  });
});
