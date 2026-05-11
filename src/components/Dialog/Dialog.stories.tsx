import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Dialog } from "./Dialog";
import { DialogHeader } from "./DialogHeader";
import { DialogBody } from "./DialogBody";
import { DialogFooter } from "./DialogFooter";
import { DialogClose } from "./DialogClose";
import { Button } from "@/components/Button";

const meta = {
  title: "Componentes/Dialog",
  component: Dialog,
  parameters: {
    docs: {
      description: {
        component:
          "Dialog sobre `<dialog>` HTML nativo. Foco-trap, ESC y top-layer son nativos del navegador. Compón con `DialogHeader`, `DialogBody`, `DialogFooter`, `DialogClose`.",
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
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => { setOpen(true); }}>Abrir modal</Button>
        <Dialog {...args} open={open} onOpenChange={() => { setOpen(false); }}>
          <DialogHeader>
            <h2>Confirmar acción</h2>
            <DialogClose onClick={() => { setOpen(false); }} />
          </DialogHeader>
          <DialogBody>
            <p>
              ¿Seguro que quieres continuar? Esta acción no se puede deshacer.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setOpen(false); }}>
              Cancelar
            </Button>
            <Button onClick={() => { setOpen(false); }}>Aceptar</Button>
          </DialogFooter>
        </Dialog>
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
        <Dialog
          open={size !== null}
          onOpenChange={() => { setSize(null); }}
          size={size ?? "md"}
        >
          <DialogHeader>
            <h2>Tamaño: {size}</h2>
            <DialogClose onClick={() => { setSize(null); }} />
          </DialogHeader>
          <DialogBody>
            <p>Dialog de tamaño {size}.</p>
          </DialogBody>
        </Dialog>
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
        <Button onClick={() => { setOpen(true); }}>Dialog con backdrop blur</Button>
        <Dialog {...args} open={open} onOpenChange={() => { setOpen(false); }}>
          <DialogHeader>
            <h2>Backdrop con blur</h2>
            <DialogClose onClick={() => { setOpen(false); }} />
          </DialogHeader>
          <DialogBody>
            <p>Detrás del modal hay un blur de 8px.</p>
          </DialogBody>
        </Dialog>
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
        <Dialog
          open={open}
          loading={loading}
          onOpenChange={() => {
            setOpen(false);
          }}
        >
          <DialogHeader>
            <h2>Procesando…</h2>
            <DialogClose
              onClick={() => {
                setOpen(false);
              }}
            />
          </DialogHeader>
          <DialogBody>
            <p>
              Pulsa el botón para simular un envío de 2 segundos. El modal queda
              en estado <code>loading</code>.
            </p>
          </DialogBody>
          <DialogFooter>
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
          </DialogFooter>
        </Dialog>
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
        <Button onClick={() => { setOpen(true); }}>Dialog "obligatorio"</Button>
        <Dialog {...args} open={open} onOpenChange={() => { setOpen(false); }}>
          <DialogHeader>
            <h2>Confirmación obligatoria</h2>
          </DialogHeader>
          <DialogBody>
            <p>
              Este modal no se cierra con ESC ni clicando fuera. Solo con el
              botón.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => { setOpen(false); }}>Entendido</Button>
          </DialogFooter>
        </Dialog>
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
          <Dialog {...args} open={open} onOpenChange={() => { setOpen(false); }}>
            <DialogHeader>
              <h2>Diálogo de prueba</h2>
            </DialogHeader>
            <DialogBody>Contenido</DialogBody>
          </Dialog>
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
    // aria-labelledby debe apuntar al DialogHeader.
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
    <Dialog open size="md">
      <DialogHeader>
        Confirmar acción
        <DialogClose />
      </DialogHeader>
      <DialogBody>
        ¿Seguro que quieres continuar? Esta acción afecta a 3 elementos.
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="brand">Aceptar</Button>
      </DialogFooter>
    </Dialog>
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
