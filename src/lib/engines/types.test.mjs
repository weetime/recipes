import { test } from "node:test";
import assert from "node:assert/strict";
import { defineEngine } from "./types.js";

const ok = { id: "x", synthesize: () => {}, synthesizeOmni: () => {} };

test("defineEngine accepts a complete adapter", () => {
  assert.equal(defineEngine(ok), ok);
});

test("defineEngine requires a string id", () => {
  assert.throws(() => defineEngine({ synthesize: () => {}, synthesizeOmni: () => {} }), /string id/);
});

test("defineEngine requires synthesize()", () => {
  assert.throws(() => defineEngine({ id: "x", synthesizeOmni: () => {} }), /must implement synthesize\(\)/);
});

test("defineEngine requires synthesizeOmni()", () => {
  assert.throws(() => defineEngine({ id: "x", synthesize: () => {} }), /must implement synthesizeOmni\(\)/);
});
