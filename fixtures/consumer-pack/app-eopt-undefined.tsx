/**
 * Consumer-pack EOPT-undefined fixture — paso 2 del plan #155.
 *
 * Ejercita el patrón `<Comp prop={cond ? val : undefined}>` sobre las
 * props que un consumer con `exactOptionalPropertyTypes: true` puede
 * razonablemente querer pasar condicionales.
 *
 * Categorías cubiertas:
 *
 * - **CLASE 1 sanity** (1 prop): Tooltip.openDelay (number opcional
 *   simple, sin discriminator). Pre-widening falla; post-widening pasa.
 *
 * - **CLASE 2 (19 props, useControllableState pattern — 1 caso por
 *   componente controlado + Dialog.onClose especial)**:
 *   - Accordion.SingleProps × 3 (value, defaultValue, onValueChange).
 *   - Accordion.MultipleProps × 3 (value, defaultValue, onValueChange).
 *   - Dialog × 3 (open, defaultOpen, onOpenChange) + Dialog.onClose
 *     (discriminator file-scoped detectado por verifier).
 *   - Alert.open, Menu.open, Sidebar.collapsed, Stepper.active,
 *     Pagination.page, Slider.onValueChange, Rating.readOnly,
 *     Tabs.value, ThemeToggle.theme.
 *   Pre-widening fallan TODAS bajo EOPT; post-widening pasan.
 *
 * - **`href` discriminator (control de regresión, NO se widening)**: el
 *   `?: undefined` literal de MenuItem, SidebarItem y NavbarLogo debe
 *   permitir tanto `<X href={undefined}>` (resuelve a button/div branch)
 *   como `<X href="x">` (resuelve a anchor branch). Pre-widening y
 *   post-widening PASAN — son el control. Si fallan, hay un bug en el
 *   discriminator que el widening enmascaró.
 *
 * Rojo esperado pre-widening: 20 errores TS2375 (props sin widen).
 * Verde esperado post-widening: 0 errores.
 *
 * El bloque href DEBE ESTAR EN VERDE EN AMBOS ESTADOS — el control.
 */
import {
  Chip,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionContent,
  Alert,
  Dialog,
  DialogContent,
  Tooltip,
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  Sidebar,
  SidebarNav,
  SidebarItem,
  Pagination,
  Rating,
  Slider,
  Stepper,
  Step,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ThemeToggle,
  NavbarLogo,
  type Theme,
} from "reactigoded";

// Consumer-style condicionales — emulan `cond ? val : undefined`.
declare const maybeStr: string | undefined;
declare const maybeArr: string[] | undefined;
declare const maybeBool: boolean | undefined;
declare const maybeSingleFn: ((value: string | null) => void) | undefined;
declare const maybeMultiFn: ((value: string[]) => void) | undefined;
declare const maybeOpenChangeFn: ((open: boolean) => void) | undefined;
declare const maybeNum: number | undefined;
declare const maybeCallback: (() => void) | undefined;
declare const maybeSliderFn: ((value: number) => void) | undefined;
declare const maybeTheme: Theme | undefined;

// ─── CLASE 1 sanity (1 prop) ──────────────────────────────────────
//
// Tooltip.openDelay: simple `number` opcional. Pre-widening falla bajo
// EOPT con `cond ? val : undefined`; post-widening pasa.
export const Class1Sanity_TooltipOpenDelay = (
  <Tooltip text="Pista" openDelay={maybeNum}>
    <button type="button">x</button>
  </Tooltip>
);

