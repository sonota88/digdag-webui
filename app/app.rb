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
# Patches

module Digdag
  class Client
    module Workflow
      # Project#get_workflow との衝突を避けるためのワークアラウンド
      # 本来は Project#get_workflow の方をリネームして
      # Workflow#get_workflow を生かすべき？
      def get_workflow_by_id(id)
        get("workflows/#{id}")
      end
    end
  end
end

require "digdag_utils/task"

module DigdagUtils
  class Workflow
  end

  class Session
  end

  class Attempt
    def initialize(
          id:               nil,
          done:             nil,
          success:          nil,
          cancel_requested: nil
        )
      @id               = id
      @done             = done
      @success          = success
      @cancel_requested = cancel_requested
    end
    
    def self.from_api_response(data)
      new(
        id:               data["id"],
        done:             data["done"],
        success:          data["success"],
        cancel_requested: data["cancelRequested"]
      )
    end

    def to_plain
      {
        id:               @id,
        done:             @done,
        success:          @success,
        cancel_requested: @cancel_requested,
      }
    end
  end

  class Task
    attr_reader :full_name
    attr_reader :parent_id, :upstreams
    attr_reader :is_group

    def initialize(
      id: nil,
      name: nil,
      state: nil,
      full_name:        nil,
      cancel_requested: nil,
      parent_id:        nil,
      upstreams:        nil,
      is_group:         nil
    )
      @id = id
      @name = name
      @state = state
      @full_name        = full_name
      @cancel_requested = cancel_requested
      @parent_id        = parent_id
      @upstreams        = upstreams
      @is_group         = is_group
    end

    def self.from_api_response(data)
      new(
        id:               data["id"],
        full_name:        data["fullName"],
        state:            data["state"],
        cancel_requested: data["cancelRequested"],
        parent_id:        data["parentId"],
        upstreams:        data["upstreams"],
        is_group:         data["isGroup"]
      )
    end
  end
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


get "/:env/projects/:id" do
  _render_dyn_js("project/page_show")
end

get "/api/:env/projects/:id" do
  env = params[:env].to_sym
  pj_id = params[:id]

  _api_v2 (params) do |_params|
    client = Digdag::Client.new(
      endpoint: endpoint(env)
    )

    wfs = client.get_workflows(pj_id)
      .map{ |api_wf|
        DigdagUtils::Workflow.from_api_response(api_wf)
      }

    {
      workflows: wfs.map{ |wf| wf.to_plain }
    }
  end
end


get "/:env/workflows/:id" do
  _render_dyn_js("workflow/page_show")
end

get "/api/:env/workflows/:id" do
  env = params[:env].to_sym
  wf_id = params[:id]

  _api_v2 (params) do |_params|
    client = Digdag::Client.new(
      endpoint: endpoint(env)
    )

    wf =
      DigdagUtils::Workflow.from_api_response(
        client.get_workflow_by_id(wf_id)
      )
    pj_id = wf.project.id

    sessions = client.get_sessions_of_project(pj_id)
      .map{ |api_session|
        DigdagUtils::Session.from_api_response(api_session)
      }

    {
      sessions: sessions.map{ |s| s.to_plain }
    }
  end
end


get "/:env/sessions/:id" do
  _render_dyn_js("session/page_show")
end

get "/api/:env/sessions/:id" do
  env = params[:env].to_sym
  sess_id = params[:id]

  _api_v2 (params) do |_params|
    client = Digdag::Client.new(
      endpoint: endpoint(env)
    )

    attempts = client.get_session_attempts(sess_id, nil)["attempts"]
      .map{ |api_att|
        DigdagUtils::Attempt.from_api_response(api_att)
      }

    {
      attempts: attempts.map{ |att| att.to_plain }
    }
  end
end


def make_graph(tasks, img_path)

  node_defs = []
  tasks.each{|t|
    name = t.full_name.split("+").last
    # label = t.full_name
    label = "+" + name

    if t.is_group
      label += "(G)"
    end

    case t.state
    when "error"
      label += " / st=E"
    when "group_error"
      label += " / st=GE"
    when "success"
      # do nothing
    else
      label += " / st=#{t.state}"
    end

    fillcolor =
      case t.state
      when "error"       then "#ff8888"
      when "group_error" then "#ffaa88"
      else
        if t.is_group
          "#dddddd"
        else
          "#eeeeee"
        end
      end

    node_defs << %Q!  #{t.id} [ label = "#{label}", fillcolor = "#{fillcolor}" ]!
  }

  deps = []
  tasks.each{|t|
    deps << "  #{t.id} -> #{t.parent_id || 'root'};"

    t.upstreams.each{|uid|
      deps << "  #{t.id} -> #{uid} [ style = \"dashed\" ];"
    }
  }

  src = <<-EOB
digraph gname {
  graph [
    rankdir = RL;
    fontname = "monospace";
  ]

  node [
    fontname = "monospace";
    style = "filled, rounded";
    color = "#444444";
    fillcolor = "#eeeeee";
    shape = "box";
  ]

  edge [
    color = "#444444"
  ]

  # node_id [ label = "..." ]
  root [ label = "root" ]
  #{node_defs.join("\n")}

  # node_id -> node_id
  #{ deps.join("\n") }
}
  EOB

  puts_e src

  src_path = File.join(__dir__, "public/graph/tmp.txt")

  open(src_path, "wb"){ |f| f.puts src }

  system %Q! dot -Tsvg "#{src_path}" -o "#{img_path}" !
end


get "/api/:env/attempts/:id/graph" do
  env = params[:env].to_sym
  att_id = params[:id]

  _api_v2 (params) do |_params|
    client = Digdag::Client.new(
      endpoint: endpoint(env)
    )

    pp_e [355, client.get_tasks_of_attempt(att_id)
         ]

    tasks = client.get_tasks_of_attempt(att_id)
      .map{ |api_task|
        DigdagUtils::Task.from_api_response(api_task)
      }

    img_id = "000"
    img_path = File.join(
      __dir__,
      "public/graph/#{img_id}.svg",
    )

    make_graph(tasks, img_path)

    {
      path: "/graph/#{img_id}.svg"
    }
  end
end
