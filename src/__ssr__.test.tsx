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
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
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
 *   - **Switch indeterminate**: su estado indeterminado se aplica en
 *     effect sobre el nodo, no en el HTML del servidor; el ciclo de
 *     hidratación no añade señal sobre lo que ya cubre `renderToString`.
 *
 * **ThemeToggle SÍ está incluido, y antes NO lo estaba (SSR-01).** La
 * exclusión anterior decía: «usan `useSyncExternalStore` con server
 * snapshot fijo … el ciclo de hidratación pasaría sin información —
 * añadir es ruido». Las dos premisas eran falsas y esa exclusión es la
 * razón de que el defecto shippeara:
 *   (a) ThemeToggle NO leía el tema por `useSyncExternalStore`: lo leía
 *       directo del DOM dentro de `derive()`, o sea DURANTE el render de
 *       hidratación. Solo el `localStorage` pasaba por el store.
 *   (b) El ciclo daba un mismatch recuperable con el script anti-flash
 *       del propio README: información, no ruido.
 * Los tests CSR de `ThemeToggle.test.tsx` (bloque B-08) no podían
 * cazarlo por construcción: con `render()` React llama `getSnapshot`, no
 * `getServerSnapshot`, así que el defecto era invisible ahí.
 *
 * Estos 3 casos llevan `beforeHydrate` (fijan storage y `<html
 * data-theme>` ENTRE el server render y la hidratación) y `afterSettle`
 * en vez de la aserción genérica de DOM intacto, porque la
 * resincronización post-mount muta el DOM legítimamente.
 */
type HydrateCase = {
  name: string;
  jsx: () => ReactElement;
  /** Corre entre `renderToString` y `hydrateRoot`: simula lo que el navegador
   *  ya tiene puesto (script anti-flash, storage de una visita anterior). */
  beforeHydrate?: () => void;
  /** `false` cuando la resincronización post-hidratación muta el DOM a
   *  propósito. Nunca se pone `false` "porque falla": solo cuando la mutación
   *  ES el comportamiento correcto y `afterSettle` la comprueba. */
  expectDomStable?: boolean;
  /** Aserciones específicas tras asentarse la hidratación. */
  afterSettle?: (container: HTMLElement) => void;
};

/** Deja el entorno como una pestaña recién abierta, sin restos del caso previo. */
function resetThemeEnv(): void {
  document.documentElement.removeAttribute("data-theme");
  try {
    window.localStorage.removeItem("theme");
  } catch {
    /* sin storage — nada que limpiar. */
  }
}

const HYDRATE_CASES: HydrateCase[] = [
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
  // ── SSR-01: los 3 escenarios de hidratación de ThemeToggle ──────────
  // El invariante compartido es el mismo en los tres: `aria-checked` del
  // switch debe coincidir con `<html data-theme>` una vez asentado. Es el
  // par que se desincronizaba en silencio en producción, con el agravante
  // de que un `role="switch"` cuyo estado no describe la realidad es un
  // fallo WCAG 4.1.2 (Name, Role, Value), no solo un detalle visual.
  {
    name: "ThemeToggle (anti-flash resolvió light, sin storage)",
    jsx: () => <ThemeToggle />,
    beforeHydrate: () => {
      resetThemeEnv();
      document.documentElement.setAttribute("data-theme", "light");
    },
    // La resincronización post-mount cambia aria-checked y el label: mutación
    // legítima, comprobada abajo.
    expectDomStable: false,
    afterSettle: (container) => {
      const input = container.querySelector("input");
      expect(document.documentElement).toHaveAttribute("data-theme", "light");
      expect(input).toHaveAttribute("aria-checked", "false");
    },
  },
  {
    name: "ThemeToggle (storage light + anti-flash light)",
    jsx: () => <ThemeToggle />,
    beforeHydrate: () => {
      resetThemeEnv();
      window.localStorage.setItem("theme", "light");
      document.documentElement.setAttribute("data-theme", "light");
    },
    expectDomStable: false,
    afterSettle: (container) => {
      const input = container.querySelector("input");
      // ESTE es el assert que caza el fix naive. Mover la lectura a
      // `useSyncExternalStore` sin re-resolver en el effect elimina el
      // mismatch (`recoverableErrors` vacío, o sea la métrica del informe
      // pasa) y a la vez escribe el default sobre la preferencia guardada
      // del usuario: entra con "light" y sale con "dark" persistido.
      expect(window.localStorage.getItem("theme")).toBe("light");
      expect(document.documentElement).toHaveAttribute("data-theme", "light");
      expect(input).toHaveAttribute("aria-checked", "false");
    },
  },
  {
    name: "ThemeToggle (sin script anti-flash ni storage)",
    jsx: () => <ThemeToggle />,
    beforeHydrate: resetThemeEnv,
    expectDomStable: false,
    afterSettle: (container) => {
      const input = container.querySelector("input");
      // Sin señal externa manda el default dark-first del DS, y el servidor
      // ya había renderizado eso: aquí el DOM no debería cambiar de valor.
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
      expect(input).toHaveAttribute("aria-checked", "true");
    },
  },
];

