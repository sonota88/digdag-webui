#!/bin/bash

__dir__() {
  local real_path="$(readlink --canonicalize "$0")"
  (
    cd "$(dirname "$real_path")"
    pwd
  )
}

cd "$(__dir__)"

gnome-terminal -e "/bin/bash -c
  \"
    ./run.sh up $1
    if [ \$? -ne 0 ]; then
      sleep 60
    fi
  \"
" &
