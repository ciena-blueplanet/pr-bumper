#!/bin/bash

source $(dirname $0)/is-bump-commit.sh

if isBumpCommit
then
  echo "Skipping install step for version bump commit"
  exit 0
fi

if [ -z "$1" ]
then
  npm test
else
  npm run $1
fi
