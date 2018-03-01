#!/bin/bash
source $(dirname $0)/is-bump-commit.sh

if isBumpCommit
then
  echo "Skipping pr-bumper cat log step for version bump commit"
  exit 0
fi

if [ "$TRAVIS_NODE_VERSION" != "${PUBLISH_NODE_VERSION:-8.1.2}" ]
then
  echo "Skipping pr-bumper cat log step for TRAVIS_NODE_VERSION [${TRAVIS_NODE_VERSION}]"
  exit 0
fi

LOG_FILE=pr-bumper-log.json
if [ $# -eq 1 ]
then
    LOG_FILE=$1
fi

if [ -e $LOG_FILE ]
then
    cat $LOG_FILE
else
    echo "No $LOG_FILE to cat"
fi
