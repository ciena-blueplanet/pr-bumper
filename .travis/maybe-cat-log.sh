#!/bin/bash

if [[ ! "${PUBLISH_NODE_VERSION:-8.1.2}" =~ ^$TRAVIS_NODE_VERSION ]]
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
