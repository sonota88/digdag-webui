require "ovto"

class Page < Ovto::App
  class State < Ovto::State
    item :img_path, default: "/favicon.png"
    item :refresh_interval_min, default: 10.0
  end

  class Actions < Ovto::Actions
    def update_img_path(state:, path:)
      { img_path: path }
    end

    def refresh(state:)
      puts "refresh"
      # TODO embed env
      # TODO embed attempt id
      Ovto.fetch("/api/devel/attempts/1/graph_ovto").then{ |data|
        actions.update_img_path(
          path: data["path"]
        )
      }.fail{ |e|
        p e
      }

      nil
    end

    def change_refresh_interval_min(state:, value: value)
      { refresh_interval_min: value.to_f }
    end
  end

  class MainComponent < Ovto::Component
    def render(state:)
      o "div" do
        o "h1", "fdsa"
        o "button", {
            onclick: ->(ev){ actions.refresh }
          }, "refresh"
        o "text", state.img_path
        o "text", " / "

        o "text", "interval_min"
        o "input", {
            value: state.refresh_interval_min,
            onchange: ->(ev){
              actions.change_refresh_interval_min(
                value: ev.target.value
              )
            }
          }

        o "br"
        o "img", { src: state.img_path }
      end
    end
  end

  def setup
    puts "setup"
    actions.refresh()
  end
end

Page.run(id: "ovto")
