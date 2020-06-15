require "ovto"

class Page < Ovto::App
  class State < Ovto::State
    item :attempt_id, default: nil
    item :img_path, default: "/favicon.png"
    item :refresh_interval_delta, default: 60 * 5
    item :next_refresh, default: Time.now
    item :rand_value, default: 0
    item :width_percent, default: 50
  end

  class Actions < Ovto::Actions
    def update_img_path(state:, path:)
      { img_path: path }
    end

    def refresh(state:)
      puts "refresh"
      # TODO embed env
      # TODO embed attempt id
      Ovto.fetch("/api/devel/attempts/#{state.attempt_id}/graph_ovto").then{ |data|
        actions.update_img_path(
          path: data["path"]
        )
      }.fail{ |e|
        p e
      }

      nil
    end

    def update_rand(state:)
      { rand_value: rand(9999) }
    end

    def interval(state:)
      if state.next_refresh < Time.now
        actions.refresh()

        interval_delta = state.refresh_interval_delta + 2
        if 60 * 10 < interval_delta
          interval_delta = 60 * 10
        end

        return {
          refresh_interval_delta: interval_delta,
          next_refresh: Time.now + state.refresh_interval_delta
        }
      end

      nil
    end

    def update_attempt_id(state:, attempt_id: attempt_id)
      {
        attempt_id: attempt_id
      }
    end

    def boost(state:)
      { refresh_interval_delta: 2 }
    end
  end

  class MainComponent < Ovto::Component
    def interval_delta_display
      if state.refresh_interval_delta < 60
        "%d sec" % state.refresh_interval_delta
      else
        min = state.refresh_interval_delta / 60.0
        "%.02f min" % min
      end
    end

    def rest_display
      sec = (state.next_refresh - Time.now).round

      if sec < 60
        "%d sec" % sec
      else
        min = sec / 60.0
        "%.02f min" % min
      end
    end

    def render(state:)
      o "div", { style: { "font-family" => "monospace" } } do
        o "h1", "fdsa"
        o "button", {
            onclick: ->(ev){ actions.refresh }
          }, "refresh"

        o "text", "img_path (#{ state.img_path })"
        # o "text", " / interval_delta (#{ state.refresh_interval_delta / 60.0 } min) "
        o "text", " / interval_delta (#{ interval_delta_display }) "
        o "text", " / rest (#{ rest_display }) "
        o "text", " / next_refresh (#{ state.next_refresh.strftime("%T") })"
        o "text", " / rand_value (#{ state.rand_value })"

        o "button", {
            onclick: ->(ev){ actions.boost() }
          }, "boost"

        o "br"
        o "img", { src: state.img_path,
            style: { width: "#{ state.width_percent }%" }
          }
      end
    end
  end

  def setup
    puts "setup"

    url = `location.href`
    m = url.match(%r{/attempts/(\d+)/})
    attempt_id = m[1]
    actions.update_attempt_id(attempt_id: attempt_id)

    actions.refresh()

    Native(`window`).setInterval(
      ->{
        actions.update_rand()
        actions.interval()
      },
      2000
    )
  end
end

Page.run(id: "ovto")
