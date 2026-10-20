import test from "node:test";
import assert from "node:assert/strict";
import { newton_big_complex } from "@fracto/sdk/orbitals/FractoNewtonBigComplex.js";
import { non_escape_seeds, same_orbital, scan_orbitals, refine_seed, merge_orbital } from "../src/pages/assets/surveys/SeedSurveyScan.js";
const survey = {
  canvas_buffer: [[[0, 1], [0, 1], [0, 1]], [[2, 9], [0, 1], [2, 9]], [[0, 1], [2, 9], [2, 9]]],
  half_span: 1.5, sampling: "bounds", focal_point: {x: -1, y: 0}, iteration_limit: 100000,
};
test("all nonescaping samples use with upward imaginary coordinates", () => {
  assert.deepEqual([...non_escape_seeds(survey)].map(x => x.seed), [{x:0,y:1.5}, {x:1.5,y:0}, {x:0,y:-1.5}, {x:1.5,y:-1.5}]);
  assert.equal([...non_escape_seeds({...survey, sampling:"centers"})][0].seed.y, 1);
});
test("candidate first point matches any existing point regardless of cardinality", () => {
  const points = [{x:0,y:0}, {x:-1,y:0}];
  assert.equal(same_orbital(points, [...points].reverse()), true);
  assert.equal(same_orbital(points, [{x:2,y:2},{x:1,y:0}]), false);
});
test("scan visits every nonescape seed, deduplicates discoveries, yields and cancels", async () => {
  let visits=0, pauses=0;
  const points=[{x:0,y:0},{x:-1,y:0}];
  const found=await scan_orbitals(survey, {
    pause:async()=>{pauses++;},
    refine:(_survey,seed)=>{visits++; return {seed,points:visits%2 ? points : [...points].reverse(),confidence:0.8};},
  });
  assert.equal(visits,4); assert.equal(pauses,4); assert.equal(found.length,1);
  assert.equal(found[0].discovery_count,4);
  await scan_orbitals(survey,{pause:async()=>{}, cancelled:()=>true,refine:()=>assert.fail("cancelled")});
});
test("real seeded Newton accepts the stable period-two cycle at c=-1", () => {
  const result=refine_seed(survey,{x:0,y:0});
  assert.ok(result);
  assert.equal(result.points.length,2);
  assert.ok(result.confidence>1-1e-8);
  assert.equal(refine_seed(survey,{x:2,y:2}),null);
});

test("scan ranks the best ten, accepts lower confidence and replaces weaker duplicate configurations", async () => {
  const size=8;
  const grid=Array.from({length:size},(_,column)=>Array.from({length:size},()=>[column%2 ? 2 : 0,9]));
  let visits=0;
  const updates=[];
  const result=await scan_orbitals({...survey,canvas_buffer:grid}, {
    pause:async()=>{},
    on_result:list=>updates.push(list),
    refine:()=> {
      const index=visits++;
      // First 16 configurations, then rediscover them with higher scores.
      return {points:[{x:index%16,y:0}],confidence:index/32,seed:{x:index,y:0}};
    },
  });
  assert.equal(visits,32,"continues scanning after ten candidates");
  assert.equal(result.length,10);
  assert.deepEqual(result.map(x=>x.confidence),Array.from({length:10},(_,i)=>(16+i)/32));
  assert.equal(new Set(result.map(x=>x.points[0].x)).size,10);
  assert.ok(result.every(x=>x.discovery_count===2), "counts survive falling out of the top ten");
  assert.equal(updates[0][0].discovery_count,1, "prior snapshots remain unchanged");
  assert.ok(updates.every(list=>list.length<=10));
});

test("corrected Newton scan accepts the reported configuration only after it closes", async () => {
  const size=250;
  const buffer=Array.from({length:size},()=>Array.from({length:size},()=>[0,1]));
  // Actual escape-to-nonescape boundary found in the reported survey.
  buffer[119][54]=[18,9];
  const reported={...survey,canvas_buffer:buffer,focal_point:{x:0.134944799,y:0.5615665185}};
  const found=await scan_orbitals(reported,{pause:async()=>{}});
  assert.equal(found.length,1);
  assert.ok(found[0].closure_error<=1e-7);
});

test("weaker rediscoveries increment counts while preserving the best result", async () => {
  let visits=0;
  const result=await scan_orbitals(survey,{
    pause:async()=>{},
    refine:()=>({points:[{x:1,y:1}],confidence:[0.8,0.9,0.7,0.6][visits++]}),
  });
  assert.equal(result[0].confidence,0.9);
  assert.equal(result[0].discovery_count,4);
});

test("full scan visits interior and edge cells once and skips escape cells", async () => {
  const size=4;
  const grid=Array.from({length:size},()=>Array.from({length:size},()=>[0,1]));
  for (const [column,row] of [[0,0],[1,0],[0,1],[1,1],[3,3]]) grid[column][row]=[2,9];
  const mixed={...survey,canvas_buffer:grid};
  const positions=[...non_escape_seeds(mixed)];
  assert.deepEqual(positions.map(p=>[p.column,p.row]),[[0,0],[1,0],[0,1],[1,1],[3,3]]);
  const tested=[];
  await scan_orbitals(mixed,{pause:async()=>{},refine:(_survey,seed)=>{tested.push(seed);return null;}});
  assert.equal(tested.length,5);
  assert.equal(new Set(tested.map(p=>`${p.x},${p.y}`)).size,5);
});

