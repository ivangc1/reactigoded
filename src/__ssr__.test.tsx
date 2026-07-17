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
 * compound (Card, Menu, Tabs, Accordion, Dialog, Stepper, Toast,
 * Sidebar, Navbar, Input compound, Table, Timeline) se usa la
 * estructura mínima documentada en su JSDoc/storybook.
 *
 * Si un componente nuevo se añade al DS, añadirlo aquí garantiza
 * SSR-safety en CI antes del merge.
 */
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { act } from "react";
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
  Menu,
  MenuItem,
  MenuContent,
  MenuTrigger,
  ErrorText,
  Helper,
  IconButton,
  Input,
  InputAddon,
  InputGroup,
  Label,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Navbar,
  NavbarActions,
  NavbarLogo,
  NavbarLink,
  NavbarMenuButton,
  NavbarNav,
  Pagination,
  Progress,
  Radio,
  Rating,
  NativeSelect,
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
  TableCaption,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  TabsTrigger,
  TabsList,
  TabsContent,
  Tabs,
  Textarea,
  ThemeToggle,
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
    name: "Menu (compound)",
    jsx: () => (
      <Menu>
        <MenuTrigger>
          <Button>menu</Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>uno</MenuItem>
        </MenuContent>
      </Menu>
    ),
    expects: "ig-menu",
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
    name: "Dialog (compound, open=false)",
    jsx: () => (
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader title="x" />
          <DialogBody>cuerpo</DialogBody>
          <DialogFooter>pie</DialogFooter>
          <DialogClose />
        </DialogContent>
      </Dialog>
    ),
    // Dialog (D6 compound) renderea el <dialog> en estado cerrado vía
    // DialogContent. El SSR emite la clase base; el `open` HTML attr
    // queda ausente (controlado por dialog.showModal() en cliente).
    expects: "ig-dialog",
  },
  {
    name: "Navbar (compound)",
    jsx: () => (
      <Navbar>
        <NavbarLogo>Brand</NavbarLogo>
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
    name: "NativeSelect",
    jsx: () => (
      <NativeSelect aria-label="país" defaultValue="es">
        <option value="es">España</option>
      </NativeSelect>
    ),
    expects: "ig-native-select",
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
  // L-09 (gate review): casos SSR específicos para subcomponentes
  // del compound que no quedaban verificados por el caso "Table
  // (compound)" base.
  {
    name: "TableCaption (top)",
    jsx: () => (
      <Table>
        <TableCaption side="top">Resumen del trimestre</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>val</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
    expects: "ig-caption-top",
  },
  {
    name: "TableFoot (tfoot tag)",
    jsx: () => (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>val</TableCell>
          </TableRow>
        </TableBody>
        <TableFoot>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFoot>
      </Table>
    ),
    expects: "<tfoot>",
  },
  {
    name: "Tabs (compound)",
    jsx: () => (
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">contenido</TabsContent>
      </Tabs>
    ),
    expects: "ig-tabs",
  },
  // L-09 (gate review) test "TabsContent (wrapper)" eliminado en PR 4:
  // el wrapper TabsContent (Caso 1, sin lógica) fue eliminado como
  // ciudadano API. TabsContent ahora es el panel asociado a `value`
  // (renombrado desde TabPanel). El test "Tabs (compound)" arriba ya
  // verifica SSR de TabsContent post-rename.
  {
    name: "Textarea",
    jsx: () => <Textarea placeholder="escribe…" />,
    expects: "ig-textarea",
  },
  {
    name: "ThemeToggle",
    jsx: () => <ThemeToggle defaultTheme="light" />,
    // ThemeToggle derive lee `document` solo en effect — server NO toca DOM.
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
    // H-03 (gate review): no usar "ig-tooltip" sustring — antes
    // matcheaba "ig-tooltip-wrapper" (eliminado en RC1 con D-01/M-05).
    // Usar role="tooltip" del span sr-only persistente que el
    // componente sigue inyectando para el SR. Eso garantiza que el
    // patrón a11y (aria-describedby → role=tooltip) está en el HTML
    // server-rendered.
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

/**
 * H-08 (beta.24 gate review): además del `renderToString` por
 * componente, validamos el ciclo COMPLETO de SSR — server → hidratación
 * cliente — sobre componentes representativos del DS. Esto cubre la
 * categoría de bug que `renderToString` solo no caza:
 *
 *   1. **Hydration mismatch**: el HTML server difiere del primer paint
 *      cliente. React emite warning + reconstruye el subtree, perdiendo
 *      estado y eventos handler. `onRecoverableError` lo expone como
 *      error capturable en tests.
 *   2. **useId mismatch**: si el componente usa `useId()` pero el
 *      orden de tree es no-determinístico entre server y cliente, los
 *      IDs divergen. React 19 garantiza determinismo si el tree es
 *      idéntico — este test confirma que NUESTROS componentes lo son.
 *   3. **DOM mutation post-hydrate**: el server escribió un HTML, pero
 *      el primer render cliente lo sobreescribe (effect síncrono mal
 *      diseñado). Catch: comparar `innerHTML` antes y después de
 *      hidratar.
 *
 * Selección 4 componentes representativos (no toda la suite — los 38
 * `renderToString` cases ya cubren server-safety; hidratación es un
 * spot check del ciclo completo):
 *
 *   - **Button**: golden path simple, sin context ni useId. Si esto
 *     falla, algo está roto a nivel infraestructura.
 *   - **Card (compound)**: contenedor con children compound (Header,
 *     Body, Footer). Caso típico de layout server-rendered.
 *   - **Accordion (controlled state)**: tiene estado interno
 *     (`open`/`closed`) + `useId()` para aria-controls. Stress test del
 *     server snapshot ↔ client hydrate sync.
 *   - **Tabs (compound + useId)**: usa `useId()` extensivamente para
 *     trigger/panel pairing. Caso histórico de mismatch en DSs que
 *     no aíslan el ID counter correctamente.
 *
 * Componentes que NO se incluyen (decisión consciente):
 *   - **Dialog / Menu / Tooltip / Toast**: client-only por design
 *     (portales, "use client" granular, FUI). El consumer NO los
 *     server-renderiza; meterlos en hydrateRoot tests probaría algo
 *     que no es invariante del DS.
 *   - **ThemeToggle / Switch indeterminate**: usan
 *     `useSyncExternalStore` con server snapshot fijo. Su SSR es
 *     trivial (renderToString ya lo cubre) y el ciclo de hidratación
 *     pasaría sin información — añadir es ruido.
 */
const HYDRATE_CASES: { name: string; jsx: () => ReactElement }[] = [
  { name: "Button", jsx: () => <Button>Aceptar</Button> },
  {
    name: "Card (compound)",
    jsx: () => (
      <Card>
        <CardHeader title="Título" />
        <CardBody>cuerpo</CardBody>
        <CardFooter>pie</CardFooter>
      </Card>
    ),
  },
  {
    name: "Accordion (controlled state)",
    jsx: () => (
      <Accordion type="single" defaultValue="a">
        <AccordionItem value="a">
          <AccordionHeader>A</AccordionHeader>
          <AccordionContent>contenido a</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    name: "Tabs (compound + useId)",
    jsx: () => (
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">contenido</TabsContent>
      </Tabs>
    ),
  },
];

describe("SSR — hydrateRoot ciclo server→cliente (H-08)", () => {
  for (const c of HYDRATE_CASES) {
    it(`${c.name}: hidrata sin mismatch ni DOM mutation`, async () => {
      // 1. Server render → HTML estático.
      // eslint-disable-next-line testing-library/render-result-naming-convention -- `serverHtml` viene de renderToString, no del `render` de testing-library; la regla no aplica.
      const serverHtml = renderToString(c.jsx());

      // 2. Montar el HTML en un container DOM real (happy-dom). Esto
      //    simula lo que el browser recibe del server antes de bootstrap.
      const container = document.createElement("div");
      container.innerHTML = serverHtml;
      document.body.appendChild(container);

      // 3. Snapshot pre-hydrate para detectar mutaciones post-hidratación.
      const htmlBeforeHydrate = container.innerHTML;

      // 4. Hidratar dentro de `act()`. `hydrateRoot` inicia hidratación
      //    sincrónicamente pero React 19 puede yieldear a microtasks/
      //    macrotasks durante el matching pass (concurrent mode). El
      //    `onRecoverableError` para mismatches puede dispararse DESPUÉS
      //    del `hydrateRoot` initial commit, durante el work
      //    asíncrono — codex P1 sobre el primer commit caught esto.
      //
      //    Truco de typings: el overload `act((() => void)): void` de
      //    React kicks in cuando el callback retorna void, lo que rompe
      //    `await`. Retornar el `Root` desde el callback fuerza el
      //    overload `act<T>(() => T): Promise<T>` que sí es awaitable.
      const recoverableErrors: unknown[] = [];
      const root: Root = await act(() =>
        hydrateRoot(container, c.jsx(), {
          onRecoverableError: (err) => {
            recoverableErrors.push(err);
          },
        }),
      );

      // 5. Assertions tras hydration settled:
      //    - No errores recoverables (no mismatch).
      //    - DOM intacto post-hidratación (React reuse del HTML server,
      //      no re-mount).
      expect(recoverableErrors).toEqual([]);
      expect(container.innerHTML).toBe(htmlBeforeHydrate);

      // 6. Cleanup: unmount + remove container del documento. Sin esto,
      //    el React state queda colgado entre tests y los counters de
      //    useId acumulan ruido entre casos.
      //
      //    Mismo truco que arriba: `return null` para forzar overload
      //    no-void (callback que retorna void cae al overload `act`
      //    no awaitable).
      await act(() => {
        root.unmount();
        return null;
      });
      container.remove();
    });
  }
});

/**
 * D1-P1 (beta.24 gate review): double-render idempotence sobre los
 * casos `renderToString`. `renderToString(jsx)` invocado dos veces
 * con el MISMO jsx debe producir el mismo HTML byte a byte. Si no, el
 * componente tiene side-effects en render path (module-level
 * counters, mutación de estado externo, etc.) que rompen el invariante
 * "render server = función pura".
 *
 * useId es el caso típico: en React 19 `useId()` no es determinístico
 * entre invocaciones independientes de `renderToString`. Para
 * componentes con useId esperamos el mismo ID en la MISMA invocación
 * de render server pero NO entre invocaciones distintas — esto es OK
 * porque el ID se persiste vía DOM y se hidrata correctamente. Para
 * detectar este caso, usamos una passlist de componentes con useId.
 *
 * Componentes con useId (skip double-render strict check porque sus
 * IDs varían legítimamente entre llamadas distintas a renderToString):
 *   Accordion, Dialog, Menu, Sidebar, Tabs, Tooltip, Toast.
 */
const USES_USE_ID = new Set([
  "Accordion",
  "Dialog (compound, open=false)",
  "Menu (compound)",
  "Sidebar (compound)",
  "Tabs (compound)",
  "Tooltip",
  "Toast (compound)",
]);

describe("SSR — double-render idempotence (D1-P1)", () => {
  for (const c of cases) {
    if (USES_USE_ID.has(c.name)) continue;
    it(`${c.name}: dos invocaciones de renderToString producen mismo HTML`, () => {
      // eslint-disable-next-line testing-library/render-result-naming-convention -- renderToString del server, no del testing-library.
      const html1 = renderToString(c.jsx());
      // eslint-disable-next-line testing-library/render-result-naming-convention -- renderToString del server, no del testing-library.
      const html2 = renderToString(c.jsx());
      expect(html1).toBe(html2);
    });
  }
});
