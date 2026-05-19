import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Dialog } from "./Dialog";
import { DialogContent } from "./DialogContent";
import { DialogTrigger } from "./DialogTrigger";
import { DialogHeader } from "./DialogHeader";
import { DialogBody } from "./DialogBody";
import { DialogFooter } from "./DialogFooter";
import { DialogClose } from "./DialogClose";
import { DialogAction } from "./DialogAction";
import { Button } from "@/components/Button";

const meta = {
  title: "Componentes/Dialog",
  component: Dialog,
  parameters: {
    docs: {
      description: {
        component:
          "Dialog compound (D6 beta.24) — `<Dialog>` es el Provider del estado, `<DialogContent>` es el `<dialog>` HTML nativo con focus-trap/ESC/top-layer del browser, `<DialogTrigger>` abre el modal sin necesidad de useState consumer en uncontrolled. Compón con `DialogHeader`, `DialogBody`, `DialogFooter`, `DialogClose`. Nota: `DialogTrigger` y `DialogClose` son `<button>` planos — para estilarlos como `<Button>` del DS, pasa la clase `ig-btn ig-btn-brand` (o las que apliquen) via `className` (un patrón `asChild` viene en 1.1).",
      },
    },
  },
  args: { defaultOpen: false, children: null },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Modo uncontrolled (D6): `DialogTrigger` abre, `DialogClose` cierra, todo via contexto. Cero useState consumer.",
      },
    },
  },
  render: () => (
    <Dialog defaultOpen={false}>
      <DialogTrigger className="ig-btn ig-btn-brand">Abrir modal</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <h2>Confirmar acción</h2>
          <DialogClose />
        </DialogHeader>
        <DialogBody>
          <p>
            ¿Seguro que quieres continuar? Esta acción no se puede deshacer.
          </p>
        </DialogBody>
        <DialogFooter>
          <DialogAction className="ig-btn ig-btn-secondary">
            Cancelar
          </DialogAction>
          <DialogAction className="ig-btn ig-btn-brand">
            Aceptar
          </DialogAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
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
          onOpenChange={() => {
            setSize(null);
          }}
        >
          <DialogContent size={size ?? "md"}>
            <DialogHeader>
              <h2>Tamaño: {size}</h2>
              <DialogClose />
            </DialogHeader>
            <DialogBody>
              <p>Dialog de tamaño {size}.</p>
            </DialogBody>
          </DialogContent>
        </Dialog>
      </>
    );
  },
};

export const BackdropBlur: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "El `backdrop` se aplica como prop de `DialogContent`. Aquí `blur`: detrás del modal hay un blur de 8px.",
      },
    },
  },
  render: () => (
    <Dialog defaultOpen={false}>
      <DialogTrigger className="ig-btn ig-btn-brand">
        Dialog con backdrop blur
      </DialogTrigger>
      <DialogContent backdrop="blur">
        <DialogHeader>
          <h2>Backdrop con blur</h2>
          <DialogClose />
        </DialogHeader>
        <DialogBody>
          <p>Detrás del modal hay un blur de 8px.</p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  ),
};

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`loading={true}` en `DialogContent` aplica `ig-dialog-loading` + `aria-busy=\"true\"`. Útil mientras procesa un envío de formulario.",
      },
    },
  },
  render: () => {
    const Demo = () => {
      const [loading, setLoading] = useState(false);
      return (
        <Dialog defaultOpen={false}>
          <DialogTrigger
            className="ig-btn ig-btn-brand"
            onClick={() => {
              setLoading(false);
            }}
          >
            Abrir modal con loading
          </DialogTrigger>
          <DialogContent loading={loading}>
            <DialogHeader>
              <h2>Procesando…</h2>
              <DialogClose />
            </DialogHeader>
            <DialogBody>
              <p>
                Pulsa el botón para simular un envío de 2 segundos. El modal
                queda en estado <code>loading</code>.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button
                loading={loading}
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                  }, 2000);
                }}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    };
    return <Demo />;
  },
};

export const NoCloseOnBackdrop: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`closeOnBackdrop={false}` + `closeOnEsc={false}` en `DialogContent` bloquean cierre por click fuera y ESC. Solo el botón cierra.",
      },
    },
  },
  render: () => (
    <Dialog defaultOpen={false}>
      <DialogTrigger className="ig-btn ig-btn-brand">
        Dialog "obligatorio"
      </DialogTrigger>
      <DialogContent closeOnBackdrop={false} closeOnEsc={false}>
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
          <DialogAction className="ig-btn ig-btn-brand">
            Entendido
          </DialogAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const OpenInteraction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Click en `DialogTrigger` llama a `dialog.showModal()` via contexto y el dialog gana atributo `open`. Play test valida el ciclo completo en uncontrolled.",
      },
    },
  },
  render: () => (
    <Dialog defaultOpen={false}>
      <DialogTrigger>Abrir</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <h2>Diálogo de prueba</h2>
        </DialogHeader>
        <DialogBody>Contenido</DialogBody>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Abrir" }));
    const dialog = await canvas.findByRole("dialog");
    await expect(dialog).toHaveAttribute("open");
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
    <Dialog defaultOpen>
      <DialogContent size="md">
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
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const dialog = document.querySelector("dialog[open].ig-dialog");
    await expect(dialog).toBeTruthy();
    const header = document.querySelector(".ig-dialog-header");
    await expect(header).toBeTruthy();
  },
};
