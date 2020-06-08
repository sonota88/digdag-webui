class Sessions {
  static render(sessions){
    return TreeBuilder.build(h =>
      h("table", {}
      , sessions.map(session =>
          h("tr", {}
          , h("td", {}
            , h("a", { href: `/${__p.env}/sessions/${session.id}` }
              , session.id
              )
            )
          , h("td", {}
            , session.time
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
      , h("h1", {}, __p.getTitle())
      , h("a"
        , { href: `/${__p.env}/projects/${state.project.id}` }
        , "プロジェクトに戻る"
        )
      , h("hr")
      , Sessions.render(state.sessions)
      )
    );
  }
}

class Page {
  constructor(){
    this.env = __g.getEnv();
    this.workflowId = this.getWorkflowId();
    this.state = {
      project: { id: "0" },
      sessions: [
        { id: 1, time: "t1" },
        { id: 2, time: "t2" },
      ]
    };
  }

  getTitle(){
    return "workflow";
  }

  getWorkflowId(){
    const m = location.href.match(/\/workflows\/(\d+)/)
    return m[1];
  }

  init(){
    puts("init");
    __g.api_v2("get", `/api/${this.env}/workflows/${this.workflowId}`, {
      }, (result)=>{
      __g.unguard();
      puts(result);
      Object.assign(this.state, result);

      this.render();

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

  // onclick_showGraph(){
  //   puts("onclick_showGraph");
  //   __g.guard();
  // 
  //   __g.api_v2(
  //     "get",
  //     `/api/${this.env}/workflows/${this.workflowId}/graph`,
  //     {},
  //     (result)=>{
  //       __g.unguard();
  //       puts(result);
  // 
  //       $("#graph_img").attr("src", result.path);
  // 
  //     }, (errors)=>{
  //       __g.unguard();
  //       __g.printApiErrors(errors);
  //       alert("Check console.");
  //     });
  //   
  // }
}

__g.ready(new Page());
