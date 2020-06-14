require "ovto"

class Page < Ovto::App
  class State < Ovto::State
    item :img_path, default: "/favicon.png"
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
        o "br"
        o "img", { src: state.img_path }
      end
    end

    def setup
      puts "setup"
    end
  end
end

Page.run(id: "ovto")
