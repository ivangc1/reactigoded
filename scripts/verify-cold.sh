#!/usr/bin/env bash
# verify-cold.sh — verify rápido sin cache, con exit codes reales.
#
# CLAUDE.md > "Verify cold — protocolo obligatorio": prohibido el patrón
# `npm run X 2>&1 | tail -N` para gating porque `tail` siempre devuelve
# exit 0. Este script encadena los checks con `||` para que cada fallo
# pare la cadena con mensaje explícito.
#
# Uso:
#   bash scripts/verify-cold.sh                      # lint + typecheck + test:unit (toda la suite)
#   bash scripts/verify-cold.sh src/components/Foo   # lint + typecheck + tests del path indicado
#
# Cold = borra tsconfig.tsbuildinfo antes para paridad con el CI strict.

set -u

TEST_PATHS="${*:-}"

rm -f tsconfig.tsbuildinfo

npm run lint || { echo ">>> LINT FAIL"; exit 1; }
npm run typecheck || { echo ">>> TYPECHECK FAIL"; exit 1; }

if [ -n "$TEST_PATHS" ]; then
  # shellcheck disable=SC2086
  npx vitest run --project unit $TEST_PATHS || { echo ">>> TESTS FAIL ($TEST_PATHS)"; exit 1; }
else
  npx vitest run --project unit || { echo ">>> TESTS FAIL"; exit 1; }
fi

echo "=== VERIFY COLD GREEN ==="
