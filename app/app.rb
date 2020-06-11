# coding: utf-8
require "sinatra"

# デフォルトでは development でだけ有効になる
require "sinatra/reloader"

set :method_override, true

require "pp"
require "json"
require "fileutils"
require "digdag_client"
require "digdag_utils"

require "./lib/erb_context"
require "./lib/myhash"
require "./lib/graph"

also_reload "./lib/graph.rb"

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

CONFIG = JSON.parse(
  File.read(
    File.join(__dir__, "config.json")
  )
)

ENDPOINT_MAP = {}
CONFIG["envs"].each{ |env|
  ENDPOINT_MAP[env["name"].to_sym] = env["endpoint"]
}

def endpoint(env)
  ENDPOINT_MAP.fetch(env)
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

module DigdagUtils
  class Project
    def self.from_api_response(data)
      from_api_data(data)
    end
  end

  class Workflow
    def self.from_api_response(data)
      project = DigdagUtils::Project.new(
        id: data["project"]["id"],
        name: data["project"]["name"],
      )

      new(
        id:   data["id"],
        name: data["name"],
        project: project
      )
    end
  end

  class Session
    def initialize(
      id: nil,
      time: nil,
      attempts: nil,
      last_attempt: nil,
      workflow: nil
    )
      @id = id
      @time = time
      @attempts = attempts
      @workflow = workflow
      @last_attempt = last_attempt
    end

    def self.from_api_response(data)
      new(
        id:   data["id"],
        time: data["sessionTime"],
        last_attempt: data["lastAttempt"]
      )
    end

    def to_plain
      plain = {
        id: @id,
        time: @time,
        attempts: @attempts,
        last_attempt: @last_attempt,
      }

      if @workflow
        plain[:workflow] = @workflow.to_plain
      end

      plain
    end
  end

  class Attempt
  end

  class Task
    attr_reader :cancel_requested

    # "stateParams": {
    #   "retry_count": 1
    # },
  end
end

# --------------------------------

def get_client(env)
  Digdag::Client.new(
    endpoint: endpoint(env)
  )
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


get "/:env/projects" do
  _render_dyn_js("project/page_index")
end

get "/api/:env/projects" do
  env = params[:env].to_sym
  _api_v2 (params) do |_params|
    client = get_client(env)

    pjs = client.get_projects()
      .map{ |api_pj|
        DigdagUtils::Project.from_api_data(api_pj)
      }

    {
      projects: pjs.map(&:to_plain)
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
    client = get_client(env)

    pj = DigdagUtils::Project.from_api_response(
      client.get_project(pj_id)
    )

    wfs = client.get_workflows(pj_id)
      .map{ |api_wf|
        DigdagUtils::Workflow.from_api_response(api_wf)
      }

    {
      endpoint: ENDPOINT_MAP[env],
      project: pj.to_plain,
      workflows: wfs.map(&:to_plain)
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
    client = get_client(env)

    wf =
      DigdagUtils::Workflow.from_api_response(
        client.get_workflow_by_id(wf_id)
      )
    pj_id = wf.project.id

    sessions = client.get_sessions_of_project(
      pj_id,
      workflow: wf.name
    )
      .map{ |api_session|
        DigdagUtils::Session.from_api_response(api_session)
      }

    {
      endpoint: ENDPOINT_MAP[env],
      project: wf.project.to_plain,
      workflow: wf.to_plain,
      sessions: sessions.map(&:to_plain)
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
    client = get_client(env)

    sess = client.get_session(sess_id)

    pj = DigdagUtils::Project.from_api_response(
      sess["project"]
    )

    attempts = client.get_session_attempts(sess_id, nil)["attempts"]
      .map{ |api_att|
        DigdagUtils::Attempt.from_api_response(api_att)
      }

    {
      endpoint: ENDPOINT_MAP[env],
      project: pj.to_plain,
      workflow: attempts[0].session.workflow.to_plain,
      attempts: attempts.map(&:to_plain)
    }
  end
end


get "/:env/attempts/:id" do
  _render_dyn_js("attempt/page_show")
end

get "/api/:env/attempts/:id" do
  env = params[:env].to_sym
  att_id = params[:id]

  _api_v2 (params) do |_params|
    client = get_client(env)

    api_att = client.get_attempt(att_id)
    att = DigdagUtils::Attempt.from_api_response(api_att)

    pj = DigdagUtils::Project.new(
      id:   api_att["project"]["id"],
      name: api_att["project"]["name"],
    )
    wf = DigdagUtils::Workflow.new(
      id:   api_att["workflow"]["id"],
      name: api_att["workflow"]["name"],
    )

    {
      endpoint: ENDPOINT_MAP[env],
      project: pj.to_plain,
      workflow: wf.to_plain,
      session: att.session.to_plain,
      attempt: att.to_plain,
    }
  end
end


def graph_del_old
  dir = File.join(__dir__, "public/graph/")

  paths = Dir.glob(dir + "*").to_a

  num_files_max = 100
  return if paths.size < num_files_max

  paths_desc =
    paths
      .sort_by{ |path| File.stat(path).mtime }
      .reverse

  recent_files = paths_desc[0...num_files_max]

  paths
    .reject{ |path| recent_files.include?(path) }
    .each_with_index{ |path, i|
      FileUtils.rm(path)
      puts_e "deleted #{i}: #{path}"
    }
end


get "/api/:env/attempts/:id/graph" do
  env = params[:env].to_sym
  att_id = params[:id]

  graph_del_old()

  _api_v2 (params) do |_params|
    client = get_client(env)

    # pp_e [
    #   "client.get_tasks_of_attempt(att_id)",
    #   client.get_tasks_of_attempt(att_id)
    # ]

    tasks = client.get_tasks_of_attempt(att_id)
      .map{ |api_task|
        DigdagUtils::Task.from_api_response(api_task)
      }

    img_id = Time.now.to_i.to_s
    img_path = File.join(
      __dir__,
      "public/graph/#{img_id}.svg",
    )

    graph = Graph.new
    graph.make_graph(tasks, img_path)

    {
      path: "/graph/#{img_id}.svg"
    }
  end
end
