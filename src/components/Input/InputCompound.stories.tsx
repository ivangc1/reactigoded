import { useId } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Input } from "./Input";
import { Label } from "./Label";
import { Helper } from "./Helper";
import { ErrorText } from "./ErrorText";
import { InputGroup } from "./InputGroup";
import { InputAddon } from "./InputAddon";

const meta = {
  title: "Componentes/Input/Compound",
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          "Composición completa del Input con `Label`, `Helper`, `ErrorText`, `InputGroup` y `InputAddon`. Cubre formularios reales con validación y addons.",
      },
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

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
  render: () => {
    // Cada Input tiene Label asociado vía htmlFor (resuelto con useId)
    // o aria-label como fallback. Cumple axe rule label.
    const id1 = useId();
    const help1 = useId();
    const id2 = useId();
    const err2 = useId();
    const id3 = useId();
    const id4 = useId();
    return (
      <div style={{ display: "grid", gap: "1.5rem", maxWidth: 500 }}>
        <div>
          <Label htmlFor={id1}>Email</Label>
          <Input
            id={id1}
            type="email"
            placeholder="tu@email.com"
            describedBy={help1}
          />
          <Helper id={help1}>Nunca compartiremos tu email.</Helper>
        </div>
        <div>
          <Label htmlFor={id2} required>
            Contraseña
          </Label>
          <Input
            id={id2}
            type="password"
            state="invalid"
            describedBy={err2}
          />
          <ErrorText id={err2}>
            La contraseña debe tener al menos 8 caracteres.
          </ErrorText>
        </div>
        <div>
          <Label htmlFor={id3}>Sitio web</Label>
          <InputGroup>
            <InputAddon>https://</InputAddon>
            <Input id={id3} placeholder="midominio.com" />
            <InputAddon>.es</InputAddon>
          </InputGroup>
        </div>
        <div>
          <Label htmlFor={id4}>Búsqueda</Label>
          <InputGroup>
            <InputAddon>🔍</InputAddon>
            <Input id={id4} placeholder="Buscar productos…" />
          </InputGroup>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const inputs = canvasElement.querySelectorAll("input");
    await expect(inputs.length).toBeGreaterThanOrEqual(4);
  },
};
