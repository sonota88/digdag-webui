class View {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , h("h1", {}, __p.getTitle())
      , h("a"
        , { href: `/${__p.env}/sessions/${state.attempt.session.id}` }
        , "セッションに戻る"
        )

      , h("hr")

      , h("textarea"
        , { style: { width: "90%", height: "10rem" } }
        , JSON.stringify(state.attempt, null, "    ")
        )

      , h("hr")

      , h("button"
        , { onclick: ()=>{ __p.onclick_showGraph(); } }
        , "show graph"
        )
      , h("a", { id: "graph_img_link", href: "#"}, "image")

      , ` / ${state.graph.zoom} `
      , h("button", { onclick: ()=>{ __p.onclick_graphZoomOut(); } }, "-")
      , h("button", { onclick: ()=>{ __p.onclick_graphZoomIn(); } }, "+")

      , h("br")

      , h("img", { id: "graph_img"
                   , width: "100%"
                 })
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
      }
      ,graph: {
        zoom: 100
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
        ,10000
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

  showGraph(){
    puts("onclick_showGraph");

    __g.api_v2(
      "get",
      `/api/${this.env}/attempts/${this.attemptId}/graph`,
      {},
      (result)=>{
        puts(result);
  
        $("#graph_img").attr("src", result.path);
        $("#graph_img_link").attr("href", result.path);
  
      }, (errors)=>{
        __g.unguard();
        __g.printApiErrors(errors);
        alert("Check console.");
      });
  }

  resizeGraph(){
    $("#graph_img").css("width", this.state.graph.zoom + "%");
  }

  onclick_showGraph(){
    this.showGraph();
  }

  onclick_graphZoomOut(){
    this.state.graph.zoom -= 10;
    if (this.state.graph.zoom < 10) {
      this.state.graph.zoom = 10;
    }
    this.resizeGraph();
  }

  onclick_graphZoomIn(){
    this.state.graph.zoom += 10;
    this.resizeGraph();
  }
}

__g.ready(new Page());
