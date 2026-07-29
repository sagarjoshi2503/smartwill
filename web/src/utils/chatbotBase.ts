// Base URL of the smartwill-chatbot service (separate from the main API —
// see chatbot/.env.example). Empty by default, meaning "same origin as the
// frontend"; set VITE_CHATBOT_BASE_URL when it's served from elsewhere.
const CHATBOT_BASE_URL = (import.meta.env.VITE_CHATBOT_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

export const chatbotUrl = (path: string): string => `${CHATBOT_BASE_URL}${path}`;
