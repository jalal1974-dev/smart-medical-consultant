import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

// ── Auth error codes (must match server/_core/trpc.ts errorFormatter output) ──
// These are the structured codes attached to error.data.authCode by the server.
const AUTH_CODE_NO_SESSION = "AUTH_NO_SESSION";
const AUTH_CODE_INVALID_SESSION = "AUTH_INVALID_SESSION";
const AUTH_CODE_SYNC_FAILED = "AUTH_SYNC_FAILED";
const AUTH_CODE_USER_NOT_FOUND = "AUTH_USER_NOT_FOUND";
const AUTH_CODE_FORBIDDEN = "AUTH_FORBIDDEN";

// Codes that mean "not logged in at all" → redirect to login
const UNAUTHENTICATED_CODES = new Set([
  AUTH_CODE_NO_SESSION,
  AUTH_CODE_INVALID_SESSION,
  AUTH_CODE_SYNC_FAILED,
  AUTH_CODE_USER_NOT_FOUND,
]);

// ── Error data shape returned by our tRPC errorFormatter ─────────────────────
interface TrpcErrorData {
  code?: string;        // tRPC procedure-level code (e.g. "UNAUTHORIZED", "FORBIDDEN")
  authCode?: string;    // Our structured auth code (e.g. "AUTH_NO_SESSION")
  httpStatus?: number;
}

// ── Redirect logic ────────────────────────────────────────────────────────────
const handleAuthError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const data = error.data as TrpcErrorData | undefined;
  const authCode = data?.authCode;
  const trpcCode = data?.code;

  // 1. Unauthenticated: no session / invalid session / sync failure
  //    → redirect to login with ?next= so the user returns after sign-in
  if (
    authCode && UNAUTHENTICATED_CODES.has(authCode) ||
    trpcCode === "UNAUTHORIZED"
  ) {
    const next = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    window.location.href = `/login?next=${next}`;
    return;
  }

  // 2. Forbidden: authenticated but wrong role
  //    → do NOT redirect to login (user is already logged in); let the page
  //    handle it gracefully. We just log it here for observability.
  if (authCode === AUTH_CODE_FORBIDDEN || trpcCode === "FORBIDDEN") {
    console.warn("[Auth] Access denied (insufficient role):", error.message);
    return;
  }
};

// ── QueryClient with global error interception ────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Do not retry on auth errors — they will not resolve without user action
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError) {
          const data = error.data as TrpcErrorData | undefined;
          const authCode = data?.authCode;
          const trpcCode = data?.code;
          if (
            (authCode && (UNAUTHENTICATED_CODES.has(authCode) || authCode === AUTH_CODE_FORBIDDEN)) ||
            trpcCode === "UNAUTHORIZED" ||
            trpcCode === "FORBIDDEN"
          ) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
  },
});

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    handleAuthError(error);
    // Only log non-auth errors to avoid noise; auth errors are expected on
    // protected pages before the user has logged in.
    const data = (error instanceof TRPCClientError)
      ? (error.data as TrpcErrorData | undefined)
      : undefined;
    const isAuthError =
      (data?.authCode && (UNAUTHENTICATED_CODES.has(data.authCode) || data.authCode === AUTH_CODE_FORBIDDEN)) ||
      data?.code === "UNAUTHORIZED" ||
      data?.code === "FORBIDDEN";
    if (!isAuthError) {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    handleAuthError(error);
    const data = (error instanceof TRPCClientError)
      ? (error.data as TrpcErrorData | undefined)
      : undefined;
    const isAuthError =
      (data?.authCode && (UNAUTHENTICATED_CODES.has(data.authCode) || data.authCode === AUTH_CODE_FORBIDDEN)) ||
      data?.code === "UNAUTHORIZED" ||
      data?.code === "FORBIDDEN";
    if (!isAuthError) {
      console.error("[API Mutation Error]", error);
    }
  }
});

// ── tRPC client ───────────────────────────────────────────────────────────────
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        // Use 3-minute timeout for long-running AI generation mutations
        const signal = init?.signal ?? AbortSignal.timeout(180_000);
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          signal,
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
