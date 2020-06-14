class Sessions {
  static render(state){
    return TreeBuilder.build(h =>
      h("table", {}
      , h("tr", {}
        , h("th", {}, "id")
        , h("th", {}, "status")
        , h("th", {}, "")
        , h("th", {}, "time")
        , h("th", {}, "last attempt")
        , h("th", {}, "duration")
        )
      , state.sessions.map(session =>
          h("tr", {}
          , h("td", {}
            , h("a", { href: `/${__p.env}/sessions/${session.id}` }
              , session.id
              )
            )
          , h("td", {}
            , __g.AttemptStatus.render(session.lastAttempt)
            )
          , h("td", {}
            , h("button", {
                  onclick: ()=>{ __p.onclick_select(session.id); }
                , "class": (session.id === state.focusedSessionId)
                           ? "btn_selected"
                           : ""
                }, "frame")
            )
          , h("td", { title: session.time }
            , AppTime.fromIso8601(session.time).toYmdHm()
            )
          , h("td", {}
            , h("pre", {}
              , h("a"
                , { href: `../attempts/${session.lastAttempt.id}` }
                , session.lastAttempt.id
                )
              , " | "
              , __g.Attempt.renderTime(session.lastAttempt)
              )
            )
          , h("td", {}
            , __g.Attempt.renderDurationBar(session.lastAttempt)
            )
          )
        )
      )
    );
  }
}

class Breadcrumbs {
  static render(state){
    return TreeBuilder.build(h =>
      [
        h("a", {
            href: `/${__p.env}/projects/${state.project.id}`
          }
        , `pj:${state.project.name}`
        )
      , ` ＞ wf:${state.workflow.name}`
      ]
    );
  }
}

class SessionPane {
  static render(state){
    return TreeBuilder.build(h =>
      BottomPane.render(
        {
          onclose: ()=>{ __p.closeSessionFrame(); }
        , show: state.showSessionPane
        }
      , h("iframe", {
            id: "console_frame"
          , src: __p.getSessionUrl() + "?frame=1"
          , style: {
              width: "100%"
            , height: "100%"
            // , border: "dashed 0.1rem #ddd"
            , border: "none"
            }
          }
        )
      )
    );
  }
}

class View {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , __g.EnvBanner.render()

      , h("h1", {}, __p.getTitle() + ": " + state.workflow.name)

      , h("a", { href: __p.getOfficialUiUrl() }, "Official UI")
      , " "
      , h("a", { href: __p.getOfficialUiUrl(), target: "_blank" }, "[➚]")

      , " / "
      , Breadcrumbs.render(state)

      , h("h2", {}, "Sessions")
      , Sessions.render(state)

      , SessionPane.render(state)
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
      ],
      focusedSessionId: null,
      showSessionPane: false,
    };
  }

  getTitle(){
    return "Workflow";
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
    __g.updateTitle(`wf:${this.state.workflow.name} (pj:${this.state.project.name})`);
  }

  getOfficialUiUrl(){
    return `${this.state.endpoint}/workflows/${this.workflowId}`;
  }

  getSessionUrl(){
    const sess = this.state.sessions
      .find((s)=> s.id === this.state.focusedSessionId );
    if (! sess) { return null; }
    return `/${__g.getEnv()}/sessions/${sess.id}`;
  }

  onclick_select(sid){
    this.state.focusedSessionId = sid;
    this.state.showSessionPane = true;
    this.render();
  }

  closeSessionFrame(){
    this.state.showSessionPane = false;
    this.render();
  }
}

__g.ready(new Page());
