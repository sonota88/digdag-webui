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

class Attempts {
  static render(attempts){
    return TreeBuilder.build(h =>
      h("table", {}
      , h("tr", {}
        , h("th", {}, "id")
        , h("th", {}, "status")
        , h("th", {}, "")
        , h("th", {}, "session time")
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
            , h("button", {}, "TODO retry")
            )
          , h("td", {}
            , AppTime.fromIso8601(att.session.time).toYmdHm()
            )
          , h("td", {}
            , LastAttempt.render(att)
            )
          , h("td", {}
            , LastAttempt.makeDurationBar(att)
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
      , h("a"
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
    this.state = {
      workflow: { id: "0" },
      attempts: [
        { id: 1 },
        { id: 2 },
      ]
    };
  }

  getTitle(){
    return "session";
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
  }

  getOfficialUiUrl(){
    return `${this.state.endpoint}/sessions/${this.sessionId}`;
  }
}

__g.ready(new Page());
