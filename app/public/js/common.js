function puts(... args){
  console.log.apply(console, args);
}

function _parseInt(str){
  return parseInt(str, 10);
}

const __g = {
  api: function(method, path, data, fnOk, fnNg){
    var _data = {
      _method: method.toUpperCase()
      ,_params: JSON.stringify(data)
    };
    $.post(path, _data, (data)=>{
      if(data.errors.length > 0){
        fnNg(data.errors);
        return;
      }
      fnOk(data.result);
    });
  },

  api_v2: (method, path, data, fnOk, fnNg)=>{
    const req = new Request(path);

    const fd = new FormData();
    fd.append("_method", method.toUpperCase());
    fd.append("_params", JSON.stringify(data));

    fetch(req, {
      method: 'POST',
      body: fd,
      credentials: 'include', // cookie をリクエストに含める
    }).then((res)=>{
      if (res.ok) {
        puts("res.ok == true", res);
      } else {
        puts("res.ok != true", res);
      }
      return res.json();
    }).then((resData)=>{
      if (resData.errors.length > 0) {
        fnNg(resData.errors);
        return;
      }
      fnOk(resData.result);
    }).catch((err)=>{
      puts(err);
    });
  },

  guard: ()=>{
    $("#guard_layer").show();
  },

  unguard: ()=>{
    setTimeout(()=>{
      $("#guard_layer").fadeOut(100);
    }, 100);
  },

  printApiErrors: (es)=>{
    es.forEach((e, i)=>{
      puts(`-------- error ${i} --------`);
      puts(e.trace.split("\n").reverse().join("\n"));
      puts(e.msg);
    });
  },

  ready: (page)=>{
    window.__p = page;
    document.addEventListener("DOMContentLoaded", ()=>{
      page.init();
      document.title = page.getTitle() + " | my-digdag-webui";
    });
  },

  getSearchParams: (url = location.href)=>{
    return new URL(location.href).searchParams;
  },

  getEnv: ()=>{
    const parts = location.href.split("/");
    const env = parts[3]

    if (["devel", "prod"].includes(env)) {
      // OK
    } else {
      throw new Error(`invalid env (${env})`);
    }

    return env;
  }
};

// --------------------------------
// Components

(()=>{
  class AttemptStatus {
    static toStatusStr(att){
      if (att.cancelRequested && ! att.done) { return "canceling"; }
      if (att.cancelRequested && att.done) { return "canceled"; }

      if (! att.done) { return "running"; }
      if (att.success) { return "success"; }

      if (att.done && ! att.success) { return "error"; }
    }

    // TODO => make style
    static getColor(att){
      if (att.cancelRequested && ! att.done) {
        // canceling
        return "#a84";
      }
      if (att.cancelRequested && att.done) {
        // canceled
        return "#a80";
      }

      if (! att.done) {
        // running
        return "#2a0";
      }
      if (att.success) {
        // success
        return "#888";
      }

      if (att.done && ! att.success) {
        // error
        return "#e00";
      }
    }

    static render(att){
      return TreeBuilder.build(h =>
        h("span", {
          style: {
            color: this.getColor(att)
          }
        }
      , this.toStatusStr(att))
      );
    }
  }

  __g.AttemptStatus = AttemptStatus;
})()