// ─── CLASE 2 (9 props) ────────────────────────────────────────────
//
// Accordion SingleProps × 3.
export const Class2_AccordionSingleValue = (
  <Accordion type="single" value={maybeStr}>
    <AccordionItem value="a">
      <AccordionHeader>A</AccordionHeader>
      <AccordionContent>x</AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const Class2_AccordionSingleDefaultValue = (
  <Accordion type="single" defaultValue={maybeStr}>
    <AccordionItem value="a">
      <AccordionHeader>A</AccordionHeader>
      <AccordionContent>x</AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const Class2_AccordionSingleOnValueChange = (
  <Accordion type="single" onValueChange={maybeSingleFn}>
    <AccordionItem value="a">
      <AccordionHeader>A</AccordionHeader>
      <AccordionContent>x</AccordionContent>
    </AccordionItem>
  </Accordion>
);

// Accordion MultipleProps × 3.
export const Class2_AccordionMultipleValue = (
  <Accordion type="multiple" value={maybeArr}>
    <AccordionItem value="a">
      <AccordionHeader>A</AccordionHeader>
      <AccordionContent>x</AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const Class2_AccordionMultipleDefaultValue = (
  <Accordion type="multiple" defaultValue={maybeArr}>
    <AccordionItem value="a">
      <AccordionHeader>A</AccordionHeader>
      <AccordionContent>x</AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const Class2_AccordionMultipleOnValueChange = (
  <Accordion type="multiple" onValueChange={maybeMultiFn}>
    <AccordionItem value="a">
      <AccordionHeader>A</AccordionHeader>
      <AccordionContent>x</AccordionContent>
    </AccordionItem>
  </Accordion>
);

// Dialog × 3.
export const Class2_DialogOpen = (
  <Dialog open={maybeBool}>
    <DialogContent>x</DialogContent>
  </Dialog>
);

export const Class2_DialogDefaultOpen = (
  <Dialog defaultOpen={maybeBool}>
    <DialogContent>x</DialogContent>
  </Dialog>
);

export const Class2_DialogOnOpenChange = (
  <Dialog onOpenChange={maybeOpenChangeFn}>
    <DialogContent>x</DialogContent>
  </Dialog>
);

// Dialog.onClose — discriminator file-scoped detectado por verifier
// (participa en `isPresentationalControlled`, no en
// CONTROLLED_PROP_NAMES genérico). Widening manual + test específico.
export const Class2_DialogOnClose = (
  <Dialog onClose={maybeCallback}>
    <DialogContent>x</DialogContent>
  </Dialog>
);

// ─── CLASE 2: 1 caso por componente controlado restante ────────────
//
// Variedad de tipos discriminator: boolean (open/collapsed), number
// (page/active), string union (theme), function (Slider.onValueChange).

export const Class2_AlertOpen = (
  <Alert open={maybeBool}>contenido</Alert>
);

export const Class2_MenuOpen = (
  <Menu open={maybeBool}>
    <MenuTrigger>x</MenuTrigger>
    <MenuContent>
      <MenuItem>a</MenuItem>
    </MenuContent>
  </Menu>
);

export const Class2_SidebarCollapsed = (
  <Sidebar collapsed={maybeBool}>
    <SidebarNav>
      <SidebarItem>i</SidebarItem>
    </SidebarNav>
  </Sidebar>
);

export const Class2_StepperActive = (
  <Stepper active={maybeNum}>
    <Step>a</Step>
    <Step>b</Step>
  </Stepper>
);

export const Class2_PaginationPage = (
  <Pagination page={maybeNum} totalPages={10} />
);

export const Class2_SliderOnValueChange = (
  <Slider onValueChange={maybeSliderFn} />
);

export const Class2_RatingReadOnly = (
  <Rating readOnly={maybeBool} />
);

export const Class2_TabsValue = (
  <Tabs value={maybeStr}>
    <TabsList>
      <TabsTrigger value="a">A</TabsTrigger>
    </TabsList>
    <TabsContent value="a">x</TabsContent>
  </Tabs>
);

export const Class2_ThemeToggleTheme = (
  <ThemeToggle theme={maybeTheme} />
);

// ─── href discriminator (control, NO widening) ────────────────────
//
// El `ButtonItemProps.href?: undefined` literal en MenuItem y
// SidebarItem debe permitir resolver el discriminated union según el
// tipo del valor pasado. Estos 4 casos PASAN en ambos estados (pre y
// post widening) — son el control que blinda el discriminator contra
// refactors futuros que "limpien" el patrón.

// MenuItem href={undefined} → ButtonItemProps branch.
export const HrefControl_MenuItemUndef = (
  <Menu>
    <MenuTrigger>x</MenuTrigger>
    <MenuContent>
      <MenuItem href={undefined}>Acción</MenuItem>
    </MenuContent>
  </Menu>
);

// MenuItem href="..." → AnchorItemProps branch.
export const HrefControl_MenuItemString = (
  <Menu>
    <MenuTrigger>x</MenuTrigger>
    <MenuContent>
      <MenuItem href="/perfil">Perfil</MenuItem>
    </MenuContent>
  </Menu>
);

// SidebarItem href={undefined} → ButtonItemProps branch.
export const HrefControl_SidebarItemUndef = (
  <Sidebar>
    <SidebarNav>
      <SidebarItem href={undefined}>Acción</SidebarItem>
    </SidebarNav>
  </Sidebar>
);

// SidebarItem href="..." → AnchorItemProps branch.
export const HrefControl_SidebarItemString = (
  <Sidebar>
    <SidebarNav>
      <SidebarItem href="/perfil">Perfil</SidebarItem>
    </SidebarNav>
  </Sidebar>
);

// NavbarLogo href={undefined} → AsDiv branch (third discriminator
// type con literal `?: undefined`; cubre la tercera componente de la
// familia para blindar la regresión a tres frentes).
export const HrefControl_NavbarLogoUndef = (
  <NavbarLogo href={undefined}>Marca</NavbarLogo>
);

// NavbarLogo href="..." → AsAnchor branch.
export const HrefControl_NavbarLogoString = (
  <NavbarLogo href="/">Marca</NavbarLogo>
);

// ─── Chip (A-TYPES-02, gate 1.0.0) ──────────────────────────────────
// Chip no estaba en este fixture, y por eso la matriz EOPT del gate
// anterior salió 14/14 verde: cobertura de fixture, no ausencia de
// defecto. Sus props condicionales rompían con EOPT porque el union
// discriminado envuelve los miembros en ParenthesizedTypeNode y el
// clasificador no lo atravesaba.
export const Chip_SelectableCond = (
  <Chip selectable={Math.random() > 0.5 ? false : undefined}>x</Chip>
);

// `prop={undefined}` es el idioma que el DS BENDICE y blinda con
// fixtures para `href`. Que Chip lo rechace es romper una convención de
// contrato del propio DS, no solo un tipo.
export const Chip_SelectableUndef = <Chip selectable={undefined}>x</Chip>;
