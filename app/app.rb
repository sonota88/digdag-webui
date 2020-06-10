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

ENDPOINT_MAP = {
  :devel => "http://localhost:65432",
  :prod => "http://localhost:65432",
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
  class Workflow
  end

  class Session
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

    wfs = client.get_workflows(pj_id)
      .map{ |api_wf|
        DigdagUtils::Workflow.from_api_response(api_wf)
      }

    {
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
      project: wf.project.to_plain,
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

    attempts = client.get_session_attempts(sess_id, nil)["attempts"]
      .map{ |api_att|
        DigdagUtils::Attempt.from_api_response(api_att)
      }

    {
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

    {
      attempt: att.to_plain,
    }
  end
end


class TaskNode
  extend Forwardable

  @@node_id_max = 0

  def_delegators(
    :@task,
    :id, :parent_id, :is_group, :full_name, :state,
    :cancel_requested, :upstreams
  )

  attr_reader :task, :node_id, :is_dummy
  attr_accessor :parent_node_id, :upstream_node_ids

  def initialize(task, is_dummy: false)
    @children = []
    @task = task

    @@node_id_max += 1
    @node_id = "n" + @@node_id_max.to_s

    @is_dummy = is_dummy
    @parent_node_id = nil
    @upstream_node_ids = []
  end

  def add_child(c)
    @children << c
  end

  def root?
    parent_id.nil?
  end

  def indent(depth, line)
    ("  " * depth) + line
  end

  def to_graph(depth=0)
    next_depth = depth + 1

    lines = []
    if is_group
      lines << indent(depth, "subgraph cluster_#{@node_id} {")
      lines << indent(depth, %Q!  color = "#cccccc"; !)
      # lines << %Q!    fillcolor = "#f8f8f8"; !
      lines << indent(depth, %Q!  style = "rounded"; !)

      lines << indent(depth, "  #{@node_id};")

      @children.each{ |child|
        lines += child.to_graph(next_depth)
      }

      if 2 <= @children.size
        rank_same = @children.map{ |c| '"' + c.node_id + '";' }.join(" ")
        lines << indent(depth, "  { rank=same; #{rank_same} }")
      end

      lines << indent(depth, "} # subgraph cluster_#{@node_id}")
    else
      lines << indent(depth, "#{@node_id};")
      @children.each{ |child|
        lines += child.to_graph(next_depth)
      }
    end

    lines
  end

  def to_graph_v2(depth=0)
    next_depth = depth + 1

    lines = []
    if is_group
      lines << indent(depth, "subgraph cluster_#{@node_id} {")
      lines << indent(depth, %Q!  color = "#cccccc"; !)
      # lines << %Q!    fillcolor = "#f8f8f8"; !
      lines << indent(depth, %Q!  style = "rounded"; !)

      lines << indent(depth, "  #{@node_id};")

      if 2 <= @children.size
        rank_same = @children.map{ |c| '"' + c.node_id + '";' }.join(" ")
        lines << indent(depth, "  { rank=same; #{rank_same} }")
      end

      lines << indent(depth, "} # subgraph cluster_#{@node_id}")

      @children.each{ |child|
        lines += child.to_graph_v2(next_depth)
      }
    else
      lines << indent(depth, "#{@node_id};")
      @children.each{ |child|
        lines += child.to_graph_v2(next_depth)
      }
    end

    lines
  end

  def debug
    {
      nid: @node_id,
      parent_nid: @parent_node_id,
      up_nids: @upstream_node_ids,
      is_d: @is_dummy,
      task: {
        is_g: @task.is_group,
      }
    }
  end
end

def make_graph_make_label(tn)
  label = "< "

  if tn.is_dummy
    label += "DUMMY "
  end

  label += tn.node_id
  label += " "

  label += "("
  label += tn.id

  if tn.is_group
    label += " G"
  end

  label += ")"

  label += "<br />"
  name = tn.full_name.split("+").last
  label += "+" + name

  case tn.state
  when "success"
    # do nothing
  else
    label += "<br />"
    label += "st=#{tn.state}"
  end

  if tn.cancel_requested
    label += "<br />"
    label += "cancel_requested"
  end

  label += " >"

  label
end

def task_bg_color(t)
  case t.state
  when "running"       then "#ccff00"
  when "planned"       then "#88eeff"
  when "blocked"       then "#ccffff"
  when "retry_waiting" then "#ddaaff"
  when "error"         then "#ffbbbb"
  when "group_error"   then "#ffdddd"
  when "canceled"      then "#ddcc88"
  else # success
    if t.is_group
      "#dddddd"
    else
      "#eeeeee"
    end
  end
end

def task_bg_color_v2(t)
  case t.state
  when "running"       then "#88d4ff"
  when "planned"       then "#c0eeff"
  when "blocked"       then "#dddddd"
  when "retry_waiting" then "#ddaaff"
  when "error"         then "#ffbbbb"
  when "group_error"   then "#ffdddd"
  when "canceled"      then "#ddcc88"
  when "success"
    "#ddffcc"
  else
    raise "not yet supported"
  end
end

def make_node_map(tasks)
  # id => node_id
  id_map = {}

  tnodes = tasks.map{ |t|
    TaskNode.new(t)
  }
  tnodes.each{ |tn|
    id_map[tn.id] = tn.node_id
  }

  tnodes.each{ |tn|
    if tn.parent_id
      tn.parent_node_id = id_map[tn.parent_id]
    end

    tn.upstreams.each{ |tid|
      tn.upstream_node_ids << id_map[tid]
    }
  }

  node_map = {}

  tnodes.each{ |tn|
    if tn.is_group
      dummy = TaskNode.new(tn.task, is_dummy: true)
      id_map[dummy.node_id] = dummy
      parent_node_id = id_map[ tn.task.parent_id ]
      dummy.parent_node_id = parent_node_id
      node_map[dummy.node_id] = dummy

      group = tn
      group.parent_node_id = dummy.node_id # ダミーをグループの親にする
      node_map[group.node_id] = group
    else
      node_map[tn.node_id] = tn
    end
  }

  tnodes = node_map.values

  # グループへの依存をダミーへの依存に付け替え (upstream)
  tnodes.each{ |tn|
    tn.upstream_node_ids =
      tn.upstream_node_ids.map{ |up_nid|
        up_tn = node_map[up_nid]
        if up_tn.is_group
          up_tn.parent_node_id
        else
          up_nid
        end
      }
  }

  # グループからの依存をダミーからの依存に付け替え (upstream)
  tnodes.each{ |tn|
    if tn.is_group && ! tn.is_dummy
      up_nids = tn.upstream_node_ids
      tn.upstream_node_ids = []
      dummy = node_map[tn.parent_node_id]
      dummy.upstream_node_ids = up_nids
    end
  }

  tnodes.each{ |tn|
    if tn.parent_node_id
      tn_p = node_map[tn.parent_node_id]
      tn_c = node_map[tn.node_id]
      tn_p.add_child(tn_c)
    end
  }

  node_map
end

def make_graph(tasks, img_path)
  node_map = make_node_map(tasks)
  tn_root = node_map.values.find{ |tn| tn.root? }
  subgraph_lines = tn_root.to_graph_v2()

  node_defs = []
  node_map.each{ |id, tn|
    label = make_graph_make_label(tn)

    styles = %w(rounded filled bold)

    bg_color = task_bg_color_v2(tn)

    border_color =
      if tn.state == "error"
        "#ee0000"
      else
        bg_color
      end

    node_def = %Q!  #{tn.node_id} [ !
    node_def += %Q! label = #{label} !
    node_def += %Q! ,color = "#{border_color}" !
    node_def += %Q! ,fillcolor = "#{bg_color}" !
    node_def += %Q! ,style = "#{ styles.join(", ") }" !
    node_def += %Q! ]!
    node_defs << node_def
  }

  deps = []
  node_map.each{ |id, tn|
    if tn.parent_node_id
      deps << "  #{tn.parent_node_id} -> #{tn.node_id};"
    end

    tn.upstream_node_ids.each{|uid|
      deps << %Q!  #{tn.node_id} -> #{uid} [ style = "dashed", arrowhead = "vee" ];!
    }
  }

  src = <<-EOB
digraph gname {
  graph [
    rankdir = LR;
    fontname = "monospace";
  ]

  node [
    fontname = "monospace";
    style = "filled, rounded";
    shape = "box";
  ]

  edge [
    color = "#aaaaaa"
  ]

#{ subgraph_lines.join("\n") }

  # node_id [ label = "..." ]
  #{node_defs.join("\n")}

  # node_id -> node_id
  #{ deps.join("\n") }
}
  EOB

  # puts_e src

  src_path = File.join(__dir__, "public/graph/tmp.txt")

  open(src_path, "wb"){ |f| f.puts src }

  system %Q! dot -Tsvg "#{src_path}" -o "#{img_path}" !
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

    make_graph(tasks, img_path)

    {
      path: "/graph/#{img_id}.svg"
    }
  end
end
