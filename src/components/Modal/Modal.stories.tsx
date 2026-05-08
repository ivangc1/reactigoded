import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Modal } from "./Modal";
import { ModalHeader } from "./ModalHeader";
import { ModalBody } from "./ModalBody";
import { ModalFooter } from "./ModalFooter";
import { ModalClose } from "./ModalClose";
import { Button } from "@/components/Button";

const meta = {
  title: "Componentes/Modal",
  component: Modal,
  parameters: {
    docs: {
      description: {
        component:
          "Modal sobre `<dialog>` HTML nativo. Foco-trap, ESC y top-layer son nativos del navegador. Compón con `ModalHeader`, `ModalBody`, `ModalFooter`, `ModalClose`.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl", "full"],
    },
    backdrop: {
      control: "select",
      options: ["default", "blur", "dark", "light", "none"],
    },
    closeOnBackdrop: { control: "boolean" },
    closeOnEsc: { control: "boolean" },
  },
  args: {
    open: false,
    size: "md",
    backdrop: "default",
    closeOnBackdrop: true,
    closeOnEsc: true,
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => { setOpen(true); }}>Abrir modal</Button>
        <Modal {...args} open={open} onClose={() => { setOpen(false); }}>
          <ModalHeader>
            <h2>Confirmar acción</h2>
            <ModalClose onClick={() => { setOpen(false); }} />
          </ModalHeader>
          <ModalBody>
            <p>
              ¿Seguro que quieres continuar? Esta acción no se puede deshacer.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => { setOpen(false); }}>
              Cancelar
            </Button>
            <Button onClick={() => { setOpen(false); }}>Aceptar</Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};

export const Sizes: Story = {
  render: () => {
    const [size, setSize] = useState<
      "sm" | "md" | "lg" | "xl" | "full" | null
    >(null);
    return (
      <>
        <div className="ig-story-row ig-story-row--gap-sm">
          {(["sm", "md", "lg", "xl", "full"] as const).map((s) => (
            <Button key={s} variant="secondary" onClick={() => { setSize(s); }}>
              {s}
            </Button>
          ))}
        </div>
        <Modal
          open={size !== null}
          onClose={() => { setSize(null); }}
          size={size ?? "md"}
        >
          <ModalHeader>
            <h2>Tamaño: {size}</h2>
            <ModalClose onClick={() => { setSize(null); }} />
          </ModalHeader>
          <ModalBody>
            <p>Modal de tamaño {size}.</p>
          </ModalBody>
        </Modal>
      </>
    );
  },
};

export const BackdropBlur: Story = {
  args: { backdrop: "blur" },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => { setOpen(true); }}>Modal con backdrop blur</Button>
        <Modal {...args} open={open} onClose={() => { setOpen(false); }}>
          <ModalHeader>
            <h2>Backdrop con blur</h2>
            <ModalClose onClick={() => { setOpen(false); }} />
          </ModalHeader>
          <ModalBody>
            <p>Detrás del modal hay un blur de 8px.</p>
          </ModalBody>
        </Modal>
      </>
    );
  },
};

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`loading={true}` aplica `ig-dialog-loading` al `<dialog>` y expone `aria-busy=\"true\"`. Útil para indicar que el contenido aún se está procesando (envío de formulario, fetch).",
      },
    },
  },
  render: () => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true);
            setLoading(false);
          }}
        >
          Abrir modal con loading
        </Button>
        <Modal
          open={open}
          loading={loading}
          onClose={() => {
            setOpen(false);
          }}
        >
          <ModalHeader>
            <h2>Procesando…</h2>
            <ModalClose
              onClick={() => {
                setOpen(false);
              }}
            />
          </ModalHeader>
          <ModalBody>
            <p>
              Pulsa el botón para simular un envío de 2 segundos. El modal queda
              en estado <code>loading</code>.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  setOpen(false);
                }, 2000);
              }}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};

export const NoCloseOnBackdrop: Story = {
  args: { closeOnBackdrop: false, closeOnEsc: false },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => { setOpen(true); }}>Modal "obligatorio"</Button>
        <Modal {...args} open={open} onClose={() => { setOpen(false); }}>
          <ModalHeader>
            <h2>Confirmación obligatoria</h2>
          </ModalHeader>
          <ModalBody>
            <p>
              Este modal no se cierra con ESC ni clicando fuera. Solo con el
              botón.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => { setOpen(false); }}>Entendido</Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};

export const OpenInteraction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Click en el botón llama a `dialog.showModal()` y el dialog gana atributo `open`.",
      },
    },
  },
  render: (args) => {
    const Demo = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => { setOpen(true); }}>Abrir</Button>
          <Modal {...args} open={open} onClose={() => { setOpen(false); }}>
            <ModalHeader>
              <h2>Diálogo de prueba</h2>
            </ModalHeader>
            <ModalBody>Contenido</ModalBody>
          </Modal>
        </>
      );
    };
    return <Demo />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Abrir" }));
    // El <dialog> es accesible en el body con role=dialog tras showModal().
    const dialog = await canvas.findByRole("dialog");
    await expect(dialog).toHaveAttribute("open");
    // aria-labelledby debe apuntar al ModalHeader.
    const labelledBy = dialog.getAttribute("aria-labelledby");
    await expect(labelledBy).toBeTruthy();
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
    <Modal open size="md">
      <ModalHeader>
        Confirmar acción
        <ModalClose />
      </ModalHeader>
      <ModalBody>
        ¿Seguro que quieres continuar? Esta acción afecta a 3 elementos.
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="brand">Aceptar</Button>
      </ModalFooter>
    </Modal>
  ),
  play: async () => {
    // <dialog> se monta en top-layer del documento, no necesariamente
    // dentro de canvasElement. Querying global es seguro.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const dialog = document.querySelector("dialog[open].ig-dialog");
    await expect(dialog).toBeTruthy();
    const header = document.querySelector(".ig-dialog-header");
    await expect(header).toBeTruthy();
  },
};
