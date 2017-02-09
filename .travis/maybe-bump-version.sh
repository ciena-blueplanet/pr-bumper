#!/bin/bash
source $(dirname $0)/is-bump-commit.sh

if isBumpCommit
then
  echo "Skipping pr-bumper bump step for version bump commit"
  exit 0
fi

if [ "$TRAVIS_NODE_VERSION" != "6.9.1" ]
then
  echo "Skipping pr-bumper for TRAVIS_NODE_VERSION ${TRAVIS_NODE_VERSION}"
  exit 0
fi

VERBOSE=1 ./bin/cli.js bump
