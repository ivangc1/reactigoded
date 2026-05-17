import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "./index";

const meta = {
  title: "Componentes/AlertDialog",
  component: AlertDialog,
  parameters: {
    docs: {
      description: {
        component:
          "AlertDialog (D8 beta.24) — variante del compound Dialog (D6) para confirmaciones destructivas o acciones que demandan atención consciente del usuario. Hereda toda la infraestructura de `<Dialog>`: Provider + Trigger + Header/Body/Footer/Close son aliases directos. La diferencia semántica vive en `<AlertDialogContent>`: `role=\"alertdialog\"` (vs `role=\"dialog\"`) + `closeOnBackdrop={false}` por defecto (click outside NO cierra; el usuario DEBE pulsar Cancel o Confirm explícitamente).",
      },
    },
  },
  args: { defaultOpen: false, children: null },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Caso canónico: confirmar borrado permanente. `AlertDialogTrigger` abre el modal; el usuario DEBE pulsar `Cancelar` o `Sí, borrar` para cerrar — click fuera NO cierra (override del default Dialog).",
      },
    },
  },
  render: () => (
    <AlertDialog defaultOpen={false}>
      <AlertDialogTrigger className="ig-btn ig-btn-danger">
        Borrar permanentemente
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <h2>Confirmar borrado</h2>
        </AlertDialogHeader>
        <AlertDialogBody>
          Esta acción no se puede deshacer. Los datos seleccionados se
          eliminarán permanentemente del sistema.
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogClose
            aria-label="Cancelar"
            className="ig-btn ig-btn-secondary"
          >
            Cancelar
          </AlertDialogClose>
          <AlertDialogClose
            aria-label="Sí, borrar"
            className="ig-btn ig-btn-danger"
          >
            Sí, borrar
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Borrar permanentemente" }),
    );
    // role=alertdialog (no dialog) cuando el browser interpreta el override.
    const alert = await canvas.findByRole("alertdialog");
    await expect(alert).toHaveAttribute("open");
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
    <AlertDialog defaultOpen>
      <AlertDialogContent size="md">
        <AlertDialogHeader>
          Confirmar borrado
          <AlertDialogClose />
        </AlertDialogHeader>
        <AlertDialogBody>
          Esta acción no se puede deshacer. Los datos seleccionados se
          eliminarán permanentemente.
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogClose
            aria-label="Cancelar"
            className="ig-btn ig-btn-secondary"
          >
            Cancelar
          </AlertDialogClose>
          <AlertDialogClose
            aria-label="Sí, borrar"
            className="ig-btn ig-btn-danger"
          >
            Sí, borrar
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const dialog = document.querySelector(
      "dialog[open].ig-dialog[role='alertdialog']",
    );
    await expect(dialog).toBeTruthy();
  },
};
