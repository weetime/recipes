import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfigModule } from "./sglang-transform.js";

test("parseConfigModule 求值纯数据 config,忽略注释与 import", () => {
  const src = `
// 顶部注释
import { Deployment } from "/src/snippets/_deployment.jsx";
export const config = {
  modelName: "X", // 行内注释
  supportedHardware: ["h200", "gb200"],
  cells: [{ match: { hw: "h200" }, flags: ["--tp 8"] }],
  curl: \`curl http://{{HOST}}\`,
};
`;
  const cfg = parseConfigModule(src);
  assert.equal(cfg.modelName, "X");
  assert.deepEqual(cfg.supportedHardware, ["h200", "gb200"]);
  assert.equal(cfg.cells[0].flags[0], "--tp 8");
  assert.match(cfg.curl, /\{\{HOST\}\}/);
});
