#!/bin/bash

source .travis/is-bump-commit.sh

if isBumpCommit
then
  echo "Skipping install step for version bump commit"
  exit 0
fi

npm install

# If bower configuration and bower command are present install bower dependencies
if [ -f bower.json ] && which bower > /dev/null
then
  bower install
fi
