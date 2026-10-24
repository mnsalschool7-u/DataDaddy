/**
 * Source Integrity check (used by the Kiro Source Integrity Hook).
 *
 * Validates that every DataSource record in src/lib/data/sources.ts carries the
 * required metadata (name, publisher, url, retrievedDate, coverage, limitations,
 * status) and that URLs look well-formed. It parses the file textually so it has
 * zero dependencies and runs quickly in a hook. Exits non-zero on failure.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = resolve(__dirname, "..", "src", "lib", "data", "sources.ts");
const text = readFileSync(file, "utf8");

const REQUIRED = [
  "id",
  "name",
  "publisher",
  "url",
  "retrievedDate",
  "geographicCoverage",
  "processingNotes",
  "reliabilityLimitations",
  "status",
];

// Split into object literals between `{` ... `}` that contain an `id:` field.
const blocks = text.split(/\n\s*\{\s*\n/).filter((b) => b.includes("id:"));
let errors = 0;
let checked = 0;

for (const block of blocks) {
  if (!/id:\s*"/.test(block)) continue;
  checked++;
  const idMatch = block.match(/id:\s*"([^"]+)"/);
  const id = idMatch ? idMatch[1] : "(unknown)";
  for (const field of REQUIRED) {
    const re = new RegExp(`${field}:\\s*`);
    if (!re.test(block)) {
      console.error(`✗ source "${id}" is missing required field: ${field}`);
      errors++;
    }
  }
  const urlMatch = block.match(/url:\s*"([^"]+)"/);
  if (urlMatch && !/^https?:\/\//.test(urlMatch[1])) {
    console.error(`✗ source "${id}" has a malformed url: ${urlMatch[1]}`);
    errors++;
  }
}

// Guard against unsupported assumptions being labeled as observed/official data.
if (/provenance:\s*"official"[\s\S]{0,80}(fabricat|made up|guess)/i.test(text)) {
  console.error("✗ a source appears to label fabricated content as official.");
  errors++;
}

if (checked === 0) {
  console.error("✗ no DataSource records found to validate.");
  process.exit(1);
}

if (errors > 0) {
  console.error(`\nSource integrity check FAILED with ${errors} issue(s).`);
  process.exit(1);
}
console.log(`✓ Source integrity OK — ${checked} source records validated.`);
