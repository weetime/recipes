import { writeFileSync } from "node:fs";
import { getPerformanceReports } from "../src/lib/performance-reports.js";

const catalog = Object.fromEntries(["en", "zh"].map((locale) => [locale, getPerformanceReports(locale)]));
const identities = Object.fromEntries(catalog.en.map(({ slug, modelName, precision, hardware }) => [slug, { model: modelName, precision, hardware }]));
writeFileSync("public/reports/report-catalog.json", `${JSON.stringify(catalog)}\n`);
writeFileSync("public/reports/report-identities.json", `${JSON.stringify(identities, null, 2)}\n`);
console.log(`Performance catalog: ${catalog.en.length} reports`);
