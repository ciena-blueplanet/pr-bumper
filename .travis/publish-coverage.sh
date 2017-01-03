#!/bin/bash

if [ "$TRAVIS_NODE_VERSION" != "6.9.1" ]
then
  echo "Skipping coverage publish for TRAVIS_NODE_VERSION ${TRAVIS_NODE_VERSION}"
  exit 0
fi

bash <(curl -s https://codecov.io/bash) -f coverage/coverage.json
