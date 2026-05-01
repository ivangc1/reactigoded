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
          "Toggle de tema light/dark construido sobre `Switch`. Aplica `data-theme=\"light|dark\"` al `<html>` y persiste en `localStorage` bajo `\"theme\"` por defecto. SSR-safe (no toca DOM/storage durante el primer render). Soporta modo controlado (`theme`+`onThemeChange`) o uncontrolled (`defaultTheme`).",
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

export const Default: Story = { args: {} };

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

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story: "Modo controlado con `theme` y `onThemeChange`.",
      },
    },
  },
  render: () => {
    const ControlledExample = () => {
      const [theme, setTheme] = useState<Theme>("light");
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <ThemeSwitch
            theme={theme}
            onThemeChange={setTheme}
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "true");
  },
};
