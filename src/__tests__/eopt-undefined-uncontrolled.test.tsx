/**
 * EOPT widening — runtime safety net (#155 paso 5).
 *
 * Demuestra que pasar `undefined` a una prop controlled tras el
 * widening `?: T | undefined` enruta a uncontrolled mode para los 11
 * componentes con CLASE 2. La invariante depende de
 * `useControllableState.ts:221`: `isControlled = controlledValue !==
 * undefined`. Si el patrón degradara a `"prop" in props`, EOPT con
 * `cond ? val : undefined` rompería silenciosamente el modo. Esta
 * suite es el guardrail explícito contra esa regresión.
 *
 * No reemplaza los tests de cada componente; cubre solo la rama
 * "consumer pasa explicit `undefined`" que el codemod habilita.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionContent,
} from "@/components/Accordion";
import { Alert } from "@/components/Alert";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/Dialog";
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
} from "@/components/floating/Menu";
import { Pagination } from "@/components/Pagination";
import { Rating } from "@/components/Rating";
import { Sidebar, SidebarNav, SidebarItem } from "@/components/Sidebar";
import { Slider } from "@/components/Slider";
import { Stepper, Step } from "@/components/Stepper";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/Tabs";
import { ThemeToggle } from "@/components/ThemeToggle";

// EOPT consumer-shape: cond ? val : undefined. En todos los tests
// abajo, la condición es `false`, por lo que la prop CLASE 2 recibe
// `undefined`. Esperamos: el componente cambia internamente al
// interactuar (uncontrolled mode).

describe("EOPT widening runtime invariant — undefined routes to uncontrolled", () => {
  it("Accordion (single): value={undefined} → uncontrolled", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" value={undefined}>
        <AccordionItem value="a">
          <AccordionHeader>A</AccordionHeader>
          <AccordionContent>x</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const header = screen.getByRole("button", { name: "A" });
    expect(header).toHaveAttribute("aria-expanded", "false");
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
  });

  it("Accordion (multiple): value={undefined} → uncontrolled", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="multiple" value={undefined}>
        <AccordionItem value="a">
          <AccordionHeader>A</AccordionHeader>
          <AccordionContent>x</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const header = screen.getByRole("button", { name: "A" });
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
  });

  it("Alert: open={undefined} → uncontrolled (renderiza por default)", () => {
    render(<Alert open={undefined}>contenido</Alert>);
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("Dialog: open={undefined} → uncontrolled (trigger lo abre)", async () => {
    const user = userEvent.setup();
    render(
      <Dialog open={undefined}>
        <DialogTrigger>Abrir</DialogTrigger>
        <DialogContent>contenido modal</DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Abrir"));
    expect(screen.getByText("contenido modal")).toBeVisible();
  });

  it("Menu: open={undefined} → uncontrolled (trigger abre)", async () => {
    const user = userEvent.setup();
    render(
      <Menu open={undefined}>
        <MenuTrigger>Menú</MenuTrigger>
        <MenuContent>
          <MenuItem>Item A</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Menú"));
    expect(await screen.findByText("Item A")).toBeVisible();
  });

  it("Pagination: page={undefined} → uncontrolled (click cambia interna)", async () => {
    const user = userEvent.setup();
    render(<Pagination page={undefined} totalPages={5} />);
    const next = screen.getByRole("button", { name: /siguiente/i });
    await user.click(next);
    expect(
      screen.getByRole("button", { name: "Página 2" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("Rating: value={undefined} → uncontrolled (click cambia interna)", async () => {
    const user = userEvent.setup();
    render(<Rating value={undefined} max={5} />);
    const radios = screen.getAllByRole("radio");
    await user.click(radios[2]!);
    expect(radios[2]).toBeChecked();
  });

  it("Sidebar: collapsed={undefined} → uncontrolled (no crashea)", () => {
    render(
      <Sidebar collapsed={undefined}>
        <SidebarNav>
          <SidebarItem>i</SidebarItem>
        </SidebarNav>
      </Sidebar>,
    );
    expect(screen.getByText("i")).toBeInTheDocument();
  });

  it("Slider: onValueChange={undefined} → no crashea sin handler", () => {
    render(
      <Slider
        onValueChange={undefined}
        defaultValue={50}
        aria-label="Volumen"
      />,
    );
    expect(screen.getByLabelText<HTMLInputElement>("Volumen").value).toBe("50");
  });

  it("Stepper: active={undefined} → uncontrolled (defaults a 0, renderiza role group)", () => {
    render(
      <Stepper active={undefined}>
        <Step />
        <Step />
      </Stepper>,
    );
    expect(screen.getByRole("group", { name: "Progreso" })).toBeInTheDocument();
  });

  it("Tabs: value={undefined} → uncontrolled (click cambia interna)", async () => {
    const user = userEvent.setup();
    render(
      <Tabs value={undefined} defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">contenido A</TabsContent>
        <TabsContent value="b">contenido B</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByText("contenido B")).toBeVisible();
  });

  it("ThemeToggle: theme={undefined} → uncontrolled (renderiza switch)", () => {
    render(<ThemeToggle theme={undefined} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  // Dialog.onClose — file-scoped CLASE 2. Cobertura runtime se omite
  // a propósito: `onClose` está @deprecated (B-02) y la regla lint
  // `@typescript-eslint/no-deprecated` rechaza el uso desde consumer
  // surface. La semántica del widening
  // (`onClose={undefined}` no rompe `isPresentationalControlled`)
  // queda cubierta por:
  //   1. Consumer-pack fixture `Class2_DialogOnClose` — verifica que
  //      `<Dialog onClose={maybe}>` compila bajo EOPT post-widening
  //      (rojo pre-widening fue TS2375 sobre onClose, ahora verde).
  //   2. Tests existentes de Dialog en `Dialog.test.tsx` cubren la
  //      ruta `isControlled && onOpenChange === undefined && onClose
  //      === undefined` con `onClose` omitido — equivalente runtime
  //      a `onClose={undefined}` tras el check `!== undefined` del
  //      hook (la rama del discriminator se evalúa idéntica).
});
