class Mycookie {
  static _enc(s){
    return encodeURIComponent(JSON.stringify(s));
  }
  static _dec(s){
    return JSON.parse(decodeURIComponent(s));
  }

  static setMap(map){
    const keepSec = 1 * 60 * 60 * 24 * 365;
    document.cookie = "json=" + this._enc(map) + "; max-age=" + keepSec;
  }

  static getMap(key){
    const get_k = (kv)=>{
      const idx = kv.indexOf("=");
      return kv.substring(0, idx);
    };
    const get_v = (kv)=>{
      const idx = kv.indexOf("=");
      return kv.substring(idx + 1);
    };

    const s = document.cookie;
    const kvs = s.split("; ");

    const jsonKv = kvs.find(kv => get_k(kv) === "json");
    if (jsonKv == null) {
      return {};
    }
    const json = get_v(jsonKv);

    return this._dec(json);
  }

  static set(k, v){
    const map = this.getMap();
    map[k] = v;
    this.setMap(map);
  }

  static get(key){
    return this.getMap()[key];
  }
}
