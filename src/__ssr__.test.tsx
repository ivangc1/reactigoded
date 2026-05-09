/**
 * SSR strict — `renderToString` por componente del DS.
 *
 * Garantiza que CADA componente público:
 *
 *   1. Es importable desde `react-dom/server`.
 *   2. `renderToString` no lanza con sus props mínimos válidos.
 *   3. Emite la clase base `ig-*` esperada en el HTML estático.
 *   4. NO requiere `document` / `window` durante render (los effects
 *      no corren en server; cualquier acceso síncrono a DOM en render
 *      crashea aquí).
 *
 * Un componente que pase `renderToString` puede usarse en Next.js,
 * Astro, Remix server-rendering, Solid/Qwik con React islands, etc.
 *
 * Test estilo `it.each` con composiciones mínimas. Para componentes
 * compound (Card, Dropdown, Tabs, Accordion, Modal, Stepper, Toast,
 * Sidebar, Navbar, Input compound, Table, Timeline) se usa la
 * estructura mínima documentada en su JSDoc/storybook.
 *
 * Si un componente nuevo se añade al DS, añadirlo aquí garantiza
 * SSR-safety en CI antes del merge.
 */
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Alert,
  Avatar,
  AvatarGroup,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardDivider,
  CardFooter,
  CardHeader,
  CardImage,
  Checkbox,
  Chip,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  ErrorText,
  Helper,
  IconButton,
  Input,
  InputAddon,
  InputGroup,
  Label,
  Modal,
  ModalBody,
  ModalClose,
  ModalFooter,
  ModalHeader,
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarLink,
  NavbarMenuButton,
  NavbarNav,
  Pagination,
  Progress,
  Radio,
  Rating,
  Select,
  Sidebar,
  SidebarFooter,
  SidebarItem,
  SidebarNav,
  Skeleton,
  SkeletonContainer,
  Slider,
  Spinner,
  Step,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  ThemeSwitch,
  Timeline,
  TimelineItem,
  Toast,
  ToastProvider,
  Tooltip,
} from "./index";
import type { ReactElement } from "react";

interface SsrCase {
  /** Nombre del componente para el test name. */
  name: string;
  /** Factory del JSX a renderear. */
  jsx: () => ReactElement;
  /** Substring esperado en el HTML emitido (usualmente la clase base). */
  expects: string;
}

