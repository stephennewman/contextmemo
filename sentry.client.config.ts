import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // No performance tracing for now — keep bundle lean
  tracesSampleRate: 0,

  // Filter out known noise before sending
  beforeSend(event) {
    const msg = event.exception?.values?.[0]?.value || "";

    // Browser extension / resize observer noise
    if (
      msg.includes("ResizeObserver loop") ||
      msg.includes("ResizeObserver loop completed with undelivered notifications")
    ) {
      return null;
    }

    // Stale chunk loads after deploy
    if (msg.includes("ChunkLoadError") || msg.includes("Loading chunk")) {
      return null;
    }

    return event;
  },

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
});
