#!/bin/bash
source $(dirname $0)/is-bump-commit.sh

if isBumpCommit
then
  echo "Skipping pr-bumper bump step for version bump commit"
  exit 0
fi

if [ "$TRAVIS_NODE_VERSION" != "${PUBLISH_NODE_VERSION:-8.1.2}" ]
then
  echo "Skipping pr-bumper bump step for TRAVIS_NODE_VERSION [${TRAVIS_NODE_VERSION}]"
  exit 0
fi

PACKAGE_NAME=$(node -p -e "require('./package.json').name")

if [ "$PACKAGE_NAME" == "pr-bumper" ]
then
  VERBOSE=1 ./bin/cli.js bump
else
  pr-bumper bump
fi