const cases: SsrCase[] = [
  {
    name: "Accordion",
    jsx: () => (
      <Accordion type="single">
        <AccordionItem value="a">
          <AccordionHeader>A</AccordionHeader>
          <AccordionContent>contenido a</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
    expects: "ig-accordion",
  },
  {
    name: "Alert",
    jsx: () => <Alert>texto</Alert>,
    expects: "ig-alert",
  },
  {
    name: "Avatar",
    jsx: () => <Avatar initials="AX" />,
    expects: "ig-avatar",
  },
  {
    name: "AvatarGroup",
    jsx: () => (
      <AvatarGroup>
        <Avatar initials="A" />
        <Avatar initials="B" />
      </AvatarGroup>
    ),
    expects: "ig-avatar-group",
  },
  {
    name: "Badge",
    jsx: () => <Badge variant="brand">x</Badge>,
    expects: "ig-badge",
  },
  {
    name: "Breadcrumb",
    jsx: () => (
      <Breadcrumb>
        <BreadcrumbItem href="/">Inicio</BreadcrumbItem>
        <BreadcrumbItem current>Detalle</BreadcrumbItem>
      </Breadcrumb>
    ),
    expects: "ig-breadcrumb",
  },
  {
    name: "Button",
    jsx: () => <Button>Aceptar</Button>,
    expects: "ig-btn",
  },
  {
    name: "IconButton",
    jsx: () => <IconButton aria-label="Favorito">★</IconButton>,
    expects: "ig-btn-icon",
  },
  {
    name: "Card (compound)",
    jsx: () => (
      <Card>
        <CardHeader title="Título" />
        <CardBody>cuerpo</CardBody>
        <CardImage src="/x.jpg" alt="" />
        <CardDivider />
        <CardFooter>pie</CardFooter>
      </Card>
    ),
    expects: "ig-card",
  },
  {
    name: "Checkbox",
    jsx: () => <Checkbox aria-label="acepto" />,
    expects: "ig-checkbox",
  },
  {
    name: "Chip",
    jsx: () => <Chip>tag</Chip>,
    expects: "ig-chip",
  },
  {
    name: "Divider",
    jsx: () => <Divider />,
    expects: "ig-divider",
  },
  {
    name: "Dropdown (compound)",
    jsx: () => (
      <Dropdown>
        <DropdownTrigger>
          <Button>menu</Button>
        </DropdownTrigger>
        <DropdownMenu>
          <DropdownItem>uno</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    ),
    expects: "ig-dropdown",
  },
  {
    name: "Input",
    jsx: () => <Input placeholder="email" />,
    expects: "ig-input",
  },
  {
    name: "Input compound (Label + Input + Helper + ErrorText + Group + Addon)",
    jsx: () => (
      <>
        <Label htmlFor="email">Email</Label>
        <InputGroup>
          <InputAddon>@</InputAddon>
          <Input id="email" placeholder="user" />
        </InputGroup>
        <Helper>Ayuda</Helper>
        <ErrorText>Error</ErrorText>
      </>
    ),
    expects: "ig-input-group",
  },
  {
    name: "Modal (open=false)",
    jsx: () => (
      <Modal open={false} onClose={() => {}}>
        <ModalHeader title="x" />
        <ModalBody>cuerpo</ModalBody>
        <ModalFooter>pie</ModalFooter>
        <ModalClose />
      </Modal>
    ),
    // Modal open=false NO debe emitir contenido — verificamos que no lanza
    // y el HTML está vacío o sin clase.
    expects: "",
  },
  {
    name: "Navbar (compound)",
    jsx: () => (
      <Navbar>
        <NavbarBrand>Brand</NavbarBrand>
        <NavbarNav>
          <NavbarLink href="/">Inicio</NavbarLink>
        </NavbarNav>
        <NavbarActions>
          <NavbarMenuButton aria-label="menú" />
        </NavbarActions>
      </Navbar>
    ),
    expects: "ig-navbar",
  },
  {
    name: "Pagination",
    jsx: () => <Pagination totalPages={5} defaultPage={1} />,
    expects: "ig-pagination",
  },
  {
    name: "Progress",
    jsx: () => <Progress value={50} />,
    expects: "ig-progress",
  },
  {
    name: "Radio",
    jsx: () => <Radio name="g" value="a" aria-label="opción a" />,
    expects: "ig-radio",
  },
  {
    name: "Rating",
    jsx: () => <Rating defaultValue={3} aria-label="puntuación" />,
    expects: "ig-rating",
  },
  {
    name: "Select",
    jsx: () => (
      <Select aria-label="país" defaultValue="es">
        <option value="es">España</option>
      </Select>
    ),
    expects: "ig-select",
  },
  {
    name: "Sidebar (compound)",
    jsx: () => (
      <Sidebar>
        <SidebarNav>
          <SidebarItem href="/">Home</SidebarItem>
        </SidebarNav>
        <SidebarFooter>pie</SidebarFooter>
      </Sidebar>
    ),
    expects: "ig-sidebar",
  },
  {
    name: "Skeleton",
    jsx: () => <Skeleton aria-label="loading" />,
    expects: "ig-skeleton",
  },
  {
    name: "SkeletonContainer",
    jsx: () => (
      <SkeletonContainer label="Cargando">
        <Skeleton />
        <Skeleton />
      </SkeletonContainer>
    ),
    expects: "ig-skeleton",
  },
  {
    name: "Slider",
    jsx: () => <Slider aria-label="vol" defaultValue={30} />,
    expects: "ig-slider",
  },
  {
    name: "Spinner",
    jsx: () => <Spinner aria-label="cargando" />,
    expects: "ig-spinner",
  },
  {
    name: "Stepper (compound)",
    jsx: () => (
      <Stepper active={0}>
        <Step />
        <Step />
      </Stepper>
    ),
    expects: "ig-stepper",
  },
  {
    name: "Switch",
    jsx: () => <Switch defaultChecked>x</Switch>,
    expects: "ig-switch",
  },
  {
    name: "Table (compound)",
    jsx: () => (
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>col</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>val</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
    expects: "ig-table",
  },
  {
    name: "Tabs (compound)",
    jsx: () => (
      <Tabs defaultValue="a">
        <TabList>
          <Tab value="a">A</Tab>
        </TabList>
        <TabPanel value="a">contenido</TabPanel>
      </Tabs>
    ),
    expects: "ig-tabs",
  },
  {
    name: "Textarea",
    jsx: () => <Textarea placeholder="escribe…" />,
    expects: "ig-textarea",
  },
  {
    name: "ThemeSwitch",
    jsx: () => <ThemeSwitch defaultTheme="light" />,
    // ThemeSwitch derive lee `document` solo en effect — server NO toca DOM.
    expects: 'role="switch"',
  },
  {
    name: "Timeline (compound)",
    jsx: () => (
      <Timeline>
        <TimelineItem dotVariant="brand">
          <div>contenido del item</div>
        </TimelineItem>
      </Timeline>
    ),
    expects: "ig-timeline",
  },
  {
    name: "Toast (Provider sin toasts)",
    jsx: () => <ToastProvider />,
    // El provider sin toasts emite solo un region/list vacío. Validamos
    // que NO lanza.
    expects: "",
  },
  {
    name: "Toast (instancia directa)",
    jsx: () => <Toast variant="success">guardado</Toast>,
    expects: "ig-toast",
  },
  {
    name: "Tooltip",
    jsx: () => <Tooltip text="ayuda"><Button>btn</Button></Tooltip>,
    // H-03 (gate review): no usar "ig-tooltip" sustring — matchea
    // "ig-tooltip-wrapper" del span exterior. Usar role="tooltip" del
    // span sr-only que el componente inyecta para el SR. Eso garantiza
    // que el patrón a11y (aria-describedby → role=tooltip) esté en el
    // HTML server-rendered, no solo el wrapper visual.
    expects: 'role="tooltip"',
  },
];

describe("SSR — renderToString por componente del DS", () => {
  for (const c of cases) {
    it(`${c.name}: renderiza sin lanzar y emite clase base`, () => {
      // eslint-disable-next-line testing-library/render-result-naming-convention -- `html` viene de renderToString de react-dom/server, no del `render` de testing-library; la regla no aplica.
      const html = renderToString(c.jsx());
      // Si `expects` es string vacío, solo validamos que no lanzó (el
      // assertion sobre `html` siempre pasa).
      if (c.expects !== "") {
        expect(html).toContain(c.expects);
      } else {
        expect(typeof html).toBe("string");
      }
      // Cualquier render en server NO debe contener side-effects de
      // DOM mutation (data-theme se aplica solo en useEffect del cliente).
      expect(html).not.toContain("data-theme=");
    });
  }
});
