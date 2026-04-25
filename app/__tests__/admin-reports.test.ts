import { describe, expect, it } from "vitest";
import { createExportArtifact } from "@/lib/admin/reports";

describe("createExportArtifact", () => {
  it("creates json export artifact", () => {
    const artifact = createExportArtifact({ ok: true }, "overview", "json");
    expect(artifact.contentType).toContain("application/json");
    expect(artifact.filename).toContain("admin-overview-");
    expect(artifact.body).toContain("\"ok\": true");
  });

  it("creates csv export artifact from rows payload", () => {
    const artifact = createExportArtifact(
      {
        rows: [
          { id: "1", success: true },
          { id: "2", success: false },
        ],
      },
      "generations",
      "csv",
    );
    expect(artifact.contentType).toContain("text/csv");
    expect(artifact.filename).toContain("admin-generations-");
    expect(artifact.body).toContain("id,success");
    expect(artifact.body).toContain("1,true");
  });
});

