# coding: utf-8
class Graph

  def initialize
    @node_id_max = 0
  end

  class TaskNode
    extend Forwardable

    def_delegators(
      :@task,
      :id, :parent_id, :is_group, :full_name, :state,
      :cancel_requested, :upstreams
    )

    attr_reader :task, :node_id, :is_dummy
    attr_accessor :parent_node_id, :upstream_node_ids

    def initialize(task, node_id:, is_dummy: false)
      @children = []
      @task = task

      @node_id = node_id

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

    def to_graph(depth = 0)
      next_depth = depth + 1

      lines = []
      if is_group && ! @is_dummy
        lines << indent(depth, "subgraph cluster_#{@node_id} {")
        lines << indent(depth, %Q!  color = "#cccccc"; !)
        # lines << %Q!    fillcolor = "#f8f8f8"; !
        lines << indent(depth, %Q!  style = "rounded"; !)

        lines << indent(depth, "  #{@node_id};")

        @children.each{ |child|
          lines += child.to_graph(next_depth)
        }

        if 1 <= @children.size
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

    def to_graph_v2(depth = 0)
      next_depth = depth + 1

      lines = []
      if is_group && ! @is_dummy
        lines << indent(depth, "subgraph cluster_#{@node_id} {")
        lines << indent(depth, %Q!  color = "#dddddd"; !)
        lines << indent(depth, %Q!  fillcolor = "#ffffff"; !)
        lines << indent(depth, %Q!  style = "rounded, filled"; !)

        lines << indent(depth, "  #{@node_id};")

        if 1 <= @children.size
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

  def make_label(tn)
    label = "< "

    if tn.is_dummy
      # label += "DUMMY "
      return "<(#{tn.node_id})>"
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
      # label += "<br />"
      label += " / "
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

  def next_node_id
    @node_id_max += 1
    "n#{@node_id_max}"
  end

  def make_node_map(tasks)
    # id => node_id
    id_map = {}

    tnodes = tasks.map{ |t|
      TaskNode.new(t, node_id: next_node_id)
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
        dummy = TaskNode.new(tn.task, node_id: tn.node_id + "_d", is_dummy: true)
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
      label = make_label(tn)

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

      tn.upstream_node_ids.each{|up_nid|
        deps << %Q!  #{tn.node_id} -> #{up_nid} [ style = "dashed", arrowhead = "vee" ];!
      }
    }

    src = <<-EOB
  digraph gname {
    graph [
      rankdir = LR;
      fontname = "monospace";
      bgcolor = "#f4f4f4";
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

    src_path = File.join(__dir__, "../public/graph/tmp.txt")

    open(src_path, "wb"){ |f| f.puts src }

    system %Q! dot -Tsvg "#{src_path}" -o "#{img_path}" !
  end
end
