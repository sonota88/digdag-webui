#!/bin/bash


print_target_files(){
  find ovto/ | egrep '\.rb$'
}

echo "--------"
print_target_files
echo "--------"

bundle exec ifchanged --do 'rake build_js' $(find ./ovto/ -name "*.rb")
