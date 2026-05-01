import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Table,
  TableHead,
  TableBody,
  TableFoot,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableCaption,
} from "./index";

describe("Table", () => {
  it("aplica la clase base ig-table", () => {
    render(
      <Table data-testid="t">
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByTestId("t")).toHaveClass("ig-table");
  });

  it("aplica modificadores como clases", () => {
    render(
      <Table
        data-testid="t"
        striped
        hover
        bordered
        compact
        layout="fixed"
      >
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByTestId("t")).toHaveClass(
      "ig-table",
      "ig-table-striped",
      "ig-table-hover",
      "ig-table-bordered",
      "ig-table-compact",
      "ig-table-fixed",
    );
  });

  it("scrollable envuelve la tabla en una región focusable con overflow", () => {
    render(
      <Table data-testid="t" scrollable>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const table = screen.getByTestId("t");
    const wrapper = table.parentElement;
    expect(wrapper?.tagName).toBe("DIV");
    expect(wrapper?.style.overflowX).toBe("auto");
    expect(wrapper).toHaveAttribute("role", "region");
    expect(wrapper).toHaveAttribute("tabindex", "0");
    expect(wrapper).toHaveAttribute(
      "aria-label",
      "Tabla con scroll horizontal",
    );
  });

  it("renderiza thead/tbody/tfoot/caption con etiquetas correctas", () => {
    render(
      <Table>
        <TableCaption side="top">titulo</TableCaption>
        <TableHead>
          <TableRow>
            <TableHeaderCell>H</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>D</TableCell>
          </TableRow>
        </TableBody>
        <TableFoot>
          <TableRow>
            <TableCell>F</TableCell>
          </TableRow>
        </TableFoot>
      </Table>,
    );
    expect(screen.getByText("titulo").tagName).toBe("CAPTION");
    expect(screen.getByText("titulo")).toHaveClass("ig-caption-top");
    expect(screen.getByText("H").tagName).toBe("TH");
    expect(screen.getByText("D").tagName).toBe("TD");
    expect(screen.getByText("F").tagName).toBe("TD");
    expect(screen.getByText("D").closest("tbody")).not.toBeNull();
    expect(screen.getByText("H").closest("thead")).not.toBeNull();
    expect(screen.getByText("F").closest("tfoot")).not.toBeNull();
  });

  it("propaga atributos de celda como colSpan/scope", () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">N</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2}>span</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("N")).toHaveAttribute("scope", "col");
    expect(screen.getByText("span")).toHaveAttribute("colspan", "2");
  });
});
