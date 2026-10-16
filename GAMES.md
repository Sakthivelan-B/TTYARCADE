# TTYARCADE — 70-game guide

19 retained games + 51 new games. Alphabet/numbers are two modes of ONE children’s game; they are not counted separately. No real-money betting. Rules are hidden by default inside the app.

Generated from the registries with `npm run docs:games`.

## Catalog

| Game / route | Play modes | Maximum players | New? |
|---|---|---:|---|
| crazy-eights · `/games/crazy8` | online room, vs cpu | 10 | retained |
| memory-matrix · `/games/matrix` | solo | 1 | retained |
| number-memory · `/games/numbers` | solo | 1 | retained |
| memory-pairs · `/games/memory` | solo, same device, online room | 10 | retained |
| key-sequence · `/games/sequence` | solo | 1 | retained |
| word-scramble · `/games/scramble` | solo | 1 | retained |
| odd-one-out · `/games/odd` | solo | 1 | retained |
| ascii-maze · `/games/maze` | solo | 1 | retained |
| slide-puzzle · `/games/slide` | solo | 1 | retained |
| lights-out · `/games/lights` | solo | 1 | retained |
| math-sprint · `/games/math` | solo, same device, online room | 10 | retained |
| code-breaker · `/games/codebreaker` | solo | 1 | retained |
| type-rush · `/games/typing` | solo, same device, online room | 10 | retained |
| snake · `/games/snake` | solo | 1 | retained |
| minesweeper · `/games/minesweeper` | solo, same device | 10 | retained |
| xox · `/games/tictactoe` | same device, vs cpu, online room | 2 | retained |
| connect-four · `/games/connect4` | same device, vs cpu, online room | 2 | retained |
| 2048 · `/games/2048` | solo | 1 | retained |
| pong · `/games/pong` | vs cpu | 2 | retained |
| 13-card Rummy · `/games/rummy` | same device, online room | 10 | yes |
| Go Fish · `/games/go-fish` | same device, online room | 6 | yes |
| War · `/games/war` | same device, online room | 2 | yes |
| Higher or Lower · `/games/higher-lower` | solo | 1 | yes |
| Twenty One · `/games/twenty-one` | same device, online room | 6 | yes |
| Sevens · `/games/sevens` | same device, online room | 6 | yes |
| Six-card Golf · `/games/golf-six` | same device, online room | 6 | yes |
| Old Maid · `/games/old-maid` | same device, online room | 6 | yes |
| Guess My Thought · `/games/thought-number` | solo | 1 | yes |
| Alphabet & Number Garden · `/games/order-garden` | solo | 1 | yes |
| Corrupted File · `/games/corrupted-file` | solo, same device | 6 | yes |
| Secret Mission · `/games/secret-mission` | same device, online room | 6 | yes |
| Fact Chain · `/games/fact-chain` | solo, same device | 6 | yes |
| Future Message · `/games/future-message` | solo, same device | 6 | yes |
| Timeline Tangle · `/games/timeline-tangle` | solo, same device | 6 | yes |
| Rule Shift · `/games/rule-shift` | solo, same device | 6 | yes |
| Word Ladder · `/games/word-ladder` | solo, same device | 6 | yes |
| Word Search · `/games/word-search` | solo, same device | 6 | yes |
| Hangman · `/games/hangman` | solo, same device | 6 | yes |
| Anagram Forge · `/games/anagram-forge` | solo, same device | 6 | yes |
| Category Sort · `/games/category-sort` | solo, same device | 6 | yes |
| Sentence Order · `/games/sentence-order` | solo, same device | 6 | yes |
| Cipher Lab · `/games/cipher-lab` | solo, same device | 6 | yes |
| Binary Bridge · `/games/binary-bridge` | solo, same device | 6 | yes |
| Fraction Balance · `/games/fraction-balance` | solo, same device | 6 | yes |
| Make the Target · `/games/make-target` | solo, same device | 6 | yes |
| Nim · `/games/nim` | same device, online room | 2 | yes |
| Dots and Boxes · `/games/dots-boxes` | same device, online room | 2 | yes |
| Reversi · `/games/reversi` | same device, online room | 2 | yes |
| Mancala · `/games/mancala` | same device, online room | 2 | yes |
| Hidden Fleet · `/games/battleship` | same device, online room | 2 | yes |
| Word Duel · `/games/word-duel` | same device, online room | 2 | yes |
| Poisoned Chocolate · `/games/poisoned-chocolate` | same device, online room | 2 | yes |
| Nonogram · `/games/nonogram` | solo, same device | 6 | yes |
| Mini Sudoku · `/games/mini-sudoku` | solo, same device | 6 | yes |
| Cross Sums · `/games/cross-sums` | solo, same device | 6 | yes |
| River Crossing · `/games/river-crossing` | solo, same device | 6 | yes |
| Water Jugs · `/games/water-jugs` | solo, same device | 6 | yes |
| Tower of Hanoi · `/games/tower-hanoi` | solo, same device | 6 | yes |
| Circuit Route · `/games/circuit-route` | solo, same device | 6 | yes |
| Laser Mirrors · `/games/laser-mirrors` | solo, same device | 6 | yes |
| Balance Scale · `/games/balance-scale` | solo, same device | 6 | yes |
| Peg Solitaire · `/games/peg-solitaire` | solo, same device | 6 | yes |
| Knapsack Vault · `/games/knapsack-vault` | solo, same device | 6 | yes |
| Path Sum · `/games/path-sum` | solo, same device | 6 | yes |
| N-back Stream · `/games/n-back` | solo, same device | 6 | yes |
| Story Recall · `/games/story-recall` | solo, same device | 6 | yes |
| Mental Rotation · `/games/mental-rotation` | solo, same device | 6 | yes |
| Focus Switch · `/games/focus-switch` | solo, same device | 6 | yes |
| Logic Grid · `/games/logic-grid` | solo, same device | 6 | yes |
| Probability Pick · `/games/probability-pick` | solo, same device | 6 | yes |

