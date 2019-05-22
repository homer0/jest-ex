#!/bin/sh

yarn --version >NUL 2>&1 && (
  yarn run lint && yarn test
) || (
  echo "ERROR: You need either Yarn or WSL to work on windows"
  exit 1
)
