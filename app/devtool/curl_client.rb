require "json"

path = ARGV.shift
rest = ARGV

json = `curl http://localhost:65432/api/#{path}`

puts JSON.pretty_generate(
  JSON.parse(json)
)
