import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./Textarea";

const meta = {
  title: "Componentes/Textarea",
  component: Textarea,
  parameters: {
    docs: {
      description: {
        component:
          "`<textarea>` estilizado con `auto` para auto-resize y estados de validación.",
      },
    },
  },
  argTypes: {
    auto: { control: "boolean" },
    state: { control: "select", options: ["default", "error", "success"] },
    disabled: { control: "boolean" },
    rows: { control: "number" },
  },
  args: {
    placeholder: "Escribe varias líneas…",
    rows: 4,
    state: "default",
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Auto: Story = {
  args: { auto: true, defaultValue: "Crece automáticamente al añadir texto." },
};

export const Estados: Story = {
  render: () => (
    <div className="ig-story-form">
      <Textarea aria-label="Default" placeholder="Default" rows={3} />
      <Textarea
        aria-label="Success"
        state="success"
        defaultValue="Texto válido"
        rows={3}
      />
      <Textarea
        aria-label="Error"
        state="error"
        defaultValue="Texto con errores"
        rows={3}
      />
    </div>
  ),
};