## Same-device play

New card/strategy games are live turn-based matches. New puzzles with same-device mode are round relays: each named player takes one fresh board at the same level before everyone moves up. They are not simultaneous shared-board races. A handoff curtain precedes each new player’s turn. Match totals stay in memory on that device. Reload/mode menu resets local matches. Higher or Lower, Guess My Thought and the children’s garden are solo-only.

## Progression

There is no final numbered level. Sizes and workload are capped; after difficulty caps, puzzles keep regenerating within the cap. Standard cards/boards have fresh rematches, not infinitely growing boards. Curated words/facts/events are finite and may recur. Random patterns can repeat; no mathematical uniqueness or intelligence/medical benefit is promised.

## All 51 new rule sets

### 13-card Rummy

`/games/rummy` · cards · same device, online room

Each player gets 13 cards. Use groups of 3+3+3+4. At least one group must be a pure same-suit sequence. Other groups may be sequences or 3/4 equal ranks of different suits. A is low or high, never K-A-2. Optional printed jokers replace missing cards, but not in the required pure run; every non-pure group needs at least two natural cards. Draw one from stock/discard, then discard one. Declare at the start of your turn with 13, or use discard-and-declare with 14. A valid partition is checked automatically. Decks: 1 for 2 players, 2 for 3–5, 3 for 6–8, 4 for 9–10. Two printed jokers per deck when enabled. Invalid declarations do not consume the turn. No money/betting.

### Go Fish

`/games/go-fish` · cards · same device, online room

One 52-card deck; five cards each. Ask a named opponent for a rank you hold. Take all of that rank; success gives another turn. Otherwise draw one: another turn only if it is the requested rank. Four equal ranks become a book. Empty hands draw when stock remains. Most books wins; ties allowed.

### War

`/games/war` · cards · same device, online room

Two players split a shuffled deck. Each reveals their top card. Higher rank (Ace high) takes the pot. Ties put up to three cards face down and another face up. A player unable to supply a battle card loses. First to all cards wins; after 200 battles the larger pile wins, or draw. New round reshuffles.

### Higher or Lower

`/games/higher-lower` · cards · solo

Ace is high. Predict whether the next card is strictly higher or lower. A tie is a push and does not break the streak. Reach the displayed streak to clear a level. Wrong prediction ends the level. No betting.

### Twenty One

