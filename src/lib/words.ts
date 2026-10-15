// Word bank grouped by length. Used by word-scramble and type-rush.
// To add words: append lowercase a-z words to the matching length bucket.
export const WORDS: Record<number, string[]> = {
  3: "cat dog sun map key box fox owl cup pen jam ice web bug ant bat cow egg fan hat ink jar kid leg mud net oak pig rat sky toy van wax yak zip art bed car".split(" "),
  4: "code game play byte disk file loop node card deck moon star fish frog tree rock wind fire snow rain lamp desk book door wall ship road king gold bell drum kite lion wolf bear".split(" "),
  5: "pixel arena chess queen tower river cloud storm light sound grape lemon mango apple bread piano music robot laser ghost magic sword brick plant train beach ocean house mouse table chair smile dance flame stone".split(" "),
  6: "puzzle letter number planet rocket garden castle dragon wizard silver golden bridge jungle desert island forest window mirror camera guitar violin hunter sprint player script coffee cookie kernel memory random shadow".split(" "),
  7: "journey rainbow thunder monster diamond phoenix lantern blanket kitchen library balloon captain chicken penguin dolphin octopus treasure picture program network compile console sandbox pattern shuffle quantum digital fantasy mystery".split(" "),
  8: "keyboard terminal computer elephant mountain champion dinosaur sandwich umbrella notebook pineapple strategy treasure velocity absolute aquarium backpack calendar daughter festival gradient hardware labyrinth marathon midnight question skeleton universe whisper".split(" "),
  9: "adventure algorithm butterfly chocolate dangerous detective education essential evolution firewall framework happiness important invisible lightning microwave nightmare operation passenger playlist professor quicksand satellite telephone wonderful".split(" "),
};

export function wordsOfLength(n: number): string[] {
  const k = Math.max(3, Math.min(9, n));
  return WORDS[k].filter((w) => w.length === k);
}

export const ALL_WORDS: string[] = Object.values(WORDS).flat();
