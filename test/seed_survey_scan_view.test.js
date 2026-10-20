import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

test("scan view rejects stale discoveries after replacement and unmount", async () => {
  const pending = [];
  const code = transformSync(readFileSync(new URL("../src/pages/assets/surveys/SeedSurveyOrbitals.jsx", import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class", "class"), {loader:"jsx"}).code;
  const View = vm.runInNewContext(`${code}\nSeedSurveyOrbitals`, {
    React: {createElement:()=>null}, PropTypes:{object:{},func:{}},
    Component: class { constructor(props){this.props=props;} setState(update){Object.assign(this.state,update);} },
    scan_orbitals: (_survey,options) => new Promise(resolve=>pending.push({options,resolve})),
  });
  const view = new View({survey:{}});
  const first = view.start_scan();
  view.props={survey:{}};
  const second = view.start_scan();
  assert.equal(pending[0].options.cancelled(),true);
  pending[0].options.on_result(["stale"]);
  assert.equal(view.state.orbitals.length,0);
  pending[0].resolve(); await first;
  assert.equal(view.state.status,"running");
  pending[1].options.on_result(["current"]);
  assert.equal(view.state.orbitals[0],"current");
  view.componentWillUnmount();
  pending[1].resolve(); await second;
  assert.equal(view.state.status,"running");
});

test("results table uses shared pattern blocks and selection follows an orbital through reranking", () => {
  const code = transformSync(readFileSync(new URL("../src/pages/assets/surveys/SeedSurveyOrbitals.jsx", import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "").replace("export default class", "class"), {loader:"jsx"}).code;
  const selected=[];
  const pattern_block=()=>{};
  const View=vm.runInNewContext(`${code}\nSeedSurveyOrbitals`, {
    React:{createElement:(type,props,...children)=>({type,props,children})},
    PropTypes:{object:{},func:{}}, Component:class {constructor(props){this.props=props;}},
    CoolTable:"table", render_pattern_block:pattern_block,
    CELL_TYPE_CALLBACK:"callback",CELL_TYPE_TEXT:"text",TABLE_CAN_SELECT:"select",TABLE_NO_BORDER:"no-border",
    same_orbital:(a,b)=>JSON.stringify(a)===JSON.stringify(b),
    AppText:{get:key=>key},
    KEY_ASSETS_SURVEYS_SCAN_PROGRESS:"${processed} of ${total} cached seeds processed (${remaining} remaining)", KEY_ASSETS_SURVEYS_SCAN_WAITING:"waiting", KEY_ASSETS_SURVEYS_SCAN_RUNNING:"running", KEY_ASSETS_SURVEYS_SCAN_COMPLETE:"complete",KEY_ASSETS_SURVEYS_FAILED:"failed",
    KEY_ASSETS_SURVEYS_TABLE_PATTERN:"pattern",KEY_ASSETS_SURVEYS_TABLE_CONFIDENCE:"confidence",KEY_ASSETS_SURVEYS_TABLE_SEED:"seed point",KEY_ASSETS_SURVEYS_TABLE_DISCOVERIES:"discoveries",
  });
  const first={orbital_id:1,points:[{x:0,y:0}],seed:{x:0.1,y:0.2},confidence:0.999,discovery_count:3};
  const second={...first,orbital_id:2,points:[{x:1,y:1}],seed:{x:0.3,y:0.4},discovery_count:8};
  const view=new View({selected_orbital:first,on_select_orbital:orbital=>selected.push(orbital)});
  view.state={status:"complete",orbitals:[first,second]};
  view.state.progress={processed:2,total:5};
  const rendered=view.render();
  const progress=rendered.children[0].children[1];
  assert.equal(progress.type,"progress");
  assert.equal(progress.props.max,5);
  assert.equal(progress.props.value,2);
  assert.equal(progress.props["aria-label"],"2 of 5 cached seeds processed (3 remaining)");
  const table=rendered.children[1];
  assert.equal(table.props.columns.map(x=>x.label_key).join(","),"pattern,confidence,discoveries,seed point");
  assert.equal(table.props.data[0].pattern[0],pattern_block);
  assert.equal(table.props.selected_row,1);
  table.props.on_select_row(0);
  assert.equal(selected[0],second);
  assert.equal(table.props.data[0].confidence,"99.90%");
  assert.equal(table.props.data[0].discoveries,"8");
  assert.equal(table.props.data[1].discoveries,"3");
  assert.equal(view.state.orbitals[0],first,"display sorting preserves scan ranking");
  view.props.selected_orbital=second;
  view.state.orbitals=[{...first,points:second.points}, {...second}];
  assert.equal(view.render().children[1].props.selected_row,0,"selection uses identity even when points match another row");
  view.state.orbitals=[{...first,merged_ids:[2]}];
  assert.equal(view.render().children[1].props.selected_row,0,"merged groups retain selection through their IDs");
});

test("streamed updates queue behind active work and share scan state until final completion", async () => {
  const pending=[];
  const code=transformSync(readFileSync(new URL("../src/pages/assets/surveys/SeedSurveyOrbitals.jsx",import.meta.url),"utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "").replace("export default class","class"),{loader:"jsx"}).code;
  const View=vm.runInNewContext(`${code}\nSeedSurveyOrbitals`,{
    React:{createElement:()=>null},PropTypes:{object:{},func:{}},
    Component:class {constructor(props){this.props=props;}setState(update){Object.assign(this.state,update);}},
    scan_orbitals:(_survey,options)=>new Promise(resolve=>pending.push({options,resolve})),
  });
  const view=new View({survey:{request_id:7,complete:false}});
  const active=view.start_scan();
  pending[0].options.on_result(["early"]);
  assert.equal(view.state.orbitals[0],"early");
  view.props={survey:{request_id:7,complete:false}};
  await view.start_scan();
  view.props={survey:{request_id:7,complete:true}};
  await view.start_scan();
  assert.equal(pending.length,1,"no parallel scan or restart on incoming buffers");
  assert.equal(pending[0].options.cancelled(),false);
  pending[0].resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(pending.length,2);
  assert.equal(pending[0].options.state,pending[1].options.state);
  assert.equal(view.state.status,"running");
  pending[1].options.on_result(["final"]);
  pending[1].resolve();await active;
  assert.equal(view.state.status,"complete");
  assert.equal(view.state.orbitals[0],"final");
});
