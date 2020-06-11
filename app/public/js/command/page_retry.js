class View {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
       , h("textarea", { id: "input_box", style: {
               width: "80%"
             , height: "10rem"
             }
           }
         ,
`{digdag_cmd} retry ${__p.attemptId} \\
  --latest-revision \\
  --resume \\
  -e {endpoint}
`
         )
       , h("br")
       , h("button", {
             onclick: ()=>{ __p.onclick_run(); }
           }
         , "Run"
         )
       , h("pre", {
         style: { background: "#eeeeee" }
       }
       ,
`digdag retry {attemptId} ...
--latest-revision | --keep-revision (exclusive)
--resume | --resume-from {task_name} | --all (exclusive)
`
        )
      )
    );
  }
}

class Page {
  constructor(){
    this.env = __g.getEnv();
    this.attemptId = this.getAttemptId();
    this.state = {
    };
  }

  getTitle(){
    return "command/retry";
  }

  getAttemptId(){
    return new URL(location.href).searchParams.get("attemptId");
  }

  init(){
    puts("init");
    __g.unguard();
    this.render();
  }

  render(){
    $("#main")
      .empty()
      .append(View.render(this.state));
  }

  onclick_run(){
    __g.guard();

    __g.api_v2("post", `/api/${this.env}/command/retry/exec`, {
        args: $("#input_box").val()
      }, (result)=>{
      __g.unguard();
      puts(result);

      window.parent.__p.closeFrame();

    }, (errors)=>{
      __g.unguard();
      __g.printApiErrors(errors);
      alert("Check console.");
    });
  }
}

__g.ready(new Page());
