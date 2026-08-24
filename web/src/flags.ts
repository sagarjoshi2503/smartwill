/** Feature-flag key registry — bare key names only, decoupled from the URL
 * shape that talks to the current flag product (see hooks/useFlag.ts). If
 * the feature-toggle backend ever changes, only this file and useFlag.ts
 * need to change; every call site keeps using FLAGS.<name>. */
export const FLAGS = {
  adminButton: "enable-admin-button",
  razorpay: "use-razorpay",
  chatbot: "enable-chat-bot",
  adminSignup: "enable-admin-signup",
  livePreview: "enable-live-preview",
  showBuildNr: "show-build-nr",
  skipIdFieldsValidation: "skip-idfields-validation",
  adminReview: "enable-admin-review",
  chatbotFeedbackUi: "enable-chatbotfeedback-ui",
  showAiUsage: "show-ai-usage",
} as const;

export type FlagKey = typeof FLAGS[keyof typeof FLAGS];
