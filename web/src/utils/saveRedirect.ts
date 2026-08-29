import { STATUS_COMPLETED, STATUS_PENDING_REVIEW } from "../constants";
import type { ViewName } from "../types";

// What App.tsx's onSaved handler should do after a Will save completes,
// given the status the server actually assigned and who submitted it.
// Extracted as a pure function so this decision is unit-testable without
// rendering the whole wizard — regression coverage for a real bug: a plain
// testator whose submission auto-completed (STATUS_COMPLETED, "enable-
// admin-review" off) was being redirected to the Admin Portal (wrong — they
// aren't an admin) instead of staying on the wizard where their now-
// unlocked ID fields are ready to fill in before generating the document.
export function resolveSaveRedirect(status: string, isAdminSubmit: boolean): ViewName | null {
  if (status === STATUS_PENDING_REVIEW) return "myWills";
  // Only an admin's own completion (reviewing, or creating a Will on a
  // client's behalf) returns to the Admin Portal — a plain testator
  // reaching STATUS_COMPLETED directly stays right where they are.
  if (status === STATUS_COMPLETED && isAdminSubmit) return "admin";
  return null;
}
