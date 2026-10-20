import test from "node:test";
import assert from "node:assert/strict";
import { messages } from "./messages.js";

test("provides English and Chinese catalogs for next-intl", () => {
  assert.equal(messages.en.nav.browse, "Browse");
  assert.equal(messages.zh.nav.browse, "浏览配方");
});

test("uses ICU plural messages and keeps author-provided content in its source language", () => {
  assert.match(messages.en.org.recipeCount, /plural/);
  assert.equal(messages.zh.org.recipeCount, "{count} 个模型配方");
  assert.equal(messages.zh.detail.originalContent, "以下内容由作者提供，保持原始语言展示。");
});

test("both locales expose the core interface namespaces", () => {
  for (const locale of ["en", "zh"]) {
    for (const namespace of ["common", "nav", "home", "browse", "reports", "detail"]) {
      assert.ok(messages[locale][namespace], `${locale}.${namespace} should exist`);
    }
  }
});
