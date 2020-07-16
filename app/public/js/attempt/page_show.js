class TaskList {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , h("table", {}
        , h("tr", {}
          , h("th", {}, "id")
          , h("th", {}, "startedAt")
          , h("th", {}, "updatedAt")
          , h("th", {}, "retryAt")
          , h("th", {}, "state")
          , h("th", {}, "cancelRequested")
          , h("th", {}, "fullName")
          )
        , state.tasks.map((task)=>
            h("tr", {}
            , h("td", {}, task.id)
            , h("td", {}, task.startedAt)
            , h("td", {}, task.updatedAt)
            , h("td", {}, task.retryAt)
            , h("td", {}, task.state)
            , h("td", {}, task.cancelRequested)
            , h("td", {}, task.fullName)
            )
          )
        )
      )
    );
  }
}

class Graph {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , h("button"
        , { onclick: ()=>{ __p.onclick_showGraph(); } }
        , "show graph"
        )
      , h("a", { id: "graph_img_link", href: state.graph.src }, "image")

      , ` / ${state.graph.zoom} `
      , h("button", { onclick: ()=>{ __p.onclick_graphZoomOut(); } }, "-")
      , h("button", { onclick: ()=>{ __p.onclick_graphZoomIn(); } }, "+")

      , " / interval (min)"
      , h("input", {
            value: state.graph.intervalSec / 60
          , onchange: (ev)=>{ __p.onchange_intervalMin(ev); }
          , style: { width: "4rem" }
          }
        )

      , " / "
      , h("a", { href: `${__p.attemptId}/graph_ovto` }, "ovto")

      , h("br")

      , h("img", { id: "graph_img"
                   , width: `${state.graph.zoom}%`
                   , src: state.graph.src
                 })
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
      , h("a"
        , { href: `/${__p.env}/workflows/${state.workflow.id}` }
        , `wf:${state.workflow.name}`
        )
      , " ＞ "
      , h("a", {
            href: `/${__p.env}/sessions/${state.attempt.session.id}`
          }
        , `s${state.session.id}`
        )
      , ` ＞ a${__p.attemptId}`
      ]
    );
  }
}

class View {
  static render(state){
    return TreeBuilder.build(h =>
      h("div", {}
      , __g.EnvBanner.render()

      , h("h1", {}, __p.getTitle())

      , h("a", { href: __p.getOfficialUiUrl() }, "Official UI")
      , " "
      , h("a", { href: __p.getOfficialUiUrl(), target: "_blank" }, "[➚]")
      , " / "
      , Breadcrumbs.render(state)
      , h("hr")

      , "session time: "
      , AppTime.fromIso8601(state.attempt.session.time).toYmdHm()

      , Graph.render(state)

      , h("h2", {}, "Tasks")

      , TaskList.render(state)

      , h("hr")

      , h("textarea"
        , { style: { width: "90%", height: "10rem" } }
        , JSON.stringify(state.attempt, null, "    ")
        )

      , h("pre", { id: "state_dump" }
        , JSON.stringify(state)
        )
      )
    );
  }
}

class Page {
  constructor(){
    this.env = __g.getEnv();
    this.attemptId = this.getAttemptId();
    this.graphRefreshTimer = null;

    this.state = {
      attempt: {
        session: {
          id: "0"
        }
      },
      tasks: [
        {
          id: "1"
        , updatedAt: "2020-07-15T23:39:55Z"
        , state: "group_error"
        , cancelRequested: false
        , retryAt: null
        , startedAt: null
        , fullName: "+wf_test"
        },
        {
          id: "2"
        , updatedAt: "2020-07-15T23:39:55Z"
        , state: "success"
        , cancelRequested: false
        , retryAt: null
        , startedAt: "2020-07-15T23:39:55Z"
        , fullName: "+wf_test^failure-alert"
        }
      ],
      graph: {
        src: null,
        zoom: 50,
        intervalSec: 60 * 10
      }
    };
  }

  getTitle(){
    return "Attempt";
  }

  getAttemptId(){
    const m = location.href.match(/\/attempts\/(\d+)/)
    return m[1];
  }

  init(){
    puts("init");
    this.attemptId = this.getAttemptId();

    __g.api_v2("get", `/api/${this.env}/attempts/${this.attemptId}`, {
      }, (result)=>{
      __g.unguard();
      puts(result);
      Object.assign(this.state, result);

      this.render();

      this.showGraph();

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
    __g.updateTitle("a" + this.attemptId);
  }

  renderStateDump(){
    $("#state_dump").text(JSON.stringify(this.state, null, "    "));
  }

  getOfficialUiUrl(){
    return `${this.state.endpoint}/attempts/${this.attemptId}`;
  }

  _showGraph(opts){
    puts("onclick_showGraph");
    __g.guard();

    const _opts = opts || { enqueue: true }

    __g.api_v2(
      "get",
      `/api/${this.env}/attempts/${this.attemptId}/graph`,
      {},
      (result)=>{
        __g.unguard();
        puts(result);

        this.state.graph.src = result.path;
        this.state.tasks = result.tasks;
        $("#graph_img").attr("src", result.path);
        $("#graph_img_link").attr("href", result.path);
        this.renderStateDump();
  
        if (_opts.enqueue) {
          this.showGraph();
        }

      }, (errors)=>{
        __g.unguard();
        __g.printApiErrors(errors);
        alert("Check console.");
      });
  }

  showGraph(opts){
    let _opts = opts || { immediate: false };
    clearTimeout(this.graphRefreshTimer);

    if (_opts.immediate) {
      this._showGraph({ enqueue: false });
    }

    this.graphRefreshTimer = setTimeout(
      ()=>{ this._showGraph(); },
      this.state.graph.intervalSec * 1000
    );
  }

  onclick_showGraph(){
    this.showGraph({ immediate: true });
  }

  onclick_graphZoomOut(){
    this.state.graph.zoom -= 10;
    if (this.state.graph.zoom < 10) {
      this.state.graph.zoom = 10;
    }
    this.render();
  }

  onclick_graphZoomIn(){
    this.state.graph.zoom += 10;
    this.render();
  }

  onchange_intervalMin(ev){
    const min = parseFloat(ev.target.value);
    let sec = Math.round(min * 60);
    if (sec < 30) {
      sec = 30;
    }

    this.state.graph.intervalSec = sec;

    this.showGraph({ immediate: true });
  }
}

__g.ready(new Page());
