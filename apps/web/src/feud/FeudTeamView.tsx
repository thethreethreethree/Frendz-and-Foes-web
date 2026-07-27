// Frendz and Foes — a TEAM's own phone. Phone-first replacement for the shared monitor: each
// team runs one "answerer" phone (submits the team's guess, host-judged) and any number of
// "viewer" phones (watch-only). Both are pure FOLLOWERS of the host's broadcast — they render the
// live board from engine state and never mutate it (the answerer's only upstream message is an
// `intent`, which the host judges). See DisplayProvider (the follower) + apps/server/index.js.
import { DisplayProvider } from "../store/DisplayProvider";
import { TeamView } from "./TeamView";

export function FeudTeamView({
  room,
  teamId,
  role,
}: {
  room: string;
  teamId: string;
  role: "answerer" | "viewer";
}) {
  return (
    <DisplayProvider room={room} role={role} teamId={teamId}>
      <TeamView room={room} teamId={teamId} role={role} />
    </DisplayProvider>
  );
}