describe("SSR — hydrateRoot ciclo server→cliente (H-08)", () => {
  // `act` de "react" (crudo, no el wrapper de RTL) exige
  // IS_REACT_ACT_ENVIRONMENT=true para no avisar "not configured to support
  // act". Lo activamos para este bloque de hidratación y lo restauramos en
  // afterAll (evita leak a otros ficheros con isolate:false). Cierra los
  // act() que veía la policy de stderr #28.
  let prevActEnv: boolean | undefined;
  beforeAll(() => {
    const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    prevActEnv = g.IS_REACT_ACT_ENVIRONMENT;
    g.IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterAll(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean | undefined }
    ).IS_REACT_ACT_ENVIRONMENT = prevActEnv;
  });
  for (const c of HYDRATE_CASES) {
    it(`${c.name}: hidrata sin mismatch ni DOM mutation`, async () => {
      // 1. Server render → HTML estático.
      //    Con `document` STUBEADO A undefined: si el componente lee el DOM
      //    durante el render (que es justo el defecto SSR-01), el pase
      //    "servidor" leería el mismo DOM que luego prepara `beforeHydrate` y
      //    el test se autocumpliría — mediría un mismatch que él mismo acaba
      //    de evitar. El repo ya conocía el truco (72c4e13).
      vi.stubGlobal("document", undefined);
      let serverHtml: string;
      try {
        serverHtml = renderToString(c.jsx());
      } finally {
        vi.unstubAllGlobals();
      }

      // 2. Estado que el navegador ya tiene ANTES de hidratar: script
      //    anti-flash, storage de una visita anterior. Va aquí y no antes
      //    porque el servidor, por definición, no lo ve.
      c.beforeHydrate?.();

      // 3. Montar el HTML en un container DOM real (happy-dom). Esto
      //    simula lo que el browser recibe del server antes de bootstrap.
      const container = document.createElement("div");
      container.innerHTML = serverHtml;
      document.body.appendChild(container);

      // 4. Snapshot pre-hydrate para detectar mutaciones post-hidratación.
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
      //    El asentamiento va DENTRO del mismo `act`, no en uno posterior:
      //    un componente que se resincroniza con una fuente externa (el
      //    `MutationObserver` de `<html data-theme>` en ThemeToggle) recibe su
      //    notificación milisegundos después del commit, y happy-dom la
      //    entrega por su propia cola. Con dos `act` separados esa
      //    notificación cae en el hueco entre el cierre del primero y la
      //    apertura del segundo — React avisa de "update not wrapped in act" y
      //    la política de stderr del repo (#28) lo convierte en fallo. Medido:
      //    con `act` separados falla; con uno solo, no.
      const recoverableErrors: unknown[] = [];
      const root: Root = await act(async () => {
        const r = hydrateRoot(container, c.jsx(), {
          onRecoverableError: (err) => {
            recoverableErrors.push(err);
          },
        });
        // Varios puntos de control en vez de un `await` largo: hay que ceder el
        // turno REPETIDAMENTE para que la cola de happy-dom avance.
        for (let i = 0; i < 5; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        return r;
      });

      // 5. Assertions tras hydration settled:
      //    - No errores recoverables (no mismatch). Invariante de TODOS los
      //      casos, sin excepción.
      //    - DOM intacto post-hidratación (React reuse del HTML server, no
      //      re-mount) SALVO donde la resincronización con una fuente externa
      //      es el comportamiento correcto; esos casos lo comprueban en
      //      `afterSettle`, que es más específico, no más laxo.
      expect(recoverableErrors).toEqual([]);
      if (c.expectDomStable !== false) {
        expect(container.innerHTML).toBe(htmlBeforeHydrate);
      }
      c.afterSettle?.(container);

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
