#!/bin/bash

isBumpCommit() {
  msg=`git log --pretty=format:'%s' -1`
  if [[ "$msg" =~ ^\[pr-bumper\]* ]]
  then
    # totally un-intuitive, but returning 0 evaluates to true when put in a if
    # http://stackoverflow.com/a/5431932
    return 0
  else
    # totally un-intuitive, but returning 1 evaluates to false when put in a if
    # http://stackoverflow.com/a/5431932
    return 1
  fi
}
