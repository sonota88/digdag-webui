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
      , h("h1", {}, __p.getTitle())
      , h("a"
        , { href: `/${__p.env}/workflows/${state.workflow.id}` }
        , "wfに戻る"
        )

      , h("hr")

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
}

__g.ready(new Page());
