#!/bin/bash

source $(dirname $0)/is-bump-commit.sh

if isBumpCommit
then
  echo "Skipping pr-bumper check step for version bump commit"
  exit 0
fi

PACKAGE_NAME=$(node -p -e "require('./package.json').name")

if [ "$PACKAGE_NAME" == "pr-bumper" ]
then
  VERBOSE=1 ./bin/cli.js check
else
  pr-bumper check
fi
