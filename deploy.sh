#!/bin/bash

pack(){
  mkdir -p tmp
  (
    cd tmp
    rm -rf app
    cp -rp ../app .
    tar cf app.tar.gz app/
  )
}

main(){
  pack
  # scp tmp/app.tar.gz {...}
  # scp deploy_remote.sh {...}
  # down
  # ssh {...} deploy_remote.sh
  # up
}

main
