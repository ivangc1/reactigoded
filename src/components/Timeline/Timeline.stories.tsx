import type { Meta, StoryObj } from "@storybook/react-vite";
import { Timeline, TimelineItem } from "./index";

const meta = {
  title: "Componentes/Timeline",
  component: Timeline,
  parameters: {
    docs: {
      description: {
        component:
          "Lista vertical de eventos. `Timeline` actúa como `role=\"list\"` y `TimelineItem` como `role=\"listitem\"`. El item soporta `date` + `title` + `description` o cualquier `children`. Los puntos tienen variantes de color (`brand`, `success`, `warning`, `danger`...).",
      },
    },
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { ariaLabel: "Historial de proyecto" },
  render: (args) => (
    <Timeline {...args}>
      <TimelineItem
        date="15 Nov 2024"
        title="Inicio del proyecto"
        description="Se aprueba el alcance y se planifica el primer sprint."
      />
      <TimelineItem
        date="01 Dic 2024"
        title="MVP en producción"
        description="Despliegue inicial detrás de feature flag."
        dotVariant="success"
      />
      <TimelineItem
        date="22 Dic 2024"
        title="Incidente de latencia"
        description="Mitigación con rollback parcial."
        dotVariant="warning"
      />
      <TimelineItem
        date="14 Ene 2025"
        title="Rollout completo"
        description="Activación al 100% de tráfico."
        dotVariant="brand"
      />
    </Timeline>
  ),
};

export const ConIconosEnElPunto: Story = {
  render: () => (
    <Timeline ariaLabel="Pasos">
      <TimelineItem
        date="Paso 1"
        title="Configurar entorno"
        description="Instalar dependencias y variables."
        dotContent={
          <span style={{ fontSize: "0.6rem", color: "#fff" }}>1</span>
        }
        dotVariant="brand"
      />
      <TimelineItem
        date="Paso 2"
        title="Ejecutar migraciones"
        description="Prisma + datos iniciales."
        dotContent={
          <span style={{ fontSize: "0.6rem", color: "#fff" }}>2</span>
        }
        dotVariant="brand"
      />
      <TimelineItem
        date="Paso 3"
        title="Verificar"
        description="Healthcheck y smoke tests."
        dotContent={
          <span style={{ fontSize: "0.6rem", color: "#fff" }}>3</span>
        }
        dotVariant="success"
      />
    </Timeline>
  ),
};

export const ContenidoCustom: Story = {
  render: () => (
    <Timeline ariaLabel="Versiones">
      <TimelineItem dotVariant="brand">
        <div className="ig-timeline-date">v1.2.0 — 20 Ene 2025</div>
        <div className="ig-timeline-title">Soporte multi-idioma</div>
        <ul style={{ marginTop: "0.25rem", paddingLeft: "1rem" }}>
          <li>EN, ES, FR</li>
          <li>Detección automática</li>
        </ul>
      </TimelineItem>
      <TimelineItem dotVariant="secondary">
        <div className="ig-timeline-date">v1.1.0 — 02 Ene 2025</div>
        <div className="ig-timeline-title">Mejoras de rendimiento</div>
      </TimelineItem>
    </Timeline>
  ),
};

export const TodasLasVariantes: Story = {
  render: () => (
    <Timeline ariaLabel="Variantes">
      <TimelineItem date="default" title="Default" dotVariant="default" />
      <TimelineItem date="brand" title="Brand" dotVariant="brand" />
      <TimelineItem date="secondary" title="Secondary" dotVariant="secondary" />
      <TimelineItem date="success" title="Success" dotVariant="success" />
      <TimelineItem date="warning" title="Warning" dotVariant="warning" />
      <TimelineItem date="danger" title="Danger" dotVariant="danger" />
      <TimelineItem date="info" title="Info" dotVariant="info" />
    </Timeline>
  ),
};
