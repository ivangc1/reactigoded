import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardImage,
  CardDivider,
} from "./index";
import { Button } from "../Button";

const meta = {
  title: "Componentes/Card",
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          "Contenedor con variantes de color, modificadores (bordered/elevated/glass/interactive) y subcomponentes `CardHeader`, `CardBody`, `CardFooter`, `CardImage`, `CardDivider`.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        undefined,
        "brand",
        "secondary",
        "success",
        "warning",
        "danger",
        "info",
      ],
    },
    filled: { control: "boolean" },
    bordered: { control: "boolean" },
    elevated: { control: "boolean" },
    glass: { control: "boolean" },
    interactive: { control: "boolean" },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Card {...args} style={{ maxWidth: 320 }}>
      <CardBody>Contenido simple de la card.</CardBody>
    </Card>
  ),
};

export const Compuesta: Story = {
  render: () => (
    <Card style={{ maxWidth: 360 }} elevated>
      <CardHeader>
        <strong>Título de la card</strong>
      </CardHeader>
      <CardDivider />
      <CardBody>
        Aquí va el contenido. Puede tener varios párrafos, listas, etc.
      </CardBody>
      <CardFooter>
        <Button size="sm">Acción</Button>
      </CardFooter>
    </Card>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <Card variant="brand">
        <CardBody>brand (outline)</CardBody>
      </Card>
      <Card variant="success" filled>
        <CardBody>success filled</CardBody>
      </Card>
      <Card variant="danger" bordered>
        <CardBody>danger bordered</CardBody>
      </Card>
      <Card glass>
        <CardBody>glass</CardBody>
      </Card>
    </div>
  ),
};

export const ConImagen: Story = {
  render: () => (
    <Card style={{ maxWidth: 320 }} elevated>
      <CardImage
        src="https://placehold.co/600x300/png"
        alt="Placeholder"
        top
      />
      <CardBody>
        <strong>Card con imagen</strong>
        <p>La imagen `top` se ancla a las esquinas superiores.</p>
      </CardBody>
    </Card>
  ),
};

export const Interactiva: Story = {
  render: () => (
    <Card
      interactive
      elevated
      style={{ maxWidth: 320, cursor: "pointer" }}
      role="button"
      tabIndex={0}
      aria-label="Ir al detalle"
      onClick={() => {
        // demo
      }}
    >
      <CardBody>Hover y click me. Es focusable por teclado.</CardBody>
    </Card>
  ),
};
