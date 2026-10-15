import { Shell } from "@/components/term";

export default function Crazy8Rules() {
  return (
    <Shell path="/games/crazy8/rules" title="man crazy8" back="/games/crazy8">
      <pre className="screen" style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{`NAME
    crazy8 - online shedding card game for 2-4 players

SYNOPSIS
    create room -> share 5-letter CODE -> friends join -> start

SETUP
    standard 52-card deck. 7 cards per player.
    one card is flipped to start the discard pile (never an 8).

TURN
    play ONE card matching the top card's SUIT or RANK.
    cannot play?  [draw] one card - drawing ends your turn.
    8 is WILD:    play it any time, then choose the next suit.

WIN
    first player with an empty hand wins.

SUITS (text only, no color)
    ♡ hearts   ♢ diamonds   (outlined = "red" suits)
    ♣ clubs    ♠ spades     (filled   = "black" suits)

NOTES
    your session is saved per room in this browser,
    so refreshing the page keeps your seat.`}</pre>
    </Shell>
  );
}
