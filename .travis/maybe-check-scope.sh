#!/bin/bash

source $(dirname $0)/.travis/is-bump-commit.sh

if isBumpCommit
then
  echo "Skipping pr-bumper check step for version bump commit"
  exit 0
fi

VERBOSE=1 ./bin/cli.js check
