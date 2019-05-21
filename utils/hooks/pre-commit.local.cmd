#!/bin/sh

yarn --version >nul 2>&1 && (
  yarn run lint && yarn test
) || (
  grep --version >nul 2>&1 && (
    npm run lint && yarn test
  ) || (
    echo You need either Yarn or WSL to work on windows
  )
)
