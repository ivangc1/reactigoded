import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionContent,
} from "./index";

const meta = {
  title: "Componentes/Accordion",
  component: Accordion,
  parameters: {
    docs: {
      description: {
        component:
          "Secciones colapsables compuestas: `Accordion` + `AccordionItem` + `AccordionHeader` + `AccordionContent`. Modo `single` (uno abierto, opcionalmente `collapsible`) o `multiple`. Headers con `aria-expanded`/`aria-controls`, panels con `role=\"region\"`. Keyboard nav: ↑/↓ ciclan entre headers, Home/End extremos; items `disabled` se saltan.",
      },
    },
  },
  argTypes: {
    type: { control: "radio", options: ["single", "multiple"] },
    collapsible: { control: "boolean" },
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: { type: "single", defaultValue: "a", collapsible: true },
  render: (args) => (
    <Accordion {...args}>
      <AccordionItem value="a">
        <AccordionHeader>¿Qué es reactigoded?</AccordionHeader>
        <AccordionContent>
          Una librería de componentes React tipados con un design system propio.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionHeader>¿Cómo se instala?</AccordionHeader>
        <AccordionContent>Próximamente como paquete npm privado.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="c">
        <AccordionHeader>¿Necesita Tailwind?</AccordionHeader>
        <AccordionContent>
          No, tiene su propio CSS (`igoded-design.css`).
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  args: { type: "multiple", defaultValue: ["a", "c"] },
  render: (args) => (
    <Accordion {...args}>
      <AccordionItem value="a">
        <AccordionHeader>Sección 1</AccordionHeader>
        <AccordionContent>Contenido de la primera sección.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionHeader>Sección 2</AccordionHeader>
        <AccordionContent>Contenido de la segunda sección.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="c">
        <AccordionHeader>Sección 3</AccordionHeader>
        <AccordionContent>Contenido de la tercera sección.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const ConDisabled: Story = {
  render: () => (
    <Accordion type="single" defaultValue="a" collapsible>
      <AccordionItem value="a">
        <AccordionHeader>Disponible</AccordionHeader>
        <AccordionContent>Este item está activo.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionHeader disabled>No disponible</AccordionHeader>
        <AccordionContent>No se llega aquí.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="c">
        <AccordionHeader>También disponible</AccordionHeader>
        <AccordionContent>Y este también.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Controlado: Story = {
  render: () => {
    const ControlledExample = () => {
      const [value, setValue] = useState<string | null>("b");
      return (
        <div className="ig-story-stack ig-story-stack--full">
          <div>
            Abierto: <strong>{value ?? "ninguno"}</strong>
          </div>
          <Accordion
            type="single"
            collapsible
            value={value}
            onValueChange={setValue}
          >
            <AccordionItem value="a">
              <AccordionHeader>Item A</AccordionHeader>
              <AccordionContent>Contenido A</AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionHeader>Item B</AccordionHeader>
              <AccordionContent>Contenido B</AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionHeader>Item C</AccordionHeader>
              <AccordionContent>Contenido C</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      );
    };
    return <ControlledExample />;
  },
};

export const SinIcono: Story = {
  render: () => (
    <Accordion type="single" defaultValue="a" collapsible>
      <AccordionItem value="a">
        <AccordionHeader hideIcon>Header sin icono</AccordionHeader>
        <AccordionContent>El icono ▼ se oculta con `hideIcon`.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionHeader icon="+">Header con icono custom</AccordionHeader>
        <AccordionContent>Se puede pasar cualquier ReactNode como `icon`.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Interaction: Story = {
  args: { type: "single", collapsible: true },
  parameters: {
    docs: {
      description: {
        story:
          "Click en un header expande el panel y aplica `aria-expanded=\"true\"`. Keyboard ↓ mueve foco al siguiente header.",
      },
    },
  },
  render: (args) => (
    <Accordion {...args}>
      <AccordionItem value="a">
        <AccordionHeader>Pregunta A</AccordionHeader>
        <AccordionContent>Respuesta A</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionHeader>Pregunta B</AccordionHeader>
        <AccordionContent>Respuesta B</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const headerA = canvas.getByRole("button", { name: "Pregunta A" });
    const headerB = canvas.getByRole("button", { name: "Pregunta B" });
    await expect(headerA).toHaveAttribute("aria-expanded", "false");

    // Click expande.
    await userEvent.click(headerA);
    await expect(headerA).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("Respuesta A")).toBeInTheDocument();

    // ↓ desde A mueve foco a B.
    headerA.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(headerB).toHaveFocus();
  },
};

export const AllStates: Story = {
  parameters: {
    layout: "padded",
    docs: { disable: true },
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  render: () => (
    <div style={{ display: "grid", gap: "2rem", maxWidth: 600 }}>
      <div>
        <strong>Single — collapsible</strong>
        <Accordion type="single" defaultValue="a" collapsible>
          <AccordionItem value="a">
            <AccordionHeader>Pregunta abierta</AccordionHeader>
            <AccordionContent>Respuesta visible.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionHeader>Pregunta cerrada</AccordionHeader>
            <AccordionContent>Respuesta oculta.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="c">
            <AccordionHeader>Otra pregunta</AccordionHeader>
            <AccordionContent>Otra respuesta.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div>
        <strong>Multiple — varios abiertos</strong>
        <Accordion type="multiple" defaultValue={["a", "c"]}>
          <AccordionItem value="a">
            <AccordionHeader>Sección A</AccordionHeader>
            <AccordionContent>Contenido A abierto.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionHeader>Sección B</AccordionHeader>
            <AccordionContent>Contenido B cerrado.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="c">
            <AccordionHeader>Sección C</AccordionHeader>
            <AccordionContent>Contenido C abierto.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const items = canvasElement.querySelectorAll(".ig-accordion-item");
    await expect(items.length).toBe(6);
    const open = canvasElement.querySelectorAll(".ig-accordion-item-open");
    await expect(open.length).toBe(3);
  },
};
