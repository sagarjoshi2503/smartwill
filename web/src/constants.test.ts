import { describe, expect, it } from "vitest";
import { apiPathAdminWill, apiPathComplete, apiPathSendBack, apiPathWill, STATUS_LBL } from "./constants";
import { STATUS_COMPLETED, STATUS_DRAFT, STATUS_PENDING_REVIEW } from "./constants";

describe("api path builders", () => {
  it("interpolate the will id into each path", () => {
    expect(apiPathWill("abc123")).toBe("/api/will/abc123");
    expect(apiPathAdminWill("abc123")).toBe("/api/will/admin/abc123");
    expect(apiPathSendBack("abc123")).toBe("/api/will/admin/abc123/send-back");
    expect(apiPathComplete("abc123")).toBe("/api/will/admin/abc123/complete");
  });
});

describe("STATUS_LBL", () => {
  it("has a display label for every status value", () => {
    expect(STATUS_LBL[STATUS_DRAFT]).toBe("Draft");
    expect(STATUS_LBL[STATUS_PENDING_REVIEW]).toBe("Pending Review");
    expect(STATUS_LBL[STATUS_COMPLETED]).toBe("Completed");
  });
});
