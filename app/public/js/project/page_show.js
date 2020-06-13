class Workflows {
  static render(state){
    const wfs = state.workflows;

    // asc
    const sorted = wfs.sort((a, b)=>{
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      } else {
        return 0;
      }
    });

    return TreeBuilder.build(h =>
      h("div", {}
      , h("table", {}
        , sorted.map(wf =>
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
      , h("h1", {}, __p.getTitle() + ": " + state.project.name)
      , h("a", { href: `/${__p.env}/projects` }, "プロジェクト一覧に戻る")

      , h("br")
      , h("a", { href: __p.getOfficialUiUrl() }, "Official UI")
      , " "
      , h("a", { href: __p.getOfficialUiUrl(), target: "_blank" }, "[➚]")
      , ` / pj:${state.project.name}`

      , h("h2", {}, "Workflows")
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
      project: {},
      workflows: [
        { id: 1, name: "wf1" },
        { id: 2, name: "wf2" },
        { id: 3, name: "0_wf1" },
      ]
    };
  }

  getTitle(){
    return "Project";
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
    __g.updateTitle("pj:" + this.state.project.name);
  }

  getOfficialUiUrl(){
    return `${this.state.endpoint}/projects/${this.projectId}`;
  }
}

__g.ready(new Page());
