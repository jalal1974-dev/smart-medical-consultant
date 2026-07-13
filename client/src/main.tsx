import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Prefer the structured tRPC error code; fall back to the shared constant so
  // we are not solely relying on brittle raw error-message text matching.
  const code = (error.data as { code?: string } | undefined)?.code;
  const isUnauthorized =
    code === "UNAUTHORIZED" ||
    error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Redirect to the in-app login page (not the raw OAuth URL) so the user
  // lands on the login form and the ?next= param brings them back after sign-in.
  const next = encodeURIComponent(
    window.location.pathname + window.location.search
  );
  window.location.href = `/login?next=${next}`;
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

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
