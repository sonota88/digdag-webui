class SearchResult {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , h("table", {}
        , state.projects.map(pj =>
            h("tr", {}
            , h("td", {}
              , h("a", { href: `/deve/projects/${pj.id}` }, pj.name)
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
      , h("input", { style: {} })
      , h("div", { id: "search_result" })
      )
    );
  }
}

class Page {
  constructor(){
    this.state = {
      projects: []
    };
  }

  getTitle(){
    return "projects";
  }

  init(){
    puts("init");
    __g.api_v2("get", "/api/devel/projects", {
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
}

__g.ready(new Page());
