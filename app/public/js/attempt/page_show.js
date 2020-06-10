class Graph {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , h("button"
        , { onclick: ()=>{ __p.onclick_showGraph(); } }
        , "show graph"
        )
      , h("a", { id: "graph_img_link", href: state.graph.src }, "image")

      , ` / ${state.graph.zoom} `
      , h("button", { onclick: ()=>{ __p.onclick_graphZoomOut(); } }, "-")
      , h("button", { onclick: ()=>{ __p.onclick_graphZoomIn(); } }, "+")

      , h("br")

      , h("img", { id: "graph_img"
                   , width: `${state.graph.zoom}%`
                   , src: state.graph.src
                 })
      )
    );
  }
}

class View {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , h("h1", {}, __p.getTitle())
      , h("a"
        , { href: `/${__p.env}/sessions/${state.attempt.session.id}` }
        , "セッションに戻る"
        )

      , h("br")
      , h("a", { href: __p.getOfficialUiUrl() }, "Official UI")
      , " "
      , h("a", { href: __p.getOfficialUiUrl(), target: "_blank" }, "[➚]")
      , ` / pj:${state.project.name}`
      , ` ＞ wf:${state.workflow.name}`
      , ` ＞ s${state.session.id}`
      , ` ＞ a${__p.attemptId}`

      , h("hr")

      , Graph.render(state)

      , h("hr")

      , h("textarea"
        , { style: { width: "90%", height: "10rem" } }
        , JSON.stringify(state.attempt, null, "    ")
        )
      )
    );
  }
}

class Page {
  constructor(){
    this.env = __g.getEnv();
    this.attemptId = this.getAttemptId();
    this.state = {
      attempt: {
        session: {
          id: "0"
        }
      },
      graph: {
        src: null,
        zoom: 50
      }
    };
  }

  getTitle(){
    return "attempt";
  }

  getAttemptId(){
    const m = location.href.match(/\/attempts\/(\d+)/)
    return m[1];
  }

  init(){
    puts("init");
    this.attemptId = this.getAttemptId();

    __g.api_v2("get", `/api/${this.env}/attempts/${this.attemptId}`, {
      }, (result)=>{
      __g.unguard();
      puts(result);
      Object.assign(this.state, result);

      this.render();

      this.showGraph();
      setInterval(
        ()=>{ this.showGraph(); }
        ,1000 * 60 * 5
      );

    }, (errors)=>{
      __g.unguard();
      __g.printApiErrors(errors);
      alert("Check console.");
    });
  }

  render(){
    $("#main")
      .empty()
      .append(View.render(this.state));
  }

  getOfficialUiUrl(){
    return `${this.state.endpoint}/${__g.getEnv()}/attempts/${this.attemptId}`;
  }

  showGraph(){
    puts("onclick_showGraph");
    __g.guard();

    __g.api_v2(
      "get",
      `/api/${this.env}/attempts/${this.attemptId}/graph`,
      {},
      (result)=>{
        __g.unguard();
        puts(result);

        this.state.graph.src = result.path;
        $("#graph_img").attr("src", result.path);
        $("#graph_img_link").attr("href", result.path);
  
      }, (errors)=>{
        __g.unguard();
        __g.printApiErrors(errors);
        alert("Check console.");
      });
  }

  onclick_showGraph(){
    this.showGraph();
  }

  onclick_graphZoomOut(){
    this.state.graph.zoom -= 10;
    if (this.state.graph.zoom < 10) {
      this.state.graph.zoom = 10;
    }
    this.render();
  }

  onclick_graphZoomIn(){
    this.state.graph.zoom += 10;
    this.render();
  }
}

__g.ready(new Page());
