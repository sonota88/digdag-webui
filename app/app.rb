# coding: utf-8
require "sinatra"

# デフォルトでは development でだけ有効になる
require "sinatra/reloader"

set :method_override, true

require "pp"
require "json"
require "digdag_client"
require "digdag_utils"

require "./lib/erb_context"
require "./lib/myhash"

$PROFILE =
  if settings.production?
    :prod
  elsif settings.development?
    :devel
  elsif settings.test?
    :test
  else
    raise "something wrong"
  end

# set :port, 4567

# if $PROFILE == :devel
#   set :bind, '0.0.0.0'
# end

# server_settings = {}
# if $PROFILE == :devel
#   server_settings[:DoNotReverseLookup] = true
# end
# set :server_settings, server_settings


def puts_e(*args)
  args.each{ |arg| $stderr.puts arg }
end

def p_e(*args)
  args.each{ |arg| $stderr.puts arg.inspect }
end

def pp_e(*args)
  args.each{ |arg| $stderr.puts arg.pretty_inspect }
end

$TEMPLATE_CACHE = {}

def load_template(name)
  puts_e "load_template (#{name})"

  body = File.read(File.join("views", name + ".html"))
  header = File.read("views/_header.html")
  footer = File.read("views/_footer.html")

  $TEMPLATE_CACHE[name] = ERB.new(header + body + footer)
end

def _render(name, context)
  if $PROFILE == :prod
    if $TEMPLATE_CACHE.key?(name)
      ;
    else
      load_template(name)
    end
  else
    load_template(name)
  end

  erb = $TEMPLATE_CACHE[name]
  erb.result ErbContext.hash_to_binding(context)
end


def _render_dyn(body, context={})
  header = File.read("views/_header.html")
  footer = File.read("views/_footer.html")
  erb = ERB.new(header + body + footer)
  erb.result ErbContext.hash_to_binding(context)
end

def _render_dyn_js(js_name, context={})
  body = <<-EOB
    <div id="main"></div>
    <script src="/js/#{js_name}.js"></script>
  EOB

  _render_dyn(body)
end


def _api(params)
  result = {}
  context = {
    :errors => []
  }

  begin
    api_params = JSON.parse(params[:_params])
    pp_e api_params if $PROFILE == :devel
    result = yield(api_params, context)
  rescue => e
    $stderr.puts e.class, e.message, e.backtrace
    context[:errors] << {
      :msg => "#{e.class}: #{e.message}",
      :trace => e.backtrace.join("\n")
    }
  end

  content_type :json
  JSON.generate({
    "errors" => context[:errors],
    "result" => result
  })
end

def _api_v2(params)
  result = {}
  context = {
    :errors => []
  }

  begin
    api_params = Myhash.new( JSON.parse(params[:_params]) )
                 .to_sym_key
                 .to_snake
                 .to_plain
    pp_e api_params if $PROFILE == :devel
    result = yield(api_params, context)
  rescue => e
    $stderr.puts e.class, e.message, e.backtrace
    context[:errors] << {
      :msg => "#{e.class}: #{e.message}",
      :trace => e.backtrace.join("\n")
    }
  end

  result_lcc = Myhash.new(result)
               .to_lcc
               .to_plain

  content_type :json
  JSON.generate({
    "errors" => context[:errors],
    "result" => result_lcc
  })
end

# --------------------------------

# ruby - Sinatra - terminate server from request - Stack Overflow
# https://stackoverflow.com/questions/19523889/sinatra-terminate-server-from-request
get "/shutdown" do
  if $PROFILE == :devel
    self_pid = Process.pid
    puts_e "shutdown ... (#{self_pid})"
    Thread.new do
      sleep 1
      Process.kill(:KILL, self_pid)
    end
    halt "bye\n"
  else
    "invalid operation"
  end
end

get "/api/sample" do
  _api_v2(params) do |_params|
    puts_e "-->> GET /api/sample"
    {
      :aa => 321,
      :aa_bb => {
        :cc_dd => 456
      },
      :_params => _params
    }
  end
end

get "/api/reload_libs" do
  _api_v2(params) do |_params|
    puts_e "-->> GET /api/reload_libs"

    return {} if $PROFILE == :prod

    load "./lib/erb_context.rb"
    load "./lib/myhash.rb"

    {}
  end
end

# --------------------------------

get "/" do
  <<-EOB
  <pre>
    <a href="/devel/projects">devel</a>
    <a href="/prod/projects">prod</a>
  </pre>
  EOB
end

# --------------------------------

ENDPOINT_MAP = {
  :devel => "http://localhost:65432",
  :prod => "http://localhost:65432",
}

def endpoint(env)
  unless ENDPOINT_MAP.key?(env)
    raise "invalid env"
  end

  ENDPOINT_MAP[env]
end

# --------------------------------

get "/:env/projects" do
  _render_dyn_js("project/page_index")
end

get "/api/:env/projects" do
  env = params[:env].to_sym
  _api_v2 (params) do |_params|
    client = Digdag::Client.new(
      endpoint: endpoint(env)
    )

    pjs = client.get_projects()
      .map{ |api_pj|
        DigdagUtils::Project.from_api_data(api_pj)
      }

    {
      projects: pjs.map{ |pj| pj.to_plain }
    }
  end
end
