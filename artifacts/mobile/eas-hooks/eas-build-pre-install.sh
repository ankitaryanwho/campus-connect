#!/usr/bin/env bash
set -eo pipefail

echo ">>> EAS pre-install hook: fixing pnpm lockfile compatibility"

# Move to monorepo root (EAS copies everything to /home/expo/workingdir/build)
BUILD_ROOT="${EAS_BUILD_WORKINGDIR:-$(pwd)}"
cd "$BUILD_ROOT"

echo ">>> Working directory: $(pwd)"
echo ">>> pnpm version: $(pnpm --version)"

# The committed pnpm-lock.yaml uses lockfileVersion 9 (pnpm 9/10),
# but the EAS build environment ships with an older system pnpm.
# Delete the incompatible lockfile so pnpm can regenerate a compatible one.
if [ -f "pnpm-lock.yaml" ]; then
  echo ">>> Removing incompatible lockfile (lockfileVersion 9)"
  rm pnpm-lock.yaml
fi

echo ">>> Running pnpm install --no-frozen-lockfile to generate compatible lockfile"
pnpm install --no-frozen-lockfile

echo ">>> Pre-install hook complete. Fresh lockfile written."
