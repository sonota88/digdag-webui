class SearchResult {
  static render(state){
    let filtered = [];

    if (state.q) {
      filtered = state.projects
        .filter(pj => pj.name.includes(state.q));
    } else {
      filtered = state.projects
    }

    // asc
    const sorted = filtered.sort((a, b)=>{
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
        , sorted.map(pj =>
            h("tr", {}
            , h("td", {}
              , h("a", { href: `/${__p.env}/projects/${pj.id}` }, pj.name)
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
      , h("input", { style: {}
          , oninput: (ev)=>{ __p.oninput_q(ev); }
          }
        )
      , h("div", { id: "search_result" })
      )
    );
  }
}

class Page {
  constructor(){
    this.env = __g.getEnv();
    this.state = {
      projects: [],
      q: null
    };
  }

  getTitle(){
    return "Projects";
  }

  init(){
    puts("init");
    __g.api_v2("get", `/api/${this.env}/projects`, {
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

    this.renderSearchResult();
  }

  renderSearchResult(){
    $("#search_result")
      .empty()
      .append(SearchResult.render(this.state));
  }

  oninput_q(ev){
    const q = ev.target.value;
    this.state.q = (q === "") ? null : q;
    this.renderSearchResult();
  }
}

__g.ready(new Page());
