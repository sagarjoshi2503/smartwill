import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

/**
 * Renders Google's official "Sign in with Google" button via Google Identity
 * Services. Hands the raw (unverified) ID token up to the caller — the caller
 * is responsible for sending it to a backend that verifies it server-side.
 */
export default function GoogleSignInButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [scriptError, setScriptError] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !divRef.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => onCredential(resp.credential),
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "outline", size: "large", width: 320, text: "continue_with",
      });
    };

    if (window.google) {
      render();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    script.addEventListener("error", () => setScriptError(true));
    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
    };
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        Google Sign-In isn't configured — set <code>VITE_GOOGLE_CLIENT_ID</code> in your environment.
      </div>
    );
  }

  if (scriptError) {
    return (
      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
        Couldn't load Google Sign-In. Check your connection and try again.
      </div>
    );
  }

  return <div ref={divRef} className="flex justify-center" />;
}
