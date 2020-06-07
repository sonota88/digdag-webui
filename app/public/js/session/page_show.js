class Attempts {
  static render(attempts){
    return TreeBuilder.build(h =>
      h("table", {}
      , attempts.map(att =>
          h("tr", {}
          , h("td", {}
            , h("a", { href: `/${__p.env}/attempts/${att.id}` }
              , att.id
              )
            )
          )
        )
      )
    );
  }
}

class View {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      // , h("a", { href: `/${__p.env}/projects/...` }, "wfに戻る")
      , h("hr")
      , h("button"
        , { onclick: ()=>{ __p.onclick_showGraph(); } }
        , "show graph"
        )
      , h("hr")
      , h("img", { id: "graph_img"
                   // , width: "100%"
                 })
      , h("hr")
      , Attempts.render(state.attempts)
      )
    );
  }
}

class Page {
  constructor(){
    this.env = __g.getEnv();
    this.workflowId = this.getWorkflowId();
    this.state = {
      attempts: [
        { id: 1 },
        { id: 2 },
      ]
    };
  }

  getTitle(){
    return "session";
  }

  getWorkflowId(){
    const m = location.href.match(/\/sessions\/(\d+)/)
    return m[1];
  }

  init(){
    puts("init");
    __g.api_v2("get", `/api/${this.env}/sessions/${this.workflowId}`, {
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

    const attemptId =
      Math.max(
        ...this.state.attempts.map(att => _parseInt(att.id))
      );

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
