class Workflows {
  static render(state){
    const wfs = state.workflows;

    return TreeBuilder.build(h =>
      h("div", {}
      , h("table", {}
        , wfs.map(wf =>
            h("tr", {}
            , h("td", {}
              , h("a", { href: `/${__p.env}/workflows/${wf.id}` }, wf.name)
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
      , h("a", { href: `/${__p.env}/projects` }, "プロジェクト一覧に戻る")
      , h("hr")
      , Workflows.render(state)
      )
    );
  }
}

class Page {
  constructor(){
    this.env = __g.getEnv();
    this.projectId = this.getProjectId();
    this.state = {
      workflows: [
        { id: 1, name: "wf1" },
        { id: 2, name: "wf2" },
      ]
    };
  }

  getTitle(){
    return "project";
  }

  getProjectId(){
    const m = location.href.match(/\/projects\/(\d+)/)
    return m[1];
  }

  init(){
    puts("init");
    __g.api_v2("get", `/api/${this.env}/projects/${this.projectId}`, {
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
    return `${this.state.endpoint}/${__g.getEnv()}/projects/${this.projectId}`;
  }
}

__g.ready(new Page());
