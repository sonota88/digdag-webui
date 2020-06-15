class Attempts {
  static render(attempts){
    return TreeBuilder.build(h =>
      h("table", {}
      , h("tr", {}
        , h("th", {}, "id")
        , h("th", {}, "status")
        , h("th", {}, "")
        , h("th", {}, "attempt time")
        , h("th", {}, "")
        )
      , attempts.map(att =>
          h("tr", {}
          , h("td", {}
            , h("a", { href: `/${__p.env}/attempts/${att.id}` }
              , att.id
              )
            )
          , h("td", {}
            , __g.AttemptStatus.render(att)
            )
          , h("td", {}
            , __g.Attempt.isKillable(att)
              ? h("button", {
                    onclick: ()=>{ __p.onclick_kill(att.id); }
                  }
                , "kill"
                )
              : null
            )
          , h("td", {}
            , h("pre", {}
              , __g.Attempt.renderTime(att)
              )
            )
          , h("td", {}
            , __g.Attempt.renderDurationBar(att)
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
        h("a"
        , { href: `/${__p.env}/projects/${state.project.id}` }
        , `pj:${state.project.name}`
        )
      , " ＞ "
      , h("a", {
            href: `/${__p.env}/workflows/${state.workflow.id}`
          }
        , `wf:${state.workflow.name}`
        )
      , ` ＞ s${__p.sessionId}`
      ]
    );
  }
}

class View {
  static makeSessionInfo(sess){
    const lines = [];
    lines.push("session time: " + AppTime.fromIso8601(sess.time).toYmdHm());
    return lines.join("\n");
  }

  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , __g.EnvBanner.render()

      , h("h1", {}, __p.getTitle())

      , __p.isFrame
        ? null
        : [
              h("a", { href: __p.getOfficialUiUrl() }, "Official UI")
            , " "
            , h("a", { href: __p.getOfficialUiUrl(), target: "_blank" }, "[➚]")

            , " / "
            , Breadcrumbs.render(state)
          ]

      , h("pre", {}
        , this.makeSessionInfo(state.attempts[0].session)
        )

      , h("h2", {}, "Retry attempt")

      , h("textarea", {
            id: "input_box"
          , style: {
              width: "50%"
            , height: "4rem"
            }
          }
, `{digdag_cmd} retry ${ __p.getLastAttempt().id } \
 --latest-revision \
 --resume \
 --endpoint {endpoint}
`
        )
      , h("br")
      , h("button", {
            onclick: ()=>{ __p.onclick_retry("aid"); }
          }
        , "run"
        )

      , h("h2", {}, "Attempts")
      , Attempts.render(state.attempts)
      )
    );
  }
}

class Page {
  constructor(){
    this.env = __g.getEnv();
    this.sessionId = this.getSessionId();
    this.isFrame = __g.getSearchParams().get("frame") === "1";
    this.state = {
      workflow: { id: "0" },
      attempts: [
        { id: 1 },
        { id: 2 },
      ]
    };
  }

  getTitle(){
    return "Session";
  }

  getSessionId(){
    const m = location.href.match(/\/sessions\/(\d+)/)
    return m[1];
  }

  init(){
    puts("init");
    __g.api_v2("get", `/api/${this.env}/sessions/${this.sessionId}`, {
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
    __g.updateTitle("s" + this.sessionId);
  }

  getLastAttempt(){
    return this.state.attempts[0];
  }

  getOfficialUiUrl(){
    return `${this.state.endpoint}/sessions/${this.sessionId}`;
  }

  onclick_retry(aid){
    if (! confirm("Are you sure to retry?")) {
      return;
    }

    __g.guard();

    __g.api_v2("post", `/api/${this.env}/command/retry/exec`, {
        args: $("#input_box").val()
      }, (result)=>{
      puts(result);

      setTimeout(
        ()=>{ location.reload(); },
        1000
      );

    }, (errors)=>{
      __g.unguard();
      __g.printApiErrors(errors);
      alert("Check console.");
    });
  }

  onclick_kill(aid){
    if (! confirm("Are you sure to kill?")) {
      return;
    }

    __g.guard();

    __g.api_v2("post", `/api/${this.env}/command/kill/exec`, {
        attemptId: aid
      }, (result)=>{
      puts(result);

      setTimeout(
        ()=>{ location.reload(); },
        1000
      );

    }, (errors)=>{
      __g.unguard();
      __g.printApiErrors(errors);
      alert("Check console.");
    });
  }
}

__g.ready(new Page());
