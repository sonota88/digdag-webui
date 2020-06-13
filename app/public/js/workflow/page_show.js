class LastAttempt {
  static calcDurationSec(la) {
    const t0 = AppTime.fromIso8601(la.createdAt);

    let t1;
    if (la.finishedAt == null) {
      t1 = AppTime.now();
    } else {
      t1 = AppTime.fromIso8601(la.finishedAt);
    }

    const msec = t1.getTime() - t0.getTime();
    return msec / 1000;
  }

  static render(la) {
    const makeDuration = (la)=>{
      const sec = this.calcDurationSec(la);
      return AppTime.formatDuration(sec);
    };

    return TreeBuilder.build(h =>
      h("pre", {}
        , h("a", { href: `../attempts/${la.id}` }, la.id)

        , " | "
        , AppTime.fromIso8601(la.createdAt).toYmdHm()
        , " ~ "
        , la.finishedAt
          ? AppTime.fromIso8601(la.finishedAt).toYmdHm()
          : "...        "

        , " | "
        , makeDuration(la)
      )
    );
  }

  static makeDurationBar(la){
    const min = this.calcDurationSec(la) / 60;

    if (min < 60) {
      return ".".repeat(min / 10);
    } else if (min < 60 * 24) {
      const hour = min / 60;
      const full = "-|".repeat(24);
      return full.substring(0, Math.floor(hour * 2));
    } else {
      return ">=24h";
    }
  }
}

class Sessions {
  static render(state){
    const toYmdHm = (timeStr)=>{
      const m = timeStr.match(/^....-(..-..)T(..:..)/);
      return `${m[1]} ${m[2]}`
    };

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
          , h("td", {
                style: {
                  background:
                    (session.id === state.focusedSessionId)
                    ? "#fd6"
                    : "transparent"
                }
              }
            , h("button", {
                  onclick: ()=>{ __p.onclick_retry(session.id); }
                }, "retry")
            )
          , h("td", { title: session.time }
            , toYmdHm(session.time)
            )
          , h("td", {}
            , LastAttempt.render(session.lastAttempt)
            )
          , h("td", {}
            , LastAttempt.makeDurationBar(session.lastAttempt)
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

      , h("a", { href: __p.getOfficialUiUrl() }, "Official UI")
      , " "
      , h("a", { href: __p.getOfficialUiUrl(), target: "_blank" }, "[➚]")

      , " / "
      , h("a", {
            href: `/${__p.env}/projects/${state.project.id}`
          }
        , `pj:${state.project.name}`
        )
      , ` ＞ wf:${state.workflow.name}`

      , h("h2", {}, "Sessions")
      , Sessions.render(state)

      , h("div", { id: "console_frame_box"
            , style: {
                display: "none"
              , position: "fixed"
              , top: "5%"
              , left: "5%"
              , width: "90%"
              , height: "90%"
              , background: "#ffffff"
              , "box-shadow": "0px 0px 3rem rgba(0,0,0, 0.3)"
              , border: "solid 0.1rem #444"
              , padding: "0.5rem"
            }
          }
        , h("button", { onclick: ()=>{ __p.closeFrame(); } }, "×")
        , h("br")
        , h("iframe", { id: "console_frame"
            , style: {
                width: "100%"
              , height: "80%"
              , border: "dashed 0.1rem #ddd"
              }
            }
          )
        )
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
    return `${this.state.endpoint}/workflows/${this.workflowId}`;
  }

  onclick_retry(id){
    this.state.focusedSessionId = id;
    const sess = this.state.sessions
      .find((s)=> s.id === id );

    const aid = sess.lastAttempt.id;

    const $frameBox = $("#console_frame_box");
    const $frame = $("#console_frame");
    $frame.attr("src", `/${__g.getEnv()}/command/retry?attemptId=${aid}`);
    $frameBox.show(); // TODO Use render
  }

  // TODO receive and show message
  closeFrame(){
    const $frameBox = $("#console_frame_box");
    // $frameBox.hide();
    // location.reload(); // retry 実行時のみリロード
    this.render();
  }
}

__g.ready(new Page());
