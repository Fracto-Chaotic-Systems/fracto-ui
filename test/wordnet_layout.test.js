import assert from "node:assert/strict";
import test from "node:test";
import {wordnet_split_bounds} from "../src/pages/games/WordnetLayout.js";
test("reference splitter retains saved widths while clamping narrow containers",()=>{
 assert.deepEqual(wordnet_split_bounds(1000,6,450),{min:180,max:814,position:450});
 assert.equal(wordnet_split_bounds(1000,6,900).position,814);
 assert.equal(wordnet_split_bounds(1000,6,-100).position,180);
 assert.deepEqual(wordnet_split_bounds(300,6,450),{min:147,max:147,position:147});
 assert.equal(wordnet_split_bounds(0,6,450).position,0);
 assert.equal(wordnet_split_bounds(1000,6,NaN).position,450);
});
