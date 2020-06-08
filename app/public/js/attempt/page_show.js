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

      , h("button"
        , { onclick: ()=>{ __p.onclick_showGraph(); } }
        , "show graph"
        )
      , h("hr")
      , h("img", { id: "graph_img"
                   // , width: "100%"
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
    __g.api_v2("get", `/api/${this.env}/attempts/${this.workflowId}`, {
      }, (result)=>{
      __g.unguard();
      puts(result);
      Object.assign(this.state, result);

      this.render();

      // this.showGraph();

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
    __g.guard();

    const attemptId = this.getAttemptId();

    __g.api_v2(
      "get",
      `/api/${this.env}/attempts/${attemptId}/graph`,
      {},
      (result)=>{
        __g.unguard();
        puts(result);
  
        $("#graph_img").attr("src", result.path);
  
      }, (errors)=>{
        __g.unguard();
        __g.printApiErrors(errors);
        alert("Check console.");
      });
  }

  onclick_showGraph(){
    this.showGraph();
  }
}

__g.ready(new Page());
