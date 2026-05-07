# Deploy — Storybook a igoded.es

El sitio Storybook público vive en `igoded.es/storybook/`. Este
documento describe el contrato de deploy actual + opciones de
mejora.

## Estado actual (post-RC1)

El deploy a igoded.es **no está automatizado en este repo**. Lo hace
Iván manualmente o con un cron desde el cPanel de Hostinger:

```
~/domains/igoded.es/public_html/storybook/
```

El comando que el cron/operador **debe** invocar es:

```bash
npm run build-storybook
```

Este script encadena:

1. `storybook build` — emite `./storybook-static/` con todos los assets.
2. `node scripts/fix-storybook-static-lang.mjs` — post-procesa
   `index.html` y `iframe.html` para forzar `<html lang="es">` en el
   HTML estático servido (cierre B-04: SR/Googlebot/no-JS audits ven
   `lang="es"` sin esperar al JS de `managerHead`).

Tras el build, el operador (o el cron) sube `storybook-static/` al
directorio del subdominio.

## Riesgo conocido

Si quien deploya invoca un comando distinto, la regresión B-04
ocurre **silenciosamente**:

- `storybook build` directo (sin el segundo paso) → HTML con
  `<html lang="">` o `<html lang="en">` por defecto.
- `npm run build-storybook:chromatic` → válido para Chromatic
  (sube via API), pero NO incluye el lang fix porque Chromatic ya
  inyecta su propio header.

**Síntomas de regresión silenciosa**:

- View-source del sitio sin `lang="es"` en el `<html>` raíz.
- Lighthouse sin JS dispara warning de a11y por idioma del
  documento.
- Crawlers/no-JS audits leen el sitio como inglés.

## Mitigación actual

`scripts/fix-storybook-static-lang.mjs` emite log explícito al
ejecutarse con el path destino y el número de archivos modificados.
**Si quien deploya NO ve ese log en su pipeline**, es la señal
clara de que NO se está aplicando el fix. Auditar.

## Opciones de mejora (post-1.0.0)

### Opción A — Workflow GitHub Actions con secret Hostinger

Configurar un workflow que se dispare en `push` a `main`:

```yaml
name: deploy-igoded
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run build-storybook
      - name: Upload to Hostinger via SFTP
        uses: SamKirkland/FTP-Deploy-Action@v4
        with:
          server: ${{ secrets.HOSTINGER_HOST }}
          username: ${{ secrets.HOSTINGER_USER }}
          password: ${{ secrets.HOSTINGER_PASS }}
          local-dir: storybook-static/
          server-dir: /domains/igoded.es/public_html/storybook/
```

**Pros**: el script `fix-storybook-static-lang.mjs` siempre corre,
B-04 imposible de regresar silenciosamente.
**Cons**: secrets en GitHub, requiere revisar las credenciales SFTP
de Hostinger.

### Opción B — Documentar el script/cron actual

Si el deploy seguirá siendo manual o cron-based, incluir el script
exacto en este repo (en `scripts/deploy-storybook.sh` o similar)
para que **la fuente de verdad del comando esté versionada**:

```bash
#!/bin/bash
set -euo pipefail
npm run build-storybook   # ← OBLIGATORIO, no usar storybook build directo
rsync -av --delete storybook-static/ user@igoded.es:~/domains/igoded.es/public_html/storybook/
```

**Pros**: cero infraestructura nueva, source-of-truth en repo.
**Cons**: Iván sigue ejecutándolo manualmente, sigue habiendo
margen para que alguien (incluido el propio Iván) invoque el
comando equivocado.

## Acción a tomar

Decidir entre A o B post-1.0.0 según volumen de deploys reales.
Mientras tanto, si revisas la web y NO ves `lang="es"` en
`view-source`:

1. Verificar que `npm run build-storybook` (no `storybook build`
   directo) fue lo invocado.
2. Confirmar que el upload incluyó **todos los archivos** de
   `storybook-static/` (incluyendo `iframe.html`).
3. Re-deployar con el comando correcto.
