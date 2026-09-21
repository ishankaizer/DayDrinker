#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "DayDrinker needs Node.js installed to run (it's an Electron app)."
  echo "Grab it from https://nodejs.org and re-run this script."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies, this only happens once..."
  npm install
fi

echo "Starting DayDrinker..."
npm start
