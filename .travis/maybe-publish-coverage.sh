#!/bin/bash

if [[ ! "${PUBLISH_NODE_VERSION:-8.1.2}" =~ ^$TRAVIS_NODE_VERSION ]]
then
  echo "Skipping coverage publish for TRAVIS_NODE_VERSION [${TRAVIS_NODE_VERSION}]"
  exit 0
fi

if which coveralls > /dev/null
then
  cat coverage/lcov.info | coveralls
else
  bash <(curl -s https://codecov.io/bash) -f coverage/coverage.json
fi
