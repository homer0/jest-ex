#!/bin/sh

yarn --version >null 2>&1 && (
  yarn
) || (
  grep --version >null 2>&1 && (
    npm install
  ) || (
    echo You need either Yarn or WSL to work on windows
  )
)
