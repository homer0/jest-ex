#!/bin/sh

yarn --version >null 2>&1 && (
  yarn run build
) || (
  grep --version >null 2>&1 && (
    npm run build
  ) || (
    echo You need either Yarn or WSL to work on windows
  )
)
