/**
 * Consumer-pack fixture — MEDIUM-1 beta.26.
 *
 * Smoke type-check del API público desde el tarball INSTALADO via
 * `npm pack` + `npm install` (no via `compilerOptions.paths`). El
 * orquestador `scripts/test-consumer-pack.mjs` corre `tsc --noEmit`
 * sobre este archivo dos veces:
 *   - `tsconfig.bundler.json`: consumer típico (vite/webpack).
 *   - `tsconfig.nodenext.json`: consumer ESM estricto (NodeNext).
 *
 * Cobertura:
 *   - Root barrel: 5 componentes + 3 types (cubre primitives + compound
 *     surface + hook + cn utility).
 *   - Subpath `/server-safe`: **superficie COMPLETA** — los 44 value-exports
 *     importados POR NOMBRE desde el tarball (era 2/44). Un re-export caído,
 *     un exports-map a un `.d.ts` incompleto, o un `.d.ts` per-componente
 *     irresoluble (import relativo/`@/` roto, contradicción `stripInternal`)
 *     → TS2305/TS2339 aquí, bajo bundler Y NodeNext. Cierra #24 (P2 codex:
 *     la enumeración es lo que garantiza presencia; un `satisfies
 *     Record<string,unknown>` lo pasa cualquier namespace).
 *   - Subpath `/cn`: cn helper individual.
 *
 * Si una regresión rompe el `exports` field, los `.d.ts` resueltos via
 * `node_modules`, o la cadena de peer deps (@floating-ui/react ^0.27
 * pre-1.0), este fixture lo caza pre-publish.
 *
 * NO duplica `fixtures/consumer-types/` y `fixtures/consumer-types-nodenext/`:
 * aquellos prueban resolución via `paths`, este via tarball real.
 * Diferencia capturada por Codex en el cruce beta.25 — el bug NodeNext
 * .d.ts (259× TS2834) era invisible con `paths` y solo emergía con
 * tarball real.
 */
import {
  AlertDialogContent,
  Button,
  FloatingTreeRoot,
  ThemeToggle,
  Tooltip,
  cn,
  useControllableState,
  type AlertDialogContentProps,
  type ButtonProps,
  type TooltipProps,
} from "reactigoded";
// #24 — FREEZE de la superficie server-safe: los 44 value-exports que
// `./server-safe` publica se importan POR NOMBRE desde el tarball. Si el
// barrel cae un re-export, el exports-map apunta a un `.d.ts` incompleto, o
// un `.d.ts` per-componente no resuelve → error de tipos AQUÍ (TS2305/TS2339),
// bajo bundler Y NodeNext. Enumerar es lo que da la garantía: un
// `import * as X` + `X satisfies Record<string, unknown>` NO bastaba —
// cualquier namespace lo satisface, aun con solo Button+Toast (P2 codex #140).
import {
  AvatarGroup,
  Badge,
  BreadcrumbItem,
  Button as ServerButton,
  CardBody,
  CardDivider,
  CardFooter,
  CardHeader,
  CardImage,
  Chip,
  DialogBody,
  DialogFooter,
  Divider,
  ErrorText,
  Helper,
  IconButton,
  InputAddon,
  InputGroup,
  Label,
  NavbarActions,
  NavbarLink,
  NavbarLogo,
  NavbarMenuButton,
  Progress,
  Radio,
  SidebarDivider,
  SidebarFooter,
  SidebarHeader,
  SidebarSection,
  Skeleton,
  SkeletonContainer,
  Spinner,
  Step,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  Timeline,
  TimelineItem,
  Toast,
} from "reactigoded/server-safe";
import { cn as cnSubpath } from "reactigoded/cn";

// Referencia a los 44 → fuerza a tsc a resolver el nombre de cada uno. Si
// alguno falta en el subpath publicado, el gate FALLA (a diferencia del
// namespace+satisfies, que pasaba con la API incompleta).
const _serverSafeFrozen = [
  AvatarGroup, Badge, BreadcrumbItem, ServerButton, CardBody, CardDivider,
  CardFooter, CardHeader, CardImage, Chip, DialogBody, DialogFooter, Divider,
  ErrorText, Helper, IconButton, InputAddon, InputGroup, Label, NavbarActions,
  NavbarLink, NavbarLogo, NavbarMenuButton, Progress, Radio, SidebarDivider,
  SidebarFooter, SidebarHeader, SidebarSection, Skeleton, SkeletonContainer,
  Spinner, Step, Table, TableBody, TableCaption, TableCell, TableFoot,
  TableHead, TableHeaderCell, TableRow, Timeline, TimelineItem, Toast,
];
void _serverSafeFrozen;

const buttonProps: ButtonProps = {
  children: "Guardar",
  variant: "brand",
};

const alertDialogProps: AlertDialogContentProps = {
  children: "Confirmar",
  closeOnBackdrop: false,
};

const tooltipProps: TooltipProps = {
  text: "Ayuda",
  children: <button type="button">?</button>,
};

export function App() {
  const { value, setValue } = useControllableState({
    defaultValue: 1,
    onChange: () => {},
  });

  return (
    <FloatingTreeRoot>
      <Button {...buttonProps} onClick={() => setValue((prev) => prev + 1)}>
        {value}
      </Button>
      <AlertDialogContent {...alertDialogProps} />
      <Tooltip {...tooltipProps} />
      <ThemeToggle aria-label="Cambiar tema" />
      <ServerButton>SSR</ServerButton>
      <Toast title={cn("ok", cnSubpath("server"))} />
    </FloatingTreeRoot>
  );
}
