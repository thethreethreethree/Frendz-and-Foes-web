import { createContext, useContext } from "react";
import type { ConnectionInfo } from "./socket";

// Shared connection context so the pairing UI (status pill, QR card) works under either game's
// provider without coupling to a specific game store.
export const ConnectionCtx = createContext<ConnectionInfo | null>(null);

export function useConnection(): ConnectionInfo {
  const c = useContext(ConnectionCtx);
  if (!c) throw new Error("useConnection must be used within a provider");
  return c;
}