`/games/twenty-one` · cards · same device, online room

Aces count as 1 or 11; faces count 10. Players take turns hitting or standing. Dealer draws below 17 and stands on all 17s. Above 21 busts. A non-busted higher total beats the dealer; equal total is a push. No bets, splits, doubles, insurance or special blackjack payout. One point per win.

### Sevens

`/games/sevens` · cards · same device, online room

All cards dealt from one deck. Play a seven to open a suit, then the next lower or higher card in that suit. Ace is below two. Pass only when no legal play exists. First empty hand wins.

### Six-card Golf

`/games/golf-six` · cards · same device, online room

One deck for 2–4 players, two for 5–6. Six cards in two rows/three columns per player. First reveal two of your cards. On your turn draw stock/discard, then replace a grid card; or discard the drawn card and reveal one hidden card. Matching ranks in a column score zero. A=1, 2–10 face value, J/Q=10, K=0. When someone reveals all six, every other player gets one last turn. Lowest total wins.

### Old Maid

`/games/old-maid` · cards · same device, online room

One deck with the queen of clubs removed. Equal-rank pairs are removed automatically. On your turn choose a facedown position from the next player with cards. Remove any new pair. Empty hands are safe. The last player holding the unpaired queen loses; no money or penalties.

### Guess My Thought

`/games/thought-number` · numbers · solo

Do not type your secret number. Answer truthfully whether it appears in each shuffled list. Each list disappears after answering. Binary membership identifies the number. Inconsistent patterns outside the range are reported, not invented. First level is 1–20; range grows to a bounded maximum.

### Alphabet & Number Garden

`/games/order-garden` · kids · solo

Choose alphabet or numbers before starting. Tap A then B through Z, or numbers from 1 upward. No timer and no lost lives: a mistake simply asks you to try again. New levels reshuffle positions; board size stays bounded. A parent can help select the mode.

### Corrupted File

`/games/corrupted-file` · memory · solo, same device

Study the original file. Press ready to hide it and reveal a version with one changed value. Select the changed line. Three mistakes end a round. New rounds use new values; the original never changes while you answer.

### Secret Mission

`/games/secret-mission` · memory · same device, online room

Cooperative: on each player’s turn only they see their parcel weight. Memorize it and seal the briefing. After all briefings disappear, discuss the weights and submit the team total. One answer at a time; three mistakes end the mission. Private clues are not sent to other online seats. Same-device play uses a handoff screen.

### Fact Chain

`/games/fact-chain` · knowledge · solo, same device

Study a small set of timeless science/geography facts, hide them, and answer each recall question. The result explains the fact. Three mistakes end the round. This is a curated learning set, not a live news quiz.

### Future Message

`/games/future-message` · memory · solo, same device

Study the numbered values. Save a reminder of at most 12 characters, then the list disappears. Solve two distraction sums before recalling the requested original value. The reminder stays visible; the original values do not.

### Timeline Tangle

`/games/timeline-tangle` · knowledge · solo, same device

Select events from earliest to latest, then check the order. Dates are revealed after success/failure. Reset selection without changing the events. Named events use specific documented milestones, not broad claims about first inventions.

### Rule Shift

`/games/rule-shift` · logic · solo, same device

Read accepted/rejected examples. Test whether a new number fits. One of five rules is used: even, divisible by 3, at least 30, contains digit 2, or a perfect square. Examples identify exactly one of these rules. It can change between levels, never during a level. Choose yes or no for five tests; three mistakes end the round.

### Word Ladder

`/games/word-ladder` · words · solo, same device

Every step must be a listed dictionary word of the same length and differ in exactly one position. Reach the target within 20 moves. Open the optional word bank if needed. Generated start/target pairs always have a legal path.

### Word Search

`/games/word-search` · words · solo, same device

Find the displayed target and select its letters in order along one straight line, forward or backward. Clear selection to try again. The target is always placed in the grid; repeated accidental occurrences are also accepted.

### Hangman

`/games/hangman` · words · solo, same device

Choose letters. Correct letters reveal every occurrence; a new wrong letter costs one of six chances. Repeated letter choices do not cost a chance. Finish the word before six mistakes.

### Anagram Forge

