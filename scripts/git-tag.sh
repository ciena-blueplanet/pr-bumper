#!/bin/bash

git config --global user.email "builds@travis-ci.com"
git config --global user.name "Travis CI"
export GIT_TAG="v`node -e \"console.log(require('./package.json').version)\"`"
git tag $GIT_TAG -a -m "Generated tag from TravisCI build $TRAVIS_BUILD_NUMBER"
git push -q https://${GITHUB_TOKEN}@github.com/ciena-blueplanet/pr-bumper --tags
