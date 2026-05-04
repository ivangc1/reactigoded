import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableCaption,
  TableFoot,
} from "./index";
import { Badge } from "../Badge";

const meta = {
  title: "Componentes/Table",
  component: Table,
  parameters: {
    docs: {
      description: {
        component:
          "`<table class=\"ig-table\">` con variantes booleanas: `striped`, `hover`, `bordered`, `compact`, y `layout` (`auto` o `fixed`). `scrollable` envuelve la tabla en un wrapper con overflow horizontal. Subcomponentes pass-through `TableHead`/`TableBody`/`TableFoot`/`TableRow`/`TableHeaderCell`/`TableCell`/`TableCaption`.",
      },
    },
  },
  argTypes: {
    striped: { control: "boolean" },
    hover: { control: "boolean" },
    bordered: { control: "boolean" },
    compact: { control: "boolean" },
    layout: { control: "select", options: [undefined, "auto", "fixed"] },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleRows = () => (
  <>
    <TableRow>
      <TableCell>Juan García</TableCell>
      <TableCell>juan@example.com</TableCell>
      <TableCell>
        <Badge variant="success">Activo</Badge>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell>María López</TableCell>
      <TableCell>maria@example.com</TableCell>
      <TableCell>
        <Badge variant="warning">Pendiente</Badge>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Pedro Ruiz</TableCell>
      <TableCell>pedro@example.com</TableCell>
      <TableCell>
        <Badge variant="danger">Bloqueado</Badge>
      </TableCell>
    </TableRow>
  </>
);

const SampleTable = (props: React.ComponentProps<typeof Table>) => (
  <Table {...props}>
    <TableHead>
      <TableRow>
        <TableHeaderCell>Nombre</TableHeaderCell>
        <TableHeaderCell>Email</TableHeaderCell>
        <TableHeaderCell>Estado</TableHeaderCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <SampleRows />
    </TableBody>
  </Table>
);

export const PorDefecto: Story = { render: (args) => <SampleTable {...args} /> };
export const Striped: Story = {
  args: { striped: true },
  render: (args) => <SampleTable {...args} />,
};
export const Hover: Story = {
  args: { hover: true },
  render: (args) => <SampleTable {...args} />,
};
export const Bordered: Story = {
  args: { bordered: true },
  render: (args) => <SampleTable {...args} />,
};
export const Compact: Story = {
  args: { compact: true, striped: true },
  render: (args) => <SampleTable {...args} />,
};

export const ConCaptionYFooter: Story = {
  render: () => (
    <Table striped>
      <TableCaption side="top">Usuarios registrados (Q1 2025)</TableCaption>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Nombre</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <SampleRows />
      </TableBody>
      <TableFoot>
        <TableRow>
          <TableCell colSpan={3}>Total: 3 usuarios</TableCell>
        </TableRow>
      </TableFoot>
    </Table>
  ),
};

export const Scrollable: Story = {
  args: { scrollable: true, hover: true },
  render: (args) => (
    <div className="ig-story-stack ig-story-stack--md">
      <Table {...args}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>ID</TableHeaderCell>
            <TableHeaderCell>Nombre</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>País</TableHeaderCell>
            <TableHeaderCell>Plan</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>001</TableCell>
            <TableCell>Juan García</TableCell>
            <TableCell>juan@example.com</TableCell>
            <TableCell>España</TableCell>
            <TableCell>Pro</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>002</TableCell>
            <TableCell>María López</TableCell>
            <TableCell>maria@example.com</TableCell>
            <TableCell>México</TableCell>
            <TableCell>Free</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
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
    <Table bordered striped hover>
      <TableCaption side="top">Pedidos recientes</TableCaption>
      <TableHead>
        <TableRow>
          <TableHeaderCell>ID</TableHeaderCell>
          <TableHeaderCell>Cliente</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Total</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>#001</TableCell>
          <TableCell>Acme</TableCell>
          <TableCell>
            <Badge variant="success">OK</Badge>
          </TableCell>
          <TableCell>1.250 €</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>#002</TableCell>
          <TableCell>Globex</TableCell>
          <TableCell>
            <Badge variant="warning">Pendiente</Badge>
          </TableCell>
          <TableCell>320 €</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>#003</TableCell>
          <TableCell>Initech</TableCell>
          <TableCell>
            <Badge variant="danger">Cancelado</Badge>
          </TableCell>
          <TableCell>0 €</TableCell>
        </TableRow>
      </TableBody>
      <TableFoot>
        <TableRow>
          <TableHeaderCell colSpan={3}>Total</TableHeaderCell>
          <TableHeaderCell>1.570 €</TableHeaderCell>
        </TableRow>
      </TableFoot>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll("tr");
    await expect(rows.length).toBeGreaterThanOrEqual(5);
    const badges = canvasElement.querySelectorAll(".ig-badge");
    await expect(badges.length).toBe(3);
  },
};
