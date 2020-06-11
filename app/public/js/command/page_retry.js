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
`${__p.attemptId} \\
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
  getTitle(){
    return "command/retry";
  }

  init(){

  }
}

__g.ready(new Page());
