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

// Imagen de demo embebida (data URI SVG, gradiente Vitreus→Axis con un patrón
// ligero). Sin placehold.co — sin dependencias externas en el catálogo.
const demoImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">` +
      `<defs>` +
        `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
          `<stop offset="0%" stop-color="#5eded5"/>` +
          `<stop offset="100%" stop-color="#d4c2f9"/>` +
        `</linearGradient>` +
        `<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse">` +
          `<circle cx="20" cy="20" r="1.2" fill="#0c1515" opacity="0.18"/>` +
        `</pattern>` +
      `</defs>` +
      `<rect width="600" height="300" fill="url(#g)"/>` +
      `<rect width="600" height="300" fill="url(#p)"/>` +
    `</svg>`,
  );

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
    appearance: {
      control: "select",
      options: ["outline", "filled"],
      table: { defaultValue: { summary: "outline" } },
    },
    bordered: { control: "boolean" },
    elevated: { control: "boolean" },
    glass: { control: "boolean" },
    interactive: { control: "boolean" },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
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

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <Card variant="brand">
        <CardBody>brand (outline)</CardBody>
      </Card>
      <Card variant="success" appearance="filled">
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
      <CardImage src={demoImage} alt="Decorativa" top />
      <CardBody>
        <strong>Card con imagen</strong>
        <p>La imagen `top` se ancla a las esquinas superiores.</p>
      </CardBody>
    </Card>
  ),
};

export const Interactiva: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Cuando `interactive` + `role=\"button\"` + `onClick` están presentes, la card activa **Enter / Space** automáticamente como un `<button>` nativo. Sigue siendo el consumer quien decide si la card se comporta como botón (tu `tabIndex={0}` y tu `aria-label`).",
      },
    },
  },
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
      <CardBody>Click, Enter o Space para activar. Es focusable por teclado.</CardBody>
    </Card>
  ),
};
