import { describe, expect, it } from "vitest";
import { resolveSaveRedirect } from "../../utils/saveRedirect";
import { STATUS_COMPLETED, STATUS_DRAFT, STATUS_PENDING_REVIEW } from "../../constants";

describe("resolveSaveRedirect", () => {
  it("sends a PendingReview submission to My Wills, regardless of who submitted it", () => {
    expect(resolveSaveRedirect(STATUS_PENDING_REVIEW, false)).toBe("myWills");
    expect(resolveSaveRedirect(STATUS_PENDING_REVIEW, true)).toBe("myWills");
  });

  it("sends an admin's own Completed submission back to the Admin Portal", () => {
    expect(resolveSaveRedirect(STATUS_COMPLETED, true)).toBe("admin");
  });

  it("does NOT redirect a plain testator whose submission auto-completed (enable-admin-review off)", () => {
    // Regression test: this used to redirect to "admin" unconditionally,
    // sending a non-admin testator to a view they have no profile for.
    expect(resolveSaveRedirect(STATUS_COMPLETED, false)).toBeNull();
  });

  it("does not redirect for a Draft save", () => {
    expect(resolveSaveRedirect(STATUS_DRAFT, false)).toBeNull();
    expect(resolveSaveRedirect(STATUS_DRAFT, true)).toBeNull();
  });
});
