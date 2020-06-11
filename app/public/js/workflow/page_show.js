class Sessions {
  static render(sessions){
    function convertStatus(lastAttempt){
      const la = lastAttempt;
      if (la.cancelRequested && ! la.done) { return "canceling"; }
      if (la.cancelRequested && la.done) { return "canceled"; }

      if (! la.done) { return "running"; }
      if (la.success) { return "success"; }

      if (la.done && ! la.success) { return "error"; }
    }

    return TreeBuilder.build(h =>
      h("table", {}
      , h("tr", {}
        , h("th", {}, "id")
        , h("th", {}, "time")
        , h("th", {}, "status")
        )
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
          , h("td", {}
            , convertStatus(session.lastAttempt)
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

      , h("br")
      , h("a", { href: __p.getOfficialUiUrl() }, "Official UI")
      , " "
      , h("a", { href: __p.getOfficialUiUrl(), target: "_blank" }, "[➚]")
      , ` / pj:${state.project.name}`
      , ` ＞ wf:${state.workflow.name}`

      , h("h2", {}, "Sessions")
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

  getOfficialUiUrl(){
    return `${this.state.endpoint}/${__g.getEnv()}/workflows/${this.workflowId}`;
  }
}

__g.ready(new Page());
