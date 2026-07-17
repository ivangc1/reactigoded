/**
 * RSC fixture — D1-P3 (beta.24).
 *
 * Este archivo simula un React Server Component (Next.js App Router,
 * Astro server island, Remix loader, etc.) que importa componentes
 * del DS. NO debe tener `"use client"`. NO debe usar hooks de cliente.
 *
 * El `tsconfig.json` del fixture usa `customConditions: ["react-server"]`
 * y `paths: { reactigoded: "../../dist/server-safe.d.ts" }` para
 * resolver `import { X } from "reactigoded"` al subset server-safe del
 * paquete (lo que el bundler haría en runtime via condicional
 * `react-server` de `package.json#exports`).
 *
 * El gate `test:rsc-fixture` (`npm run test:rsc-fixture`) corre
 * `tsc -p fixtures/rsc/tsconfig.json --noEmit`. Si una regresión
 * elimina un export del subset server-safe (e.g., alguien quita el
 * marker `@server-safe` de Button → Button sale del bundle
 * server-safe → este typecheck rompe).
 *
 * Cobertura: TIPO. No es un test runtime (no se ejecuta el JSX). El
 * test runtime SSR existente es `src/__ssr__.test.tsx`.
 *
 * Imports usados (subset estable del bundle server-safe — solo los
 * componentes marcados `@server-safe` en `scripts/check-server-safe-
 * markers.mjs`). Si alguno se agrega o quita, actualizar este file.
 */
import {
  AvatarGroup,
  Badge,
  BreadcrumbItem,
  Button,
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
  NavbarLogo,
  NavbarLink,
  NavbarMenuButton,
  Progress,
  Radio,
  SidebarDivider,
  SidebarFooter,
  SidebarHeader,
  SidebarSection,
  Skeleton,
  Spinner,
  Step,
  Table,
  Timeline,
  TimelineItem,
  Toast,
} from "reactigoded";

export function ServerPage(): React.ReactElement {
  return (
    <>
      <AvatarGroup>
        <span>AB</span>
      </AvatarGroup>
      <Badge variant="success">OK</Badge>
      <BreadcrumbItem>Home</BreadcrumbItem>
      <Button>Click</Button>
      <IconButton aria-label="close">x</IconButton>
      <CardHeader>Header</CardHeader>
      <CardDivider />
      <CardBody>Body</CardBody>
      <CardFooter>Footer</CardFooter>
      <CardImage src="/x.png" alt="" />
      <Chip>tag</Chip>
      <DialogBody>Body</DialogBody>
      <DialogFooter>Footer</DialogFooter>
      <Divider />
      <ErrorText id="err">Bad</ErrorText>
      <Helper id="h">Hint</Helper>
      <Label htmlFor="email">Email</Label>
      <InputGroup>
        <InputAddon>@</InputAddon>
      </InputGroup>
      <NavbarLogo>App</NavbarLogo>
      <NavbarLink href="/about">About</NavbarLink>
      <NavbarMenuButton aria-label="menu" />
      <NavbarActions>
        <Button>Sign in</Button>
      </NavbarActions>
      <Progress value={42} />
      <Radio name="opt" />
      <SidebarHeader>Sidebar</SidebarHeader>
      <SidebarSection>
        <SidebarDivider />
        <SidebarFooter>Footer</SidebarFooter>
      </SidebarSection>
      <Skeleton />
      <Spinner />
      <Step id="s1">Step</Step>
      <Table>
        <tbody>
          <tr>
            <td>row</td>
          </tr>
        </tbody>
      </Table>
      <Timeline>
        <TimelineItem>event</TimelineItem>
      </Timeline>
      <Toast title="Saved" />
    </>
  );
}
