import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardImage,
  CardDivider,
} from "./index";
import { Button } from "@/components/Button";

// Imagen de demo embebida (data URI SVG, gradiente Vitreus→Axis con un patrón
// ligero). Sin placehold.co — sin dependencias externas en el catálogo.
const demoImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">` +
      `<defs>` +
        `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
          `<stop offset="0%" stop-color="#3ae2f7"/>` +
          `<stop offset="100%" stop-color="#d2bff7"/>` +
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
    <Card {...args} className="ig-story-card-md">
      <CardBody>Contenido simple de la card.</CardBody>
    </Card>
  ),
};

export const Compuesta: Story = {
  render: () => (
    <Card className="ig-story-card-lg" elevated>
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
    <Card className="ig-story-card-md" elevated>
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
      className="ig-story-card-md"
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

export const Polimorfica: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`Card` acepta la prop `as` para renderear cualquier elemento HTML o componente. Útil para cards semánticas (`as=\"article\"`), links nativos (`as=\"a\"`) o componentes de routing (`as={Link}` con react-router/next). Las props específicas del elemento subyacente (`href`, `to`, etc.) se tipan automáticamente vía genéricos TS.",
      },
    },
  },
  render: () => (
    <div className="ig-story-stack ig-story-stack--md">
      <Card as="article" elevated className="ig-story-card-md">
        <CardHeader title="as='article'" />
        <CardBody>
          Renderea un &lt;article&gt; con clase ig-card. Ideal para listas
          de posts, recetas, productos.
        </CardBody>
      </Card>
      <Card
        as="a"
        href="#polimorfica"
        interactive
        bordered
        className="ig-story-card-md"
      >
        <CardHeader title="as='a' href" />
        <CardBody>
          Link nativo con apariencia de card. Activa por click + Enter/Space
          sin necesidad de role='button' (el navegador lo hace).
        </CardBody>
      </Card>
      <Card
        as="section"
        variant="brand"
        appearance="filled"
        className="ig-story-card-md"
      >
        <CardHeader title="as='section' brand filled" />
        <CardBody>
          Cualquier elemento HTML. Las variants y modificadores siguen
          aplicando.
        </CardBody>
      </Card>
    </div>
  ),
};

export const FocusVisibleInteractive: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Captura el contraste focus-visible sobre fondos de variant brand activa. Story con `play()` que dispara foco programático para que axe evalúe el ring de focus contra el fondo. Cierra capa 2.2 del debt doc — `focus-visible` sobre Card brand activa era zona ciega de los gates pre-RC1.",
      },
    },
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  render: () => (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 320 }}>
      <Card
        interactive
        role="button"
        tabIndex={0}
        variant="brand"
        appearance="filled"
        aria-label="Card brand activa"
        data-testid="card-focus-target"
      >
        <CardBody>Foco con Tab para ver el ring</CardBody>
      </Card>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<HTMLElement>(
      '[data-testid="card-focus-target"]',
    );
    el?.focus();
    // Pequeño delay para que el browser pinte el focus ring antes de
    // que axe lo evalúe.
    await new Promise((r) => setTimeout(r, 50));
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
    <div
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(2, 1fr)",
      }}
    >
      {(
        ["brand", "secondary", "success", "warning", "danger", "info"] as const
      ).map((v) => (
        <div key={v} style={{ display: "grid", gap: "0.5rem" }}>
          <Card variant={v}>
            <CardBody>{v} default</CardBody>
          </Card>
          <Card variant={v} appearance="filled">
            <CardBody>{v} filled</CardBody>
          </Card>
          <Card variant={v} bordered elevated>
            <CardBody>{v} bordered+elevated</CardBody>
          </Card>
          <Card variant={v} glass>
            <CardBody>{v} glass</CardBody>
          </Card>
        </div>
      ))}
      <Card interactive role="button" onClick={() => {}}>
        <CardBody>interactive</CardBody>
      </Card>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const cards = canvasElement.querySelectorAll(".ig-card");
    await expect(cards.length).toBeGreaterThan(20);
  },
};
