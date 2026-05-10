import { useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Tooltip } from "./Tooltip";
import { Button } from "@/components/Button";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalFooter,
  ModalHeader,
} from "@/components/Modal";

const meta = {
  title: "Componentes/Tooltip",
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component:
          "Tooltip flotante con `@floating-ui/react`: posiciona el contenedor con `autoUpdate` + middlewares `flip` / `offset` / `shift`, monta en `<FloatingPortal>` y orquesta apertura por hover/focus + dismiss (Esc, outside click) vía `useInteractions`. Para a11y siempre inyecta `aria-describedby` apuntando a un `<span role=\"tooltip\">` sr-only adyacente al trigger — la descripción queda accesible al SR incluso antes de abrir el portal visual.",
      },
    },
  },
  argTypes: {
    text: { control: "text" },
    placement: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
    },
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
  },
  args: {
    text: "Texto del tooltip",
    placement: "top",
    children: <Button>Hover me</Button>,
  },
  // El tooltip flota fuera del trigger; necesita espacio en todos los lados
  // para no recortarse contra el borde del iframe. `ig-story-frame` aporta
  // padding generoso + min-height + un marco discreto.
  decorators: [
    (Story) => (
      <div className="ig-story-frame">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <Button>Hover me</Button>
    </Tooltip>
  ),
};

export const Placements: Story = {
  decorators: [
    (Story) => (
      <div className="ig-story-frame ig-story-frame--lg">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="ig-story-row ig-story-row--gap-lg">
      <Tooltip text="Arriba" placement="top">
        <Button variant="secondary">top</Button>
      </Tooltip>
      <Tooltip text="Abajo" placement="bottom">
        <Button variant="secondary">bottom</Button>
      </Tooltip>
      <Tooltip text="Izquierda" placement="left">
        <Button variant="secondary">left</Button>
      </Tooltip>
      <Tooltip text="Derecha" placement="right">
        <Button variant="secondary">right</Button>
      </Tooltip>
    </div>
  ),
};

export const Variantes: Story = {
  render: () => (
    <div className="ig-story-row">
      <Tooltip text="Brand" variant="brand">
        <Button>brand</Button>
      </Tooltip>
      <Tooltip text="Success" variant="success">
        <Button variant="success">success</Button>
      </Tooltip>
      <Tooltip text="Danger" variant="danger">
        <Button variant="danger">danger</Button>
      </Tooltip>
    </div>
  ),
};

export const A11yInteraction: Story = {
  args: { text: "Eliminar elemento", placement: "top" },
  parameters: {
    docs: {
      description: {
        story:
          "El child recibe `aria-describedby` apuntando al `<span role=\"tooltip\">` sr-only. Verifica enlace para SR sin necesidad de hover.",
      },
    },
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button icon aria-label="Eliminar">
        ×
      </Button>
    </Tooltip>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: "Eliminar" });
    const describedBy = btn.getAttribute("aria-describedby");
    await expect(describedBy).toBeTruthy();
    // El span con ese id debe contener el texto del tooltip.
    const tooltipNode = canvas.getByRole("tooltip", { hidden: true });
    await expect(tooltipNode.id).toBe(describedBy);
    await expect(tooltipNode).toHaveTextContent("Eliminar elemento");
  },
};

export const WithCustomContainer: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Caso del roadmap RC1 (H-04 gate review): Tooltip dentro de un `<dialog>` con `showModal()`. Sin la prop `container` el `<FloatingPortal>` se monta en `document.body` y el tooltip queda detrás del backdrop top-layer del dialog. Pasar el elemento del dialog como `container` ancla el portal al top-layer y el tooltip aparece visible. Patrón canónico para Tooltip en Modal, y blueprint para futuros `<Popover>`/`<HoverCard>` que tendrán la misma prop.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="ig-story-frame ig-story-frame--lg">
        <Story />
      </div>
    ),
  ],
  render: () => {
    function DemoDialog() {
      const dialogRef = useRef<HTMLDialogElement>(null);
      const [open, setOpen] = useState(false);
      // Re-render para que el container apunte al dialog real tras el
      // primer mount (el ref se asigna en el mismo paint).
      const [, force] = useState(0);
      useEffect(() => {
        force(1);
      }, []);
      const openDialog = () => {
        setOpen(true);
        dialogRef.current?.showModal();
      };
      const closeDialog = () => {
        setOpen(false);
        dialogRef.current?.close();
      };
      return (
        <>
          <Button onClick={openDialog}>Abrir dialog</Button>
          <dialog
            ref={dialogRef}
            style={{
              padding: "2rem",
              borderRadius: 8,
              border: "1px solid var(--ig-fundus, #ccc)",
              background: "var(--ig-fundus, #fff)",
              color: "var(--ig-cinis-7, #111)",
            }}
          >
            <p>
              Este Tooltip recibe <code>container={"{dialogRef.current}"}</code>.
              Su portal se ancla al top-layer del dialog y queda visible.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Tooltip
                text="Visible aunque el dialog cubra body"
                placement="top"
                container={dialogRef.current}
              >
                <Button>Hover me</Button>
              </Tooltip>
              <Button variant="secondary" onClick={closeDialog}>
                Cerrar
              </Button>
            </div>
            <p
              aria-hidden
              style={{ marginTop: "1rem", fontSize: 12, opacity: 0.7 }}
            >
              {open ? "(open)" : ""}
            </p>
          </dialog>
        </>
      );
    }
    return <DemoDialog />;
  },
};

