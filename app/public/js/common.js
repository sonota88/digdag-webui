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

    if (deltaSec2 < 0) {
      return "?";
    } else if (deltaSec2 < 60) {
      return __g.pad2(deltaSec2) + "s";
    }

    const min = Math.floor(deltaSec2 / 60);
    const sec2 = deltaSec2 % 60;
    if (min < 0) {
      return "?";
    } else if (min < 60) {
      return `${ __g.pad2(min) }m ${ __g.pad2(sec2) }s`;
    }

    const hour = Math.floor(min / 60);
    const min2 = min % 60;
    return `${ __g.pad2(hour) }h ${ __g.pad2(min2) }m ${ __g.pad2(sec2) }s`;
  }

  toYmdHm_simple(){
    const mon  = __g.pad2(this.date.getMonth() + 1);
    const day  = __g.pad2(this.date.getDate());
    const hour = __g.pad2(this.date.getHours());
    const min  = __g.pad2(this.date.getMinutes());
    return `${mon}-${day} ${hour}:${min}`;
  }

  toYmdHm(){
    const oddStyle = {
      background: "#e8e8e8",
      "box-shadow": "0 0 0 0.1rem #e8e8e8",
      "border-radius": "0.2rem"
    };

    const mon  = __g.pad2(this.date.getMonth() + 1);
    const day  = __g.pad2(this.date.getDate());
    const hour = __g.pad2(this.date.getHours());
    const min  = __g.pad2(this.date.getMinutes());

    return TreeBuilder.build(h =>
      h("span", {
          title: this.date.toLocaleString()
        }
      , (this.date.getMonth() + 1) % 2 == 0
        ? mon
        : h("span", { style: oddStyle }, mon)

      , "-"

      , this.date.getDate() % 2 == 0
        ? day
        : h("span", { style: oddStyle }, day)

      , " "

      , this.date.getHours() % 2 == 0
        ? hour
        : h("span", { style: oddStyle }, hour)

      , `:${min}`
      )
    );
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

  // TODO feedback to template
  updateTitle: (title)=>{
    document.title = title + " | my-digdag-webui";
  },

  ready: (page)=>{
    window.__p = page;
    document.addEventListener("DOMContentLoaded", ()=>{
      page.init();
      __g.updateTitle(page.getTitle());
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
  },

  _FLAG_ATTR_KEYS: ["disabled", "readonly"],

  filterAttrs: (attrs)=>{
    const newAttrs = {};

    for (const [k, v] of Object.entries(attrs)) {
      if (__g._FLAG_ATTR_KEYS.includes(k)) {
        if (v) {
          newAttrs[k] = k;
        }
      } else {
        newAttrs[k] = v;
      }
    }

    return newAttrs;
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

    static _renderDurationBar(la) {
      const min = this.calcDurationSec(la) / 60;

      if (min < 0) {
        return [0, "?"];
      } else if (min < 60) {
        return [1, ".".repeat(min / 10)];
      } else if (min < 60 * 24) {
        const hour = min / 60;
        const full = "-|".repeat(24);
        return [2, full.substring(0, Math.floor(hour * 2))];
      } else {
        return [3, ">=24h"];
      }
    }

    static renderDurationBar(att) {
      const [lv, s] = this._renderDurationBar(att);

      return TreeBuilder.build(h =>
        h("span", {
            "class": `duration_bar duration_bar_${lv}`
          }
        , s
        )
      );
    }

    static isKillable(att){
      if (att.cancelRequested) { return false; }
      if (att.done) { return false; }
      return true;
    }
  }
  __g.Attempt = Attempt;

  class TaskStatus {
    static getColor(task){
      if (task.state === "group_error"
          || task.state === "error")
      {
        return "#e00";
      } else if (task.state === "planned") {
        return "#0a8";
      } else if (task.state === "blocked") {
        return "#08a";
      } else if (task.state === "retry_waiting") {
        return "#808";
      } else if (task.state === "success") {
        return "#888";
      } else {
        return "#000";
      }
    }

    static render(task){
      return TreeBuilder.build(h =>
        h("span", {
            style: {
              color: this.getColor(task)
            }
          }
        , task.state
        )
      );
    }
  }
  __g.TaskStatus = TaskStatus;

  class EnvBanner {
    static render() {
      const env = __g.getEnv();

      let bg = null;
      let color = null;
      if (env === "prod") {
        bg = "#b6f";
        color = "#408"
      } else {
        bg = "#ddd";
        color = "#444"
      }

      return TreeBuilder.build(h =>
        h("div", {
            style: {
              position: "fixed",
              top: "0",
              left: "0",
              width: "100vw",
              height: "0.2rem",
              background: bg,
            }
          }
        , h("div", {
              style: {
                position: "fixed",
                top: "0",
                left: "45vw",
                width: "10vw",
                height: "1.5rem",
                background: bg,
                color: color,
                padding: "0",
                "font-size": "1rem",
                "font-weight": "bold",
                "text-align": "center",
              }
            }
          , env
          )
        )
      );
    }
  }
  __g.EnvBanner = EnvBanner;
})()
