import { motion } from "framer-motion";
import { TRIVIA_DECKS, TRIVIA_LETTERS, TRIVIA_ROUNDS, triviaQuestionInRound } from "@ff/engine";
import { useTrivia } from "../store/triviaStore";
import { QR } from "../net/pairing";
import { triviaViewJoinUrl } from "../net/room";
import {
  TRIVIA_BG_DISPLAY,
  TRIVIA_CHAMPIONS,
  TRIVIA_LOBBY,
  TRIVIA_STAMP_CORRECT,
  letterTile,
  roundBadge,
  versionBadge,
} from "./assets";

// The shared big screen for Frendz Trivia. Renders the current question + choices; during the
// reveal the correct answer lights up. View mode can flash a join QR for the whole room to scan.
export function TriviaDisplay() {
  const { trivia, joinQrVisible, connection } = useTrivia();
  const deck = TRIVIA_DECKS[trivia.version];
  const q = deck[trivia.currentIndex] ?? null;
  const revealed = q ? trivia.revealedQuestions.includes(q.id) : false;
  const playing = trivia.phase === "playing" || trivia.phase === "reveal";
  const ranked = [...trivia.teams].sort((a, b) => b.score - a.score);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden p-6 text-ink"
      style={{
        backgroundColor: "#f6efdf",
        backgroundImage: `url(${TRIVIA_BG_DISPLAY})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {joinQrVisible && connection.room && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 grid place-items-center bg-ink/90 backdrop-blur"
        >
          <div className="ff-sticker flex flex-col items-center gap-4 bg-white px-12 py-10 text-center">
            <div className="ff-title text-4xl text-grape">SCAN TO WATCH</div>
            <QR text={triviaViewJoinUrl(connection.room)} size={340} />
            <div className="font-display text-2xl tracking-widest text-ink/70">Room {connection.room}</div>
            <p className="max-w-md text-lg font-bold text-ink/60">Follow every question on your own phone.</p>
          </div>
        </motion.div>
      )}

      <header className="flex items-center justify-end">
        <img src={versionBadge(trivia.version)} alt={trivia.version} className="h-16 w-16 object-contain drop-shadow" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
        {trivia.phase === "setup" && (
          <div className="flex flex-col items-center text-center">
            <img src={TRIVIA_LOBBY} alt="" className="max-h-[58vh] w-auto rounded-2xl object-contain shadow-pop" />
            <p className="mt-4 font-display text-3xl text-ink/70">3 rounds · 30 questions · get ready!</p>
          </div>
        )}

        {playing && q && (
          <>
            <div className="flex items-center gap-3">
              <img src={roundBadge(q.round)} alt="" className="h-16 w-16 object-contain drop-shadow" />
              <div className="ff-sticker bg-grape px-5 py-1.5 font-display text-2xl tracking-wide text-white">
                {trivia.phase === "reveal" ? "ANSWER · " : ""}
                {TRIVIA_ROUNDS[q.round]?.label.toUpperCase()} · QUESTION {triviaQuestionInRound(trivia.currentIndex)} / 10
              </div>
            </div>
            <motion.h1
              key={q.id}
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="ff-sticker max-w-4xl bg-ink px-8 py-5 text-center text-3xl font-extrabold text-white"
            >
              {q.prompt}
            </motion.h1>
            <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
              {TRIVIA_LETTERS.map((letter, i) => {
                const isCorrect = revealed && q.correct === letter;
                return (
                  <div
                    key={letter}
                    className={`flex items-center gap-3 rounded-2xl border-4 px-4 py-3 ${
                      isCorrect ? "border-buzz-green bg-buzz-green/20" : "border-ink/10 bg-white"
                    }`}
                  >
                    <img src={letterTile(letter)} alt={letter} className="h-14 w-14 shrink-0 object-contain" />
                    <span className="min-w-0 flex-1 text-xl font-bold">{q.choices[i]}</span>
                    {isCorrect && <img src={TRIVIA_STAMP_CORRECT} alt="correct" className="h-12 w-12 shrink-0 object-contain" />}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {trivia.phase === "finished" && (
          <div className="text-center">
            <img src={TRIVIA_CHAMPIONS} alt="Champions" className="mx-auto h-52 w-52 object-contain" />
            {ranked[0] && (
              <div className="ff-sticker mx-auto mt-6 inline-flex items-center gap-4 bg-white px-10 py-6">
                <span
                  className="h-10 w-10 rounded-full border-4 border-ink"
                  style={{ backgroundColor: ranked[0].color ?? "#999" }}
                />
                <span className="text-5xl font-black text-ink">{ranked[0].name}</span>
                <span className="font-display text-6xl text-grape">{ranked[0].score}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {trivia.teams.length > 0 && (
        <footer className="flex flex-wrap items-stretch justify-center gap-2 pt-2">
          {ranked.map((t) => (
            <div key={t.id} className="ff-sticker flex items-center gap-2 bg-white px-3 py-1.5">
              <span className="h-4 w-4 rounded-full border-2 border-ink" style={{ backgroundColor: t.color ?? "#999" }} />
              <span className="max-w-[10rem] truncate text-base font-bold text-ink">{t.name}</span>
              <span className="font-display text-2xl text-ink">{t.score}</span>
            </div>
          ))}
        </footer>
      )}
    </div>
  );
}
