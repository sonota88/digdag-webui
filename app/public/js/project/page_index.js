class View {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , h("input", { style: {} })
      )
    );
  }
}

class Page {
  constructor(){
    this.state = {
      optionId: 2,
      checkedIds: [1, 3],
      toggle: true
    };
  }

  getTitle(){
    return "projects";
  }

  init(){
    puts("init");
    __g.api_v2("get", "/api/sample", {
        fooBar: 123, b: { c: 456 }
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
    $("#tree_builder_container")
      .empty()
      .append(View.render(this.state));
  }
}

__g.ready(new Page());
