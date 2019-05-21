#!/bin/sh

yarn --version >NUL 2>&1 && (
  yarn
) || (
  grep --version >NUL 2>&1 && (
    npm install
  ) || (
    echo You need either Yarn or WSL to work on windows
  )
)
