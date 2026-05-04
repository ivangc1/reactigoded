import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useState } from "react";
import { Pagination } from "./Pagination";

const meta = {
  title: "Componentes/Pagination",
  component: Pagination,
  parameters: {
    docs: {
      description: {
        component:
          "`<nav>` paginador con botones Anterior/Siguiente y elipsis automáticas. La página activa lleva `aria-current=\"page\"`.",
      },
    },
  },
  argTypes: {
    currentPage: { control: "number" },
    totalPages: { control: "number" },
    siblingCount: { control: "number" },
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
    currentPage: 3,
    totalPages: 10,
    siblingCount: 1,
    onPageChange: fn(),
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDefecto: Story = {};

export const Small: Story = {
  args: { currentPage: 2, totalPages: 5 },
};

export const Larga: Story = {
  args: { currentPage: 12, totalPages: 25 },
};

export const Brand: Story = {
  args: { variant: "brand", currentPage: 4, totalPages: 10 },
};

export const Interactiva: Story = {
  render: () => {
    function Demo() {
      const [page, setPage] = useState(1);
      return (
        <Pagination
          currentPage={page}
          totalPages={15}
          onPageChange={setPage}
          variant="brand"
        />
      );
    }
    return <Demo />;
  },
};

export const PageClickInteraction: Story = {
  args: { currentPage: 3, totalPages: 10, siblingCount: 1 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // La página activa lleva aria-current="page".
    const active = canvas.getByRole("button", { current: "page" });
    await expect(active).toHaveAccessibleName(/3/);
    // Click en página 4 (sibling visible con currentPage=3 y siblingCount=1).
    await userEvent.click(canvas.getByRole("button", { name: /página 4/i }));
    await expect(args.onPageChange).toHaveBeenCalledWith(4);
    // Click en "Siguiente" (avanza a 4).
    await userEvent.click(canvas.getByRole("button", { name: /siguiente/i }));
    await expect(args.onPageChange).toHaveBeenCalledWith(4);
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
    // aria-label único por instancia (axe rule landmark-unique).
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <Pagination
        aria-label="Paginación corta"
        currentPage={1}
        totalPages={3}
        onPageChange={() => {}}
      />
      <Pagination
        aria-label="Paginación larga con ellipsis"
        currentPage={6}
        totalPages={20}
        onPageChange={() => {}}
      />
      <Pagination
        aria-label="Paginación primera página"
        currentPage={1}
        totalPages={10}
        onPageChange={() => {}}
      />
      <Pagination
        aria-label="Paginación última página"
        currentPage={10}
        totalPages={10}
        onPageChange={() => {}}
      />
      <Pagination
        aria-label="Paginación brand"
        variant="brand"
        currentPage={3}
        totalPages={7}
        onPageChange={() => {}}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const navs = canvasElement.querySelectorAll('nav[aria-label^="Paginación"]');
    await expect(navs.length).toBe(5);
  },
};