test("orbital matching uses Euclidean distance within one hundredth", () => {
  const existing=[{x:2,y:2},{x:0,y:0},{x:3,y:3}];
  assert.equal(same_orbital([{x:0.01,y:0}],existing),true);
  assert.equal(same_orbital([{x:0.010001,y:0}],existing),false);
  assert.equal(same_orbital([{x:0.008,y:0.008}],existing),false);
  assert.equal(same_orbital([],existing),false);
});

test("scan increments matching configuration using new candidate's point and preserves best confidence", async () => {
  let index=0;
  const candidates=[
    {points:[{x:10,y:0},{x:20,y:0}],confidence:0.9},
    {points:[{x:20.005,y:0}],confidence:0.8},
    {points:[{x:20.006,y:0},{x:99,y:0},{x:100,y:0}],confidence:0.95},
  ];
  const result=await scan_orbitals(survey,{pause:async()=>{},refine:()=>candidates[Math.min(index++, candidates.length - 1)]});
  assert.equal(result.length,1);
  assert.equal(result[0].discovery_count,4);
  assert.equal(result[0].confidence,0.95);
});

test("incremental buffers retain ranking and counts without refining old pixels again", async () => {
  const buffer=Array.from({length:3},()=>Array(3).fill(null));
  const state={found:[],tested_pixels:new Set()};
  let visits=0;
  const options={state,pause:async()=>{},refine:(_survey,seed)=>{
    visits++;return {seed,points:[{x:1,y:1}],confidence:visits/10};
  }};
  buffer[0][0]=[2,9];buffer[1][0]=[0,1];buffer[2][0]=[2,9];
  let result=await scan_orbitals({...survey,canvas_buffer:buffer},options);
  assert.equal(result[0].discovery_count,2);
  assert.equal(visits,2);
  buffer[0][1]=[0,1];buffer[1][1]=[2,9];buffer[2][1]=[2,9];
  result=await scan_orbitals({...survey,canvas_buffer:buffer},options);
  assert.equal(visits,4);
  assert.equal(result[0].discovery_count,4);
  assert.equal(result[0].confidence,0.4);
  await scan_orbitals({...survey,canvas_buffer:buffer},options);
  assert.equal(visits,4,"repainting the same buffer never repeats work");
});

test("cache progress includes rejected seeds, grows with batches, and does not count repeats", async () => {
  const buffer=Array.from({length:2},()=>Array(2).fill(null));
  const state={found:[],tested_pixels:new Set()};
  const progress=[];
  const options={state,pause:async()=>{},refine:()=>null,on_progress:value=>progress.push(value)};
  buffer[0][0]=[2,9];buffer[1][0]=[0,1];
  await scan_orbitals({...survey,canvas_buffer:buffer},options);
  assert.deepEqual(progress.at(-1),{processed:1,total:1});
  buffer[0][1]=[2,9];buffer[1][1]=[2,9];
  await scan_orbitals({...survey,canvas_buffer:buffer},options);
  assert.deepEqual(progress.at(-1),{processed:3,total:3});
  await scan_orbitals({...survey,canvas_buffer:buffer},options);
  assert.deepEqual(progress.at(-1),{processed:3,total:3});
});

test("confidence differences never prevent merging, including newly overlapping groups", () => {
  const found=[];
  merge_orbital(found,{points:[{x:0,y:0}],confidence:0.9},1);
  merge_orbital(found,{points:[{x:1,y:0}],confidence:0.95},2);
  assert.equal(found.length,2);
  // This better result matches group 1 and brings its point set into group 2.
  merge_orbital(found,{points:[{x:0,y:0},{x:1,y:0}],confidence:0.99},3);
  assert.equal(found.length,1);
  assert.equal(found[0].discovery_count,3);
  assert.equal(found[0].confidence,0.99);
  assert.ok(found[0].orbital_id===1 || found[0].merged_ids.includes(1));
  assert.ok(found[0].orbital_id===2 || found[0].merged_ids.includes(2));
  merge_orbital(found,{points:[{x:1.005,y:0}],confidence:0.2},4);
  assert.equal(found.length,1);
  assert.equal(found[0].discovery_count,4);
  assert.equal(found[0].confidence,0.99);
});

test("membership favors discoveries over confidence and confidence does not break ties", async () => {
  const size=8;
  const grid=Array.from({length:size},(_,column)=>Array.from({length:size},()=>[column%2 ? 2 : 0,9]));
  let visits=0;
  const result=await scan_orbitals({...survey,canvas_buffer:grid},{
    pause:async()=>{},
    refine:()=> {
      const index=visits++;
      return {points:[{x:index<12 ? index : 999,y:0}],confidence:index<12 ? 0.99 : 0.1};
    },
  });
  assert.equal(result.length,10);
  assert.equal(result[0].points[0].x,999);
  assert.equal(result[0].discovery_count,20);
  assert.equal(result[0].confidence,0.1);
  assert.deepEqual(result.slice(1).map(x=>x.points[0].x),Array.from({length:9},(_,i)=>i));
});

test("reported six-point case closes after best-iterate correction", () => {
  const reported={...survey,focal_point:{x:0.3677540133,y:0.23766438924}};
  const seed={x:-0.1746988,y:-1.0180723};
  const c=reported.focal_point;
  const result=newton_big_complex(c,80,6,{seed,precision_digits:64});
  assert.equal(result.closure_reached,true);
  assert.ok(result.closure_error<=result.closure_tolerance);
  assert.ok(refine_seed(reported,seed).closure_error<=1e-7);
});
