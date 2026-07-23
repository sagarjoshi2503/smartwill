/** Cross-cutting numeric, literal, and user-facing-message constants used
 * throughout the frontend, centralized here instead of being scattered
 * as inline literals or duplicated wording. Mirrors the organization of
 * the backend's app/shared/constants.py. */

// --- Will status values ---
export const STATUS_DRAFT = "Draft" as const;
export const STATUS_PENDING_REVIEW = "PendingReview" as const;
export const STATUS_COMPLETED = "Completed" as const;

// --- Routes ---
export const ADMIN_PATH = "/admin";

// --- Payments (Razorpay Standard Checkout) ---
// Publishable key — safe for the browser (it's what opens the Checkout
// modal). The secret that signs orders/verifies payments never leaves the
// backend; see api/.env.example.
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;

// --- API paths (pass to utils/apiBase's apiUrl()) ---
export const API_FLAGS = "/api/flags?key=enable-admin-button";
// Vercel Flag gating whether Razorpay Checkout is offered at all when
// submitting a Will for review — see App.tsx and WizardForms.tsx.
export const API_RAZORPAY_FLAG = "/api/flags?key=use-razorpay";
export const API_PAYMENTS_CREATE_ORDER = "/api/payments/create-order";
export const API_PAYMENTS_VERIFY = "/api/payments/verify";
export const API_PAYMENTS_MARK_FAILED = "/api/payments/mark-failed";
export const API_GOOGLE = "/api/auth/google";
export const API_ADMIN_LOGIN = "/api/auth/admin-login";
export const API_ADMIN_SIGNUP = "/api/auth/admin-signup";
export const API_WILL_SAVE = "/api/will/save";
export const API_ADMIN_SAVE = "/api/will/admin/save";
export const API_ADMIN_WILLS = "/api/will/admin-wills";
export const API_MY_WILLS = "/api/will/my-wills";
export const API_OTP_REQUEST = "/api/auth/otp/request";
export const API_OTP_VERIFY = "/api/auth/otp/verify";
export const apiPathWill = (willId: string): string => `/api/will/${willId}`;
export const apiPathAdminWill = (willId: string): string => `/api/will/admin/${willId}`;
export const apiPathSendBack = (willId: string): string => `/api/will/admin/${willId}/send-back`;
export const apiPathComplete = (willId: string): string => `/api/will/admin/${willId}/complete`;

// --- Business rules ---
export const MIN_PASSWORD_LENGTH = 8;
export const WILL_VISIBLE_DAYS = 30;
export const OTP_LENGTH = 6;
export const PHONE_MASK_DIGITS = 5;
export const COUNTRY_CODE_PREFIX = "+91 ";

// --- UI timing (milliseconds) ---
export const SEND_BACK_REDIRECT_MS = 300;
export const DRAFT_RESET_MS = 2500;
export const WIZARD_REDIRECT_MS = 900;

// --- Status labels (display text) ---
export const STATUS_LBL: Record<string, string> = {
  [STATUS_DRAFT]: "Draft",
  [STATUS_PENDING_REVIEW]: "Pending Review",
  [STATUS_COMPLETED]: "Completed",
};

// --- Form field labels ---
export const LBL_LEGAL_NAME = "Full Legal Name";
export const LBL_FULL_NAME = "Full Name";
export const LBL_MOBILE = "Mobile Number";
export const LBL_EMAIL = "Email";
export const LBL_STATE = "State of Residence";
export const LBL_ID_TYPE = "ID Type";
export const LBL_ID_NUMBER = "ID Number";
export const LBL_ADDRESS = "Address";
export const LBL_EMAIL_ADDR = "Email Address";
export const LBL_PASSWORD = "Password";
export const PH_LAWFIRM_EMAIL = "you@lawfirm.com";

// --- Tooltip / help text ---
export const TIP_NO_ID_SAVED = "No ID Number will be saved in database";
export const MSG_VIEW_ONLY = "Viewing a submitted Will — saving is disabled";

// --- Button / action labels ---
export const BTN_SAVE_AS_DRAFT = "Save as Draft";
export const BTN_COMPLETE_REVIEW = "Save and Complete Review";
export const BTN_SUBMIT_REVIEW = "Save and Submit for Review";
export const BTN_CREATE_ACCOUNT = "Create Account";
export const MSG_SAVING = "Saving…";

// --- Confirmation / error copy ---
export const CONFIRM_DELETE_WILL = "Delete this Will? This cannot be undone.";
export const ERR_LOAD_WILL = "Could not load this Will.";
export const ERR_DELETE_WILL = "Could not delete this Will.";
export const ERR_SEND_OTP = "Could not send OTP.";
export const ERR_VERIFY_OTP = "Could not verify OTP.";
export const MSG_SENDING_OTP = "Sending OTP…";
export const MSG_VERIFYING_OTP = "Verifying…";
