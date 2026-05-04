import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Switch } from "./Switch";
import { MatrixGrid, type Variant } from "../../stories/_matrix";

const meta = {
  title: "Componentes/Switch",
  component: Switch,
  parameters: {
    docs: {
      description: {
        component:
          "Toggle accesible. `<input type=\"checkbox\" role=\"switch\" aria-checked>` envuelto en `<label>` con pista visual decorativa.",
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
  args: { children: "Notificaciones", variant: "brand", onChange: fn() },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--sm">
      {(
        ["brand", "secondary", "success", "warning", "danger", "info"] as const
      ).map((v) => (
        <Switch key={v} variant={v} defaultChecked>
          {v}
        </Switch>
      ))}
    </div>
  ),
};

export const Deshabilitado: Story = {
  args: { disabled: true, defaultChecked: true },
};

/**
 * Patrón canónico de indeterminate en switches: un toggle "maestro" controla
 * un grupo de toggles hijos. El maestro se calcula a partir del estado de
 * los hijos: ninguno → off, todos → on, algunos → indeterminate.
 *
 * Caso típico: "Notificaciones" como master, con sub-categorías
 * (email, push, SMS) como hijos. Click en el master enciende/apaga todas;
 * click en una sub-categoría recalcula el master automáticamente.
 */
export const MasterSelectAll: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Patrón típico: toggle maestro + toggles hijos. El estado `indeterminate` se deriva del estado de los hijos (algunos on, algunos off). Click en el maestro enciende/apaga todos.",
      },
    },
  },
  render: () => {
    type Channels = { email: boolean; push: boolean; sms: boolean };
    const Demo = () => {
      const [channels, setChannels] = useState<Channels>({
        email: true,
        push: false,
        sms: false,
      });
      const values = Object.values(channels);
      const all = values.every(Boolean);
      const some = values.some(Boolean);
      const indeterminate = some && !all;

      const toggleAll = () => {
        const next = !all;
        setChannels({ email: next, push: next, sms: next });
      };

      const toggleOne = (k: keyof Channels) => (
        e: React.ChangeEvent<HTMLInputElement>,
      ) => {
        setChannels((prev) => ({ ...prev, [k]: e.target.checked }));
      };

      return (
        <div className="ig-story-stack ig-story-stack--md">
          <Switch
            checked={all}
            indeterminate={indeterminate}
            onChange={toggleAll}
          >
            <strong>Notificaciones</strong>
          </Switch>
          <div
            className="ig-story-stack ig-story-stack--sm"
            style={{ paddingLeft: "1.5rem" }}
          >
            <Switch checked={channels.email} onChange={toggleOne("email")}>
              Email
            </Switch>
            <Switch checked={channels.push} onChange={toggleOne("push")}>
              Push
            </Switch>
            <Switch checked={channels.sms} onChange={toggleOne("sms")}>
              SMS
            </Switch>
          </div>
        </div>
      );
    };
    return <Demo />;
  },
};

export const Controlado: Story = {
  render: () => {
    function Demo() {
      const [on, setOn] = useState(false);
      return (
        <Switch
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
          }}
        >
          {on ? "Activado" : "Desactivado"}
        </Switch>
      );
    }
    return <Demo />;
  },
};

export const ToggleInteraction: Story = {
  args: { children: "Habilitar" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("switch");
    await expect(input).not.toBeChecked();
    await userEvent.click(input);
    await expect(args.onChange).toHaveBeenCalled();
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
    <MatrixGrid
      renderRow={(v) => (
        <>
          <Switch variant={v as Variant}>off</Switch>
          <Switch variant={v as Variant} defaultChecked>
            on
          </Switch>
          <Switch variant={v as Variant} indeterminate>
            indeterminate
          </Switch>
          <Switch variant={v as Variant} disabled>
            disabled
          </Switch>
        </>
      )}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switches = canvas.queryAllByRole("switch");
    await expect(switches.length).toBeGreaterThan(12);
  },
};
