#!/bin/bash

__dir__() {
  local real_path="$(readlink --canonicalize "$0")"
  (
    cd "$(dirname "$real_path")"
    pwd
  )
}

cd "$(__dir__)"

APP_ENV=production \
  ./run.sh up "$@"
