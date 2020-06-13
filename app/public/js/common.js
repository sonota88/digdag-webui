function puts(... args){
  console.log.apply(console, args);
}

function _parseInt(str){
  return parseInt(str, 10);
}

class AppTime {
  constructor(date){
    this.date = date;
  }

  static now(){
    return new AppTime(new Date());
  }

  static fromIso8601(str){
    const date = new Date(Date.parse(str));
    return new AppTime(date);
  }

  static formatDuration(deltaSec){
    const deltaSec2 = Math.floor(deltaSec);

    if (deltaSec2 < 60) {
      return __g.pad2(deltaSec2) + "s";
    }

    const min = Math.floor(deltaSec2 / 60);
    const sec2 = deltaSec2 % 60;
    if (min < 60) {
      return `${ __g.pad2(min) }m ${ __g.pad2(sec2) }s`;
    }

    const hour = Math.floor(min / 60);
    const min2 = min % 60;
    return `${ __g.pad2(hour) }h ${ __g.pad2(min2) }m ${ __g.pad2(sec2) }s`;
  }

  toYmdHm(){
    const mon  = __g.pad2(this.date.getMonth());
    const day  = __g.pad2(this.date.getDay());
    const hour = __g.pad2(this.date.getHours());
    const min  = __g.pad2(this.date.getMinutes());
    return `${mon}-${day} ${hour}:${min}`;
  }

  getTime(){
    return this.date.getTime();
  }
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
  },

  pad2: (n)=>{
    return (n < 10 ? "0" : "") + n;
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

  class Attempt {
    static calcDurationSec(la) {
      const t0 = AppTime.fromIso8601(la.createdAt);

      let t1;
      if (la.finishedAt == null) {
        t1 = AppTime.now();
      } else {
        t1 = AppTime.fromIso8601(la.finishedAt);
      }

      const msec = t1.getTime() - t0.getTime();
      return msec / 1000;
    }

    static renderTime(la) {
      const makeDuration = (la)=>{
        const sec = this.calcDurationSec(la);
        return AppTime.formatDuration(sec);
      };

      return TreeBuilder.build(h =>
        h("span", {}
          , AppTime.fromIso8601(la.createdAt).toYmdHm()
          , " ~ "
          , la.finishedAt
            ? AppTime.fromIso8601(la.finishedAt).toYmdHm()
            : "...        "

          , " | "
          , makeDuration(la)
        )
      );
    }

    static renderDurationBar(la){
      const min = this.calcDurationSec(la) / 60;

      if (min < 60) {
        return ".".repeat(min / 10);
      } else if (min < 60 * 24) {
        const hour = min / 60;
        const full = "-|".repeat(24);
        return full.substring(0, Math.floor(hour * 2));
      } else {
        return ">=24h";
      }
    }
  }
  __g.Attempt = Attempt;
})()
