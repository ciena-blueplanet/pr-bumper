#!/bin/bash

if [ "$TRAVIS_NODE_VERSION" != "6.9.1" ]
then
  echo "Skipping coverage publish for TRAVIS_NODE_VERSION ${TRAVIS_NODE_VERSION}"
  exit 0
fi

if which coveralls > /dev/null
then
  cat coverage/lcov.info | coveralls
else
  bash <(curl -s https://codecov.io/bash) -f coverage/coverage.json
fi
