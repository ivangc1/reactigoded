/**
 * `reactigoded/server-safe` — subset re-exportable desde React Server
 * Components (RSC).
 *
 * Re-exporta UNICAMENTE los componentes marcados `@server-safe` en el
 * codebase. Un gate AST del repo (que NO viaja en el paquete) verifica
 * en cada build que cada uno cumple:
 *
 *   1. NO `"use client"` directive.
 *   2. NO acceso a client globals (`document`/`window`/`navigator`/
 *      `process`/`Buffer`/`globalThis`/`requestAnimationFrame`/etc.)
 *      en render path.
 *   3. NO hooks deferred-only (`useEffect`, `useLayoutEffect`,
 *      `useInsertionEffect`) sin guard SSR.
 *   4. Render determinístico (double-render idempotence).
 *
 * El alcance de esa verificación es el del gate, no una garantía
 * absoluta: sus fronteras declaradas están en
 * `docs/server-safe-limitations.md` del repositorio. Decir "garantiza"
 * a secas, y citar un script que el consumer no puede ejecutar porque
 * no está en el tarball, prometía más de lo comprobable (E33-F1).
 *
 * Importable desde un Server Component (Next.js App Router, Astro
 * server islands, Remix loaders, etc.) sin `"use client"`. Para los
 * componentes interactivos (Dialog, Menu, Toast Provider, Tooltip,
 * Switch, ThemeToggle, etc.) usar el barrel root `reactigoded` desde
 * un Client Component.
 *
 * Resolución automática: el campo `exports["."]["react-server"]` del
 * `package.json` apunta a esta entry. Cuando el bundler resuelve la
 * dep en contexto RSC (Next.js > 13 App Router, etc.), `import { X }
 * from "reactigoded"` carga `dist/server-safe.js` automáticamente.
 *
 * Para importar explícitamente sin depender de la condición:
 * `import { X } from "reactigoded/server-safe"` (ver
 * `package.json#exports["./server-safe"]`).
 *
 * D1-P3 (beta.24).
 */

// Presentational (re-export por archivo, paralelo a los 36 markers
// detectados por el gate `test:server-safe-markers`).
export * from "@/components/Avatar/AvatarGroup";
export * from "@/components/Badge/Badge";
export * from "@/components/Breadcrumb/BreadcrumbItem";
export * from "@/components/Button/Button";
export * from "@/components/Button/IconButton";
export * from "@/components/Card/CardBody";
export * from "@/components/Card/CardDivider";
export * from "@/components/Card/CardFooter";
export * from "@/components/Card/CardHeader";
export * from "@/components/Card/CardImage";
export * from "@/components/Chip/Chip";
export * from "@/components/Dialog/DialogBody";
export * from "@/components/Dialog/DialogFooter";
export * from "@/components/Divider/Divider";
export * from "@/components/Input/ErrorText";
export * from "@/components/Input/Helper";
export * from "@/components/Input/InputAddon";
export * from "@/components/Input/InputGroup";
export * from "@/components/Input/Label";
export * from "@/components/Navbar/NavbarActions";
export * from "@/components/Navbar/NavbarLogo";
export * from "@/components/Navbar/NavbarLink";
export * from "@/components/Navbar/NavbarMenuButton";
export * from "@/components/Progress/Progress";
export * from "@/components/Radio/Radio";
export * from "@/components/Sidebar/SidebarDivider";
export * from "@/components/Sidebar/SidebarFooter";
export * from "@/components/Sidebar/SidebarHeader";
export * from "@/components/Sidebar/SidebarSection";
export * from "@/components/Skeleton/Skeleton";
export * from "@/components/Spinner/Spinner";
export * from "@/components/Stepper/Step";
export * from "@/components/Table/Table";
export * from "@/components/Timeline/Timeline";
export * from "@/components/Timeline/TimelineItem";
export * from "@/components/Toast/Toast";
