#!/bin/sh

yarn --version >NUL 2>&1 && (
  yarn run lint && yarn test
) || (
  grep --version >NUL 2>&1 && (
    npm run lint && yarn test
  ) || (
    echo You need either Yarn or WSL to work on windows
  )
)
