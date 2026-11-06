import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getPerformanceReports } from "../src/lib/performance-reports.js";

const root = path.join(process.cwd(), "public", "reports");
const catalog = JSON.parse(readFileSync("src/lib/performance-report-splits.json", "utf8"));
const reportData = (slug) => JSON.parse(readFileSync(path.join(root, "data", `${slug}.json`), "utf8"));

test("split reports appear once and legacy URLs point to an available report", () => {
  const reports = getPerformanceReports("en");
  const slugs = reports.map((report) => report.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const entry of catalog.reports) {
    assert.ok(slugs.includes(entry.slug), entry.slug);
    assert.ok(existsSync(path.join(root, entry.slug, "index.html")), entry.slug);
  }
  for (const [oldSlug, newSlug] of Object.entries(catalog.replaced)) {
    assert.ok(!slugs.includes(oldSlug), oldSlug);
    assert.ok(slugs.includes(newSlug), newSlug);
    assert.match(readFileSync(path.join(root, oldSlug, "index.html"), "utf8"), new RegExp(`/reports/${newSlug}/index\\.html`));
  }
});

test("split report tables and charts preserve dimensions and measured values", () => {
  for (const entry of catalog.reports) {
    const report = reportData(entry.slug);
    assert.ok(report.blocks.length > 0, entry.slug);
    for (const block of report.blocks) {
      if (block.table) {
        const { headers, rows } = block.table;
        assert.equal(headers.zh.length, headers.en.length, `${entry.slug}/${block.id}`);
        for (const row of rows) assert.equal(row.length, headers.en.length, `${entry.slug}/${block.id}`);
      }
      if (block.chart) {
        assert.equal(block.chart.labels.zh.length, block.chart.labels.en.length, `${entry.slug}/${block.id}`);
        for (const series of block.chart.series) assert.equal(series.values.length, block.chart.labels.en.length, `${entry.slug}/${block.id}`);
      }
    }
  }

  const original = reportData("qwen3-32b-sharegpt-ascend-910b4");
  for (const [slug, engine] of [["vllm", "vLLM-Ascend"], ["mindie", "MindIE"], ["sglang", "SGLang"]]) {
    const split = reportData(`qwen3-32b-bf16-910b4-${slug}`);
    const expected = original.blocks[0].table.rows.filter((row) => row[0] === engine).map((row) => row.slice(1));
    assert.deepEqual(split.blocks[0].table.rows, expected, engine);
    assert.deepEqual(split.blocks[0].chart.series[0].values, expected.map((row) => Number(row[1].replaceAll(",", ""))));
  }
});

test("recipe-specific results do not mix the old and new MTP measurements", () => {
  const old = reportData("qwen38-27b-w8a8-910b3-mtp-old");
  const current = reportData("qwen38-27b-w8a8-910b3-mtp-new");
  assert.equal(old.blocks[0].table.rows[0][4], "63.09");
  assert.equal(current.blocks[0].table.rows[0][4], "70.25");
  for (const block of old.blocks.filter((b) => ["draft", "resources"].includes(b.id))) {
    assert.ok(block.table.rows.every((row) => row[0].startsWith("OLD /")));
  }
  for (const block of current.blocks.filter((b) => ["draft", "resources"].includes(b.id))) {
    assert.ok(block.table.rows.every((row) => row[0].startsWith("NEW /")));
  }
});

test("list curves preserve one workload and use measured metrics", () => {
  const reports = getPerformanceReports("en");
  const deepseek = reports.find((report) => report.slug === "deepseek-v41-1017-a100");
  assert.deepEqual(deepseek.curve.labels, ["1", "8", "16", "32", "48"]);
  assert.deepEqual(deepseek.curve.values, [1180.62, 377.98, 424.24, 582.33, 753.42]);
  assert.match(deepseek.curve.title, /8K\/512/);
  const mtp = reports.find((report) => report.slug === "qwen36-27b-w8a8-910b4-mtp3");
  assert.deepEqual(mtp.curve.values, [33.2, 327, 455, 467.4, 487.4]);
  assert.equal(mtp.curve.unit, "tok/s");
  const onePoint = reports.find((report) => report.slug === "glm-5-2-w4a8-ppu-longctx-tp8-dp");
  assert.equal(onePoint.curve, null);
});

test("static catalog and report identity data match the application catalog", () => {
  const reports = getPerformanceReports("en");
  const catalog = JSON.parse(readFileSync(path.join(root, "report-catalog.json"), "utf8"));
  const identities = JSON.parse(readFileSync(path.join(root, "report-identities.json"), "utf8"));
  assert.deepEqual(catalog.en.map((report) => report.slug), reports.map((report) => report.slug));
  for (const { slug, modelName, precision, hardware } of reports) {
    assert.deepEqual(identities[slug], { model: modelName, precision, hardware });
  }
});
