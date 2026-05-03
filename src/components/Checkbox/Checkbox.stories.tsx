import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Componentes/Checkbox",
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component:
          "`<input type=\"checkbox\">` con marca visual custom. 6 colores semánticos cuando está marcado.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["brand", "secondary", "success", "warning", "danger", "info"],
    },
    disabled: { control: "boolean" },
    onChange: { action: "change" },
  },
  args: { children: "Acepto los términos", variant: "brand", onChange: fn() },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Marcado: Story = {
  args: { defaultChecked: true },
};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--sm">
      {(
        ["brand", "secondary", "success", "warning", "danger", "info"] as const
      ).map((v) => (
        <Checkbox key={v} variant={v} defaultChecked>
          {v}
        </Checkbox>
      ))}
    </div>
  ),
};

export const Deshabilitado: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const Indeterminate: Story = {
  args: { children: "Selección parcial", indeterminate: true },
  parameters: {
    docs: {
      description: {
        story:
          "Estado visual aislado. El click no cambia nada porque el componente mantiene `indeterminate=true` en cada render — el padre decide cuándo salir. Para ver el patrón típico de uso, mira `MasterSelectAll`.",
      },
    },
  },
};

/**
 * Patrón canónico de indeterminate: un checkbox "maestro" controla un
 * grupo de hijos. El maestro se calcula a partir del estado de los
 * hijos: ninguno → unchecked, todos → checked, algunos → indeterminate.
 *
 * Click en el maestro marca o desmarca todos. Click en un hijo recalcula
 * el maestro automáticamente.
 *
 * Esto es lo que hacen GitHub (lista de issues), Gmail (bandeja),
 * Material UI checkbox group, Ant Design Tree, etc. — el indeterminate
 * NO es un tercer estado del toggle, es una etiqueta visual derivada.
 */
export const MasterSelectAll: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Patrón típico: maestro + hijos. El estado `indeterminate` se deriva del estado de los hijos (algunos sí, algunos no). Click en el maestro marca/desmarca todos.",
      },
    },
  },
  render: () => {
    type Items = { docs: boolean; tests: boolean; coverage: boolean };
    const Demo = () => {
      const [items, setItems] = useState<Items>({
        docs: true,
        tests: false,
        coverage: false,
      });
      const values = Object.values(items);
      const all = values.every(Boolean);
      const some = values.some(Boolean);
      const indeterminate = some && !all;

      const toggleAll = () => {
        const next = !all;
        setItems({ docs: next, tests: next, coverage: next });
      };

      const toggleOne = (k: keyof Items) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setItems((prev) => ({ ...prev, [k]: e.target.checked }));
      };

      return (
        <div className="ig-story-stack ig-story-stack--md">
          <Checkbox
            checked={all}
            indeterminate={indeterminate}
            onChange={toggleAll}
          >
            <strong>Todos los checks</strong>
          </Checkbox>
          <div
            className="ig-story-stack ig-story-stack--sm"
            style={{ paddingLeft: "1.5rem" }}
          >
            <Checkbox checked={items.docs} onChange={toggleOne("docs")}>
              Docs
            </Checkbox>
            <Checkbox checked={items.tests} onChange={toggleOne("tests")}>
              Tests
            </Checkbox>
            <Checkbox checked={items.coverage} onChange={toggleOne("coverage")}>
              Coverage
            </Checkbox>
          </div>
        </div>
      );
    };
    return <Demo />;
  },
};

export const ToggleInteraction: Story = {
  args: { children: "Acepto" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("checkbox", { name: "Acepto" });
    await expect(input).not.toBeChecked();
    await userEvent.click(input);
    await expect(input).toBeChecked();
    await expect(args.onChange).toHaveBeenCalled();
  },
};
