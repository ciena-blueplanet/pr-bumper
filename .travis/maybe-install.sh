#!/bin/bash

source .travis/is-bump-commit.sh

if isBumpCommit
then
  echo "Skipping install step for version bump commit"
  exit 0
fi

npm install
