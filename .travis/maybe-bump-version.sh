#!/bin/bash

if [ "$TRAVIS_NODE_VERSION" != "6.9.1" ]
then
  echo "Skipping pr-bumper for TRAVIS_NODE_VERSION ${TRAVIS_NODE_VERSION}"
  exit 0
fi

VERBOSE=1 ./bin/cli.js bump