export const TooltipDentroDeModal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Patrón canónico documentado en `docs/decisions/C-02-modal-tooltip-portal.md`: cuando un `<Tooltip>` vive dentro de un `<Modal>`, el consumer DEBE pasar `container={dialogRef}` para que el portal del tooltip se ancle al top-layer del dialog. Sin esto, el portal va a `document.body` y el tooltip queda *detrás* del backdrop, invisible. Decisión consciente RC1: mantenemos esto manual para preservar la opción de migrar a context interno post-RC1 sin breaking change. Ver C-02 para criterios de re-evaluación.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="ig-story-frame ig-story-frame--lg">
        <Story />
      </div>
    ),
  ],
  render: () => {
    function DemoModal() {
      const dialogRef = useRef<HTMLDialogElement>(null);
      const [open, setOpen] = useState(false);
      // Re-render para que `container` apunte al dialog real tras
      // el primer mount (el ref se asigna en el mismo paint).
      const [, force] = useState(0);
      useEffect(() => {
        if (open) force((n) => n + 1);
      }, [open]);
      return (
        <>
          <Button
            onClick={() => {
              setOpen(true);
            }}
          >
            Abrir Modal
          </Button>
          <Modal
            ref={dialogRef}
            open={open}
            onClose={() => {
              setOpen(false);
            }}
            size="md"
          >
            <ModalHeader>
              Confirmar acción
              <ModalClose
                onClick={() => {
                  setOpen(false);
                }}
              />
            </ModalHeader>
            <ModalBody>
              <p>
                El Tooltip de abajo recibe{" "}
                <code>{"container={dialogRef.current}"}</code>. Su
                portal se monta dentro del top-layer del{" "}
                <code>{"<dialog>"}</code> y aparece visible por encima
                del backdrop. Hover o focus en el botón.
              </p>
              <Tooltip
                text="Esta acción no se puede deshacer"
                placement="top"
                container={dialogRef.current}
              >
                <Button variant="danger">Eliminar permanente</Button>
              </Tooltip>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setOpen(false);
                }}
              >
                Aceptar
              </Button>
            </ModalFooter>
          </Modal>
        </>
      );
    }
    return <DemoModal />;
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
  decorators: [
    (Story) => (
      <div className="ig-story-frame ig-story-frame--lg">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div className="ig-story-row ig-story-row--gap-lg">
        <Tooltip text="Top" placement="top">
          <Button variant="secondary">top</Button>
        </Tooltip>
        <Tooltip text="Bottom" placement="bottom">
          <Button variant="secondary">bottom</Button>
        </Tooltip>
        <Tooltip text="Left" placement="left">
          <Button variant="secondary">left</Button>
        </Tooltip>
        <Tooltip text="Right" placement="right">
          <Button variant="secondary">right</Button>
        </Tooltip>
      </div>
      <div className="ig-story-row ig-story-row--gap-lg">
        {(
          ["brand", "secondary", "success", "warning", "danger", "info"] as const
        ).map((v) => (
          <Tooltip key={v} text={v} variant={v} placement="top">
            <Button variant={v}>{v}</Button>
          </Tooltip>
        ))}
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Post-RC1: Tooltip migró a Floating UI. El elemento `.ig-tooltip`
    // visual vive en portal y solo monta al hover. Para snapshot
    // estático verificamos los wrappers persistentes (uno por
    // instancia) en lugar de los tooltips abiertos.
    const wrappers = canvasElement.querySelectorAll(".ig-tooltip-wrapper");
    await expect(wrappers.length).toBeGreaterThanOrEqual(10);
  },
};
