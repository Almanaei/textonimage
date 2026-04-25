/**
 * T-018 — Local test render script.
 *
 * Run with:
 *   npx tsx scripts/test-render.ts
 *
 * Writes the generated certificate to scripts/output/test-output.png
 * so you can visually verify the layout before running the full server.
 */

import fs from "fs";
import path from "path";
import { generateCertificate } from "../lib/generate-image";

const TEST_CASES: Array<{ name: string; email: string; label: string }> = [
  {
    label: "reference-name",
    name: "سالم احمد المناعي",
    email: "test@example.com",
  },
  {
    label: "short-name",
    name: "فاطمة",
    email: "test@example.com",
  },
  {
    label: "long-name",
    name: "عبدالرحمن محمد عبدالله الخالدي",
    email: "test@example.com",
  },
];

async function main() {
  const outDir = path.join(__dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });

  for (const tc of TEST_CASES) {
    console.log(`Rendering: ${tc.label} — "${tc.name}"`);
    try {
      const pngBuffer = await generateCertificate({
        name: tc.name,
        email: tc.email,
      });
      const outPath = path.join(outDir, `${tc.label}.png`);
      fs.writeFileSync(outPath, pngBuffer);
      console.log(`  ✓ Saved → ${outPath} (${pngBuffer.length} bytes)`);
    } catch (err) {
      console.error(`  ✗ Error: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