`/games/anagram-forge` · words · solo, same device

Find the displayed number of different words using only rack letters, at most as often as each occurs. Use the curated word bank, not every possible English spelling. The rack always has enough valid words. Previous words remain visible.

### Category Sort

`/games/category-sort` · knowledge · solo, same device

For each item choose its category. Complete the tray with fewer than three mistakes. Definitions use the category wording shown; learning feedback appears after each answer.

### Sentence Order

`/games/sentence-order` · words · solo, same device

Choose words in grammatical order and check. Reset without changing the sentence. Duplicate words are separate tiles. Sentences come from simple, unambiguous templates.

### Cipher Lab

`/games/cipher-lab` · words · solo, same device

The shift key is shown. Move each letter backward by that many places; spaces remain spaces. Type the decoded sentence. Case is ignored, spaces are normalized. Three wrong checks end the round.

### Binary Bridge

`/games/binary-bridge` · numbers · solo, same device

Toggle weighted bits to total the target decimal number. Then check. Each bit is either off or on; the labels show their powers of two. No trick rounding or negative numbers.

### Fraction Balance

`/games/fraction-balance` · numbers · solo, same device

Choose whether the left fraction is smaller, larger or equal. Finish five comparisons. Comparisons use exact integer cross-products, not rounded decimals.

### Make the Target

`/games/make-target` · numbers · solo, same device

Select a first tile, operation, then second tile. Replace them with the result. Use +, -, × or exact integer division. Reach the target with one remaining tile. Reset/undo preserve the same puzzle. Every generated target has a valid construction.

### Nim

`/games/nim` · strategy · same device, online room

Two players alternate removing one or more counters from exactly one pile. The player who takes the final counter wins. All piles are visible. New rounds randomize pile sizes.

### Dots and Boxes

`/games/dots-boxes` · strategy · same device, online room

Two players add one unclaimed edge. Completing a box scores a point and gives another turn; an edge may complete two boxes. Most boxes at the end wins; ties allowed.

### Reversi

`/games/reversi` · strategy · same device, online room

Place only where your disk brackets one or more enemy disks along a straight line. All bracketed lines flip. Pass is allowed only with no legal move. Game ends when both players cannot move. Most disks wins.

### Mancala

`/games/mancala` · strategy · same device, online room

Kalah: six pits per side, four stones each. Sow counterclockwise, including your store but skipping your opponent’s store. Last stone in your store gives another turn. Last stone in your empty pit captures its opposite and itself if opposite has stones. When a side is empty, remaining stones sweep to their owner. Most stored stones wins.

### Hidden Fleet

`/games/battleship` · strategy · same device, online room

Two players have automatically placed length-3 and length-2 ships on a 5×5 sea. Alternate one shot, hit or miss; repeat shots are illegal. Sink both ships to win. Only your own ships and your outgoing shot results are sent to your online seat.

### Word Duel

`/games/word-duel` · words · same device, online room

Two players alternate dictionary words. Your word must begin with the final letter of the previous word and must not have been used. The optional word bank defines accepted words. If no legal word remains, the previous player wins; after 20 moves compare total letters, with ties allowed.

### Poisoned Chocolate

`/games/poisoned-chocolate` · strategy · same device, online room

Two players choose a remaining square. It and every remaining square below/right are eaten. The top-left square is poisoned: whoever eats it loses. New levels vary the bounded rectangle.

### Nonogram

`/games/nonogram` · logic · solo, same device

Clues show lengths of consecutive filled runs, separated by at least one blank. Tap cells to cycle unknown/filled/marked blank. Any completed pattern satisfying all clues is accepted; an alternative valid solution is not rejected.

### Mini Sudoku

`/games/mini-sudoku` · logic · solo, same device

Use 1–4 once per row, column and 2×2 box. Given cells cannot change. Tap an editable cell to cycle blank/1/2/3/4, then check. Any valid completion is accepted, even if multiple solutions exist.

### Cross Sums

`/games/cross-sums` · logic · solo, same device

Fill the 3×3 grid with digits 1–9. No repeated digit within a row or within a column. Meet all displayed sums. Given cells are fixed; any valid completion is accepted. Tap to cycle values, then check.

