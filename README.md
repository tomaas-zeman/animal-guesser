# Animal Guesser (Hádání zvířat)

A web game for children: an animated 3D character asks questions in Czech, you answer
**yes / no / I don't know / maybe** (by voice or with buttons) and it guesses which animal you are thinking of.

Play at **https://tomaas-zeman.github.io/animal-guesser/**

The game content (questions, animal names, what the characters say, UI texts) is in Czech. Everything else
(code, comments, file names, data keys) is in English.

## How it works

- **Database** [`src/data/animals.json`](src/data/animals.json): questions and animals. For every animal
  and trait it holds the probability of the answer "yes" (0 to 1); a missing trait means 0.
  Roughly 250 animals, mostly the ones children know: our fish, birds, mammals, reptiles, amphibians and insects
  as well as exotic animals. For groups where it makes sense there are specific species (snakes: grass snake, viper, cobra,
  rattlesnake, python, boa, anaconda; big cats, owls, parrots, frogs, fish…) and questions that tell
  them apart (hood, whiskers, lives in a river, eats fish, migrates for winter, spins a web, is a beetle…).
- **Guessing** [`src/game/engine.ts`](src/game/engine.ts): instead of a fixed decision tree,
  the animals' probabilities are recomputed after every answer (Bayes) and the next question is the one with the largest
  information gain. One wrong answer therefore does not eliminate an animal, it only pushes it back. "I don't know" changes nothing,
  "maybe" is a weak yes. After a wrong guess the animal is eliminated and the game continues.
- **Rules** (`rules` and `exclusive` in the database): a bird has feathers, a mammal does not lay eggs, a fish has fins…
  The character no longer asks about what follows from the answers. An animal that clearly contradicts some answer
  is not guessed while there are animals without a contradiction. Whatever all the animals that fit the answers
  answer the same clear way (lives in the sea → does not live in the forest) is not asked either.
- **Certain questions** (`certain`): group, body structure, sea… A contradiction with them weighs more than with color or
  jumping, so after "it is an amphibian" the game does not run off to lizards. Where children get confused (a dolphin is a
  mammal, a penguin a bird), animals have 0.15 to 0.85 on certain questions instead of 0 or 1.
- **Simulation** [`src/game/simulation.test.ts`](src/game/simulation.test.ts) plays hundreds of games with players
  who sometimes err, and checks the success rate, guesses that contradict the answers and needless questions.
  [`database.test.ts`](src/game/database.test.ts) checks that animals follow the rules and can be told apart.
- **Speech** [`src/speech/`](src/speech): the characters speak with pre-recorded voices (see below), whatever is not recorded
  is said by `speechSynthesis` (cs-CZ). Listening uses the Web Speech API (Chrome, Edge, Safari). The buttons always work.
- **Characters** [`src/characters/`](src/characters): Lili the fox, Bohouš the banana and the pokémon Vojtaču,
  built from 3D shapes in React Three Fiber (three.js).

## Development

```bash
npm install
npm run dev        # development server
npm test           # tests and the guessing simulation
npm run build      # production build into dist/
```

Add `?debug=1` to the URL to see which animals the character currently suspects.

**Adding an animal:** add a row to `animals` in `src/data/animals.json` and run `npm test`.
The tests show whether the new animal contradicts the rules and whether it can be guessed and told apart from the others.

Every push to `master` runs the tests, the build and the deploy to GitHub Pages.

## Character voices

The characters speak with recordings from `public/voices/<character>/<id>.mp3`, where `<character>` is `fox`,
`banana` or `vojtachu`. Every sentence has its own file whose name is a fingerprint of the text ([`src/voices/keys.ts`](src/voices/keys.ts)).
Guesses are composed of the start of the sentence ("Je to"), the animal name ("liška?") and possibly an ending ("že jo?"),
so ~750 recordings per character are enough instead of every sentence with every animal. When a recording is missing, the sentence is
said by the browser's speech synthesis.

- **Free and automatic:** the [Record voices](.github/workflows/voices.yml) workflow records the missing sentences
  with Microsoft Edge neural voices (Vlasta and Antonín, via [edge-tts](https://github.com/rany2/edge-tts)) and commits them.
  It is run manually in the Actions tab (also for a single character, or everything again after changing a voice).
- **Pitch and rate of the voices:** [`scripts/voices-tts.json`](scripts/voices-tts.json).
- **Other services:** `npm run voices:tts -- <edge|azure|google|elevenlabs>`; keys are read from environment
  variables (`AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`, `GOOGLE_TTS_KEY`, `ELEVENLABS_API_KEY`), never commit them.
  Flags: `--character fox`, `--limit 10`, `--overwrite`, `--dry-run` (only prints what would be recorded), `--compare`.
  `TTS_CONCURRENCY` and `TTS_PER_MINUTE` tune the request rate.
- **With your own voice:** the [`?recording`](https://tomaas-zeman.github.io/animal-guesser/?recording) page
  shows the sentences one by one, you record each with the microphone (space bar), play it back, and finally download a ZIP that
  unpacks into `public/`. The game on that device uses the recordings in the browser right away. Silence at the start and end is trimmed automatically.
- `npm run voices:list` writes all sentences as `voice-list.json`, `npm run voices:index` writes
  `public/voices/index.json` (this happens automatically before `dev` and `build`).
