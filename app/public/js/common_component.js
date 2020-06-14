class MyOption {
  static render(item, selectedVal){
    const attrs = { value: item.value };
    if (item.value === selectedVal) {
      attrs.selected = "selected";
    }

    return TreeBuilder.build(h =>
      h("option", attrs, item.text)
    );
  }
}

class MySelect {
  static render(items, opts){
    return TreeBuilder.build(h =>
      h("select", {
          onchange: opts.onchange
        }
      , items.map(item =>
          MyOption.render(item, opts.selected)
        )
      )
    );
  }

  static getValue(ev){
    const $tgt = $(ev.target);
    return $tgt.find("option:selected").val();
  }

  static getValueAsInt(ev){
    const val = MySelect.getValue(ev);
    return parseInt(val, 10);
  }
}

// --------------------------------

class MyRadio {
  static render(name, item, selectedVal){
    const selected = (item.value === selectedVal);

    const labelClasses = ["container_label"];
    if (selected) { labelClasses.push("container_label_selected"); }

    const attrs = {
      type: "radio",
      name: name,
      value: item.value
    };
    if (selected) {
      attrs.checked = "checked";
    }

    return TreeBuilder.build(h =>
      h("label", { "class": labelClasses.join(" ") }
      , h("input", attrs)
      , item.text
      )
    );
  }
}

/*
  opts:
    selected: single value
    onchange: (ev) => { ... }
*/
class MyRadioGroup {
  static render(name, items, opts){
    return TreeBuilder.build(h =>
      h("span", {
          "class": "myradiogroup_container"
        , onchange: opts.onchange
        }
      , items.map(item =>
          MyRadio.render(name, item, opts.selected)
        )
      )
    );
  }

  static getValue(ev){
    const $tgt = $(ev.target);
    const $cont = $tgt.closest(".myradiogroup_container");

    return $cont.find("input:checked").val();
  }

  static getValueAsInt(ev){
    const val = MyRadioGroup.getValue(ev);
    return parseInt(val, 10);
  }
}

// --------------------------------

class MyCheckbox {
  static render(name, item, selectedVals){
    const selected = (selectedVals.includes(item.value));

    const labelClasses = ["container_label"];
    if (selected) { labelClasses.push("container_label_selected"); }

    const attrs = {
      type: "checkbox",
      name: name,
      value: item.value
    };
    if (selected) {
      attrs.checked = "checked";
    }

    return TreeBuilder.build(h =>
      h("label", { "class": labelClasses.join(" ") }
      , h("input", attrs)
      , item.text
      )
    );
  }
}

/*
  opts:
    selected: Array
    onchange: (ev) => { ... }
*/
class MyCheckboxGroup {
  static render(name, items, opts){
    const contAttrs = {
      "class": "mycheckboxgroup_container"
    };
    if ("onchange" in opts) {
      contAttrs.onchange = opts.onchange;
    }

    return TreeBuilder.build(h =>
      h("span", contAttrs
      , items.map(item =>
          MyCheckbox.render(name, item, opts.selected)
        )
      )
    );
  }

  static getValues(ev){
    const $tgt = $(ev.target);
    const $cont = $tgt.closest(".mycheckboxgroup_container");

    return Array.from($cont.find("input:checked"))
      .map(input => input.value);
  }

  static getValuesAsInt(ev){
    const vs = MyCheckboxGroup.getValues(ev);
    return vs.map(v => parseInt(v, 10));
  }
}

// --------------------------------

class MyToggleCheckbox {
  static render(checked, text, onchange){
    const labelClasses = ["container_label"];
    if (checked) { labelClasses.push("container_label_selected"); }

    const attrs = {
      type: "checkbox",
      onchange
    };
    if (checked) { attrs.checked = "checked"; }

    return TreeBuilder.build(h =>
      h("label", { "class": labelClasses.join(" ") }
      , h("input", attrs)
      , text
      )
    );
  }

  static isChecked(ev){
    return $(ev.target).prop("checked");
  }
}

// --------------------------------

// TODO feedback to template
/*
Dialog.render({
  id: "foo_dialog"
, onclose: ()=>{ alert("onclose"); }
, content: [ "FDSA", h(...) ]
})
*/
class Dialog {
  static render(opts, ...content){
    return TreeBuilder.build(h =>
      h("div"
      , {
          id: opts.id
        , style: {
            position: "fixed"
          , left: "0"
          , top: "0"
          , width: "100vw"
          , height: "100vh"
          , background: "rgba(127,127,127, 0.2)"
          , "z-index": "10"
          }
        }
      , h("div", {
          style: {
              position: "fixed"
            , left: "10vw"
            , top: "10vh"
            , width: "80vw"
            , height: "80vh"
            , background: "#fff"
            , "box-shadow": "0rem 0rem 2rem rgba(0,0,0, 0.2)"
            , border: "solid 0.1rem #888"
            }
          }
        , h("div", { style: { height: "3rem"
            , "border-bottom": "solid 0.1rem #ddd"
            , background: "#f8f8f8"
            }
          }
          , h("button", {
                onclick: ()=>{ opts.onclose(); }
              }
            , "×"
            )
          )
        , h("div", { style: {
                height: "calc(80vh - 3rem)"
              , padding: "1rem"
              }
            }
          , ...content
          )
        )
      )
    );
  }
}

class BottomPane {
  static render(opts, ...content){
    if (! opts.show) {
      return null;
    }

    return TreeBuilder.build(h =>
      h("div", {}
      , h("div", {
          style: { height: "50vh"
            // , background: "#ff0"
            }
          }
        // , "spacer"
        )
      , h("div"
        , {
            id: opts.id
          , style: {
              position: "fixed"
            , left: "30vw"
            , bottom: "0"
            , width: "70vw"
            , height: "50vh"
            , background: "rgba(127,127,127, 0.2)"
            , "z-index": "10"
            }
          }
        , h("div", {
            style: {
                position: "fixed"
              , left: "30vw"
              , bottom: "0"
              , width: "70vw"
              , height: "50vh"
              , background: "#fff"
              , "box-shadow": "0rem 0rem 2rem rgba(0,0,0, 0.2)"
              , border: "solid 0.1rem #888"
              }
            }
          , h("div", { style: { height: "3rem"
              , "border-bottom": "solid 0.1rem #ddd"
              , background: "#f8f8f8"
              }
            }
            , h("button", {
                  onclick: ()=>{ opts.onclose(); }
                }
              , "×"
              )
            )
          , h("div", { style: {
                  height: "calc(50vh - 3rem)"
                , padding: "1rem"
                }
              }
            , ...content
            )
          )
        )
      )
    );
  }
}