### River Crossing

`/games/river-crossing` · logic · solo, same device

The boat carries the keeper and at most one item. The two forbidden pairs are shown. A forbidden pair cannot remain on a bank without the keeper. Choose a nearby item or sail alone. Move everyone to the opposite bank. New rounds relabel/reorder the puzzle.

### Water Jugs

`/games/water-jugs` · logic · solo, same device

Fill, empty, or pour between the two jugs until either contains the target. Pour until source empty or destination full. Capacities/targets are generated from reachable, coprime pairs.

### Tower of Hanoi

`/games/tower-hanoi` · logic · solo, same device

Select a source rod then destination. Only the top disk moves. Move the whole tower to the marked destination. Disk count grows to six; later rounds vary the destination. No timer.

### Circuit Route

`/games/circuit-route` · logic · solo, same device

Rotate a tile clockwise. A route must enter from the left of the top-left tile and leave below the bottom-right tile, with connectors matching at every step. Check when ready. Boards are generated from a known route.

### Laser Mirrors

`/games/laser-mirrors` · logic · solo, same device

Click the two mirror cells to swap / and \. The ray enters from the left at the shown row. Check whether it leaves the right side at the target row. Reflection and loop detection are simulated, not guessed.

### Balance Scale

`/games/balance-scale` · logic · solo, same device

Assign equal numbers of coins left/right and weigh. One coin is heavier; all others equal. You have enough ternary weighings for the displayed count. Select a coin and accuse when ready; a wrong accusation ends the round.

### Peg Solitaire

`/games/peg-solitaire` · logic · solo, same device

Select a peg, then an empty hole two steps horizontally/vertically away. Jump over and remove the middle peg. Leave one peg. New boards are generated by reversing legal jumps from one peg, so a solution exists.

### Knapsack Vault

`/games/knapsack-vault` · logic · solo, same device

Select items without exceeding capacity. Reach the displayed optimal value, computed with an exact 0/1 knapsack solver. Each item may be used once. Check your selection; reset keeps the same cargo.

### Path Sum

`/games/path-sum` · numbers · solo, same device

Start at the top-left. Move only right/down, adding every visited value. Reach bottom-right with exactly the target total. Reset restores the same board. A valid target route always exists.

### N-back Stream

`/games/n-back` · memory · solo, same device

Study the first N tokens, advancing one at a time. Then answer whether each new token matches the one N positions earlier. At least six of eight comparisons must be correct. The stream remains fixed; previous tokens disappear.

### Story Recall

`/games/story-recall` · memory · solo, same device

Read a short generated story. Hide it, then answer three questions about people, objects and places. The story does not change during the questions. Three mistakes end the round.

### Mental Rotation

`/games/mental-rotation` · logic · solo, same device

Study the reference shape and requested clockwise angle. Choose the rotated shape, not a mirror image. Shapes are asymmetric, so the offered rotations are distinct.

### Focus Switch

`/games/focus-switch` · memory · solo, same device

For a # cue choose the largest number. For an @ cue choose the shortest word. The cue changes between trials; finish five correct trials with fewer than three mistakes.

### Logic Grid

`/games/logic-grid` · logic · solo, same device

Assign one different object to each person. Every displayed negative clue must hold. The generator adds clues until exactly one assignment remains. Check after filling every row.

### Probability Pick

`/games/probability-pick` · knowledge · solo, same device

Two tokens are drawn without replacement. Choose the bag with greatest chance that both are red: red/total × (red−1)/(total−1). Equal best choices are accepted. Three mistakes end a round; explanation appears after success.

## Learning references

Fact Chain includes reference links in its optional study sources. Its question/answer/explanation bank and links live in `src/lib/pack/puzzles.ts`. Timeline Tangle uses a small chronological bank, not a complete history. Web chronology reference: [2](https://home.cern/science/computing/the-birth-of-the-web/short-history-web/). Gutenberg Bible’s approximate completion year: [Britannica](https://www.britannica.com/topic/Gutenberg-Bible). Hubble overview: [NASA](https://science.nasa.gov/mission/hubble/overview/about-hubble/). Keep dates and sources reviewed when extending the bank; there is no live news feed.
