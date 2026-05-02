import { useId } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Input } from "./Input";
import { Label } from "./Label";
import { Helper } from "./Helper";
import { ErrorText } from "./ErrorText";
import { InputGroup } from "./InputGroup";
import { InputAddon } from "./InputAddon";

const meta = {
  title: "Componentes/Input",
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          "`<input>` estilizado con tamaños y estados de validación. Combina con `Label`, `Helper`, `ErrorText`, `InputGroup` e `InputAddon` para formularios completos.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    state: { control: "select", options: ["default", "error", "success"] },
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search", "tel", "url"],
    },
    disabled: { control: "boolean" },
  },
  args: { placeholder: "Escribe aquí…", size: "md", state: "default" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Tamaños: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <Input size="sm" placeholder="Small" />
      <Input size="md" placeholder="Medium" />
      <Input size="lg" placeholder="Large" />
    </div>
  ),
};

export const Estados: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <Input placeholder="Default" />
      <Input state="success" placeholder="Success" defaultValue="Email válido" />
      <Input state="error" placeholder="Error" defaultValue="usuario@malformado" />
    </div>
  ),
};

export const Deshabilitado: Story = {
  args: { disabled: true, defaultValue: "No editable" },
};

export const TypeInteraction: Story = {
  args: { placeholder: "Escribe algo" },
  parameters: {
    docs: {
      description: {
        story:
          "Interaction test: tipear en un Input no controlado actualiza su `value` y dispara el evento `input` por cada tecla.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText<HTMLInputElement>("Escribe algo");
    await userEvent.type(input, "hola");
    await expect(input.value).toBe("hola");
  },
};

export const FormularioCompleto: Story = {
  render: () => (
    <div className="ig-story-form">
      <div>
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          aria-describedby="email-helper"
        />
        <Helper id="email-helper">
          Nunca compartiremos tu email con nadie.
        </Helper>
      </div>
      <div>
        <Label htmlFor="pwd" required>
          Contraseña
        </Label>
        <Input
          id="pwd"
          type="password"
          state="error"
          aria-describedby="pwd-error"
        />
        <ErrorText id="pwd-error">Mínimo 8 caracteres.</ErrorText>
      </div>
    </div>
  ),
};

export const ConDescribedBy: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Patrón recomendado para enlazar `Helper` y `ErrorText` con tecnologías asistivas: genera ids con `useId()` y pásalos a `describedBy` (string o array). El `Input` los concatena en `aria-describedby` automáticamente.",
      },
    },
  },
  render: () => {
    function Demo() {
      const helperId = useId();
      const errorId = useId();
      return (
        <div className="ig-story-form">
          <div>
            <Label htmlFor="user-email" required>
              Email
            </Label>
            <Input
              id="user-email"
              type="email"
              placeholder="tu@email.com"
              describedBy={[helperId, errorId]}
              state="error"
              defaultValue="bad@email"
            />
            <Helper id={helperId}>
              Lo usaremos solo para enviarte verificación.
            </Helper>
            <ErrorText id={errorId}>Email no válido.</ErrorText>
          </div>
        </div>
      );
    }
    return <Demo />;
  },
};

export const ConGrupo: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <InputGroup>
        <InputAddon>$</InputAddon>
        <Input type="number" placeholder="0.00" />
        <InputAddon>USD</InputAddon>
      </InputGroup>
      <InputGroup>
        <InputAddon>https://</InputAddon>
        <Input placeholder="midominio.com" />
      </InputGroup>
    </div>
  ),
};
