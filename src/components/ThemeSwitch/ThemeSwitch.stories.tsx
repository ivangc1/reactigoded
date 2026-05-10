import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ThemeSwitch } from "./index";
import type { Theme } from "@/hooks/useTheme";

const meta = {
  title: "Componentes/ThemeSwitch",
  component: ThemeSwitch,
  parameters: {
    docs: {
      description: {
        component:
          "Toggle de tema light/dark construido sobre `Switch`. Aplica `data-theme=\"light|dark\"` al `<html>` y persiste en `localStorage` bajo `\"theme\"` por defecto. SSR-safe (no toca DOM/storage durante el primer render). Soporta modo controlado (`theme`+`onValueChange`) o uncontrolled (`defaultTheme`).",
      },
    },
  },
  argTypes: {
    defaultTheme: { control: "radio", options: [undefined, "light", "dark"] },
    storageKey: { control: "text" },
    attribute: { control: "text" },
  },
} satisfies Meta<typeof ThemeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = { args: {} };

export const SinPersistencia: Story = {
  args: {
    storageKey: null,
    attribute: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          "`storageKey={null}` y `attribute={null}` desactivan el efecto sobre el DOM y localStorage; útil para previews aislados.",
      },
    },
  },
  render: (args) => <ThemeSwitch {...args} />,
};

export const Controlado: Story = {
  parameters: {
    docs: {
      description: {
        story: "Modo controlado con `theme` y `onValueChange`.",
      },
    },
  },
  render: () => {
    const ControlledExample = () => {
      const [theme, setTheme] = useState<Theme>("light");
      return (
        <div className="ig-story-stack ig-story-stack--full">
          <ThemeSwitch
            theme={theme}
            onValueChange={setTheme}
            storageKey={null}
            attribute={null}
          />
          <p>
            Tema actual: <strong>{theme}</strong>
          </p>
          <button
            type="button"
            onClick={() => {
              setTheme("light");
            }}
          >
            Forzar light
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme("dark");
            }}
          >
            Forzar dark
          </button>
        </div>
      );
    };
    return <ControlledExample />;
  },
};

export const LabelCustom: Story = {
  args: {
    storageKey: null,
    attribute: null,
    label: (theme) => (theme === "dark" ? "🌙 Modo oscuro" : "☀️ Modo claro"),
  },
};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--full">
      <ThemeSwitch storageKey={null} attribute={null} variant="brand" />
      <ThemeSwitch storageKey={null} attribute={null} variant="success" />
      <ThemeSwitch storageKey={null} attribute={null} variant="warning" />
      <ThemeSwitch storageKey={null} attribute={null} variant="danger" />
    </div>
  ),
};

export const ToggleInteraction: Story = {
  args: { storageKey: null, attribute: null, defaultTheme: "light" },
  parameters: {
    docs: {
      description: {
        story:
          "Click alterna `aria-checked` entre `false` y `true` (light → dark).",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sw = canvas.getByRole("switch");
    await expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    await expect(sw).toBeChecked();
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
    <div style={{ display: "grid", gap: "1rem", maxWidth: 320 }}>
      <ThemeSwitch
        defaultTheme="dark"
        storageKey={null}
        aria-label="ThemeSwitch dark default"
      />
      <ThemeSwitch
        defaultTheme="light"
        storageKey={null}
        aria-label="ThemeSwitch light default"
      />
      <ThemeSwitch
        defaultTheme="dark"
        storageKey={null}
        label={(t) => (t === "dark" ? "🌙 Oscuro" : "☀️ Claro")}
        aria-label="ThemeSwitch label función"
      />
      <ThemeSwitch
        defaultTheme="dark"
        storageKey={null}
        attribute={null}
        aria-label="ThemeSwitch sin attribute DOM"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const switches = canvasElement.querySelectorAll('[role="switch"]');
    await expect(switches.length).toBe(4);
  },
};
