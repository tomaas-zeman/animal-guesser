import { useCallback, useEffect, useRef, useState } from 'react';
import db from './data/animals.json';
import { Game, type Database, type Answer, type Move } from './game/engine';
import { CHARACTERS } from './characters';
import { EXPRESSIONS, type Mood } from './characters/emotions';
import { EXTRAS } from './characters/lines';
import { Dialogue, type Utterance } from './characters/dialogue';
import { hasRecordings } from './voices/player';
import { czechVoice, isNatural, hasVoice, speechAvailable, say, silence } from './speech/speaking';
import { playerFinished, isPlayer, calibrate, calibrateFromStart, isMeasuring, referenceLoudness, segmentPeak, startSegment, disableMeasuring, enableMeasuring, forgetPlayer } from './speech/loudness';
import {
  MAX_FAILURES,
  withoutInsults,
  isBackgroundTalk,
  isUnintelligible,
  isFailure,
  isStart,
  SHORT_VOICE,
  isRepeatRequest,
  pauseAfterFailure,
  listeningAvailable,
  listen,
  detectInsult,
  recognizeAnswer,
  type Heard,
} from './speech/listening';
import { Scene } from './Scene';

const database = db as unknown as Database;
const debugMode = new URLSearchParams(location.search).has('debug');

type Phase = 'select' | 'intro' | 'game' | 'win' | 'giveUp';

const BUTTONS: { answer: Answer; text: string; variant: string }[] = [
  { answer: 'yes', text: 'Ano', variant: 'yes' },
  { answer: 'no', text: 'Ne', variant: 'no' },
  { answer: 'unknown', text: 'Nevím', variant: 'unknown' },
  { answer: 'maybe', text: 'Může být', variant: 'maybe' },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** a moment of "thinking" before the character starts speaking */
const PAUSE_BEFORE = 400;
/** thinking is a bit different in length every time, so it does not sound like a machine */
const thinkDelay = () => PAUSE_BEFORE + Math.random() * 350;
/** a breath between a reaction and the next question */
const PAUSE_BETWEEN = 350;
/** the longest it listens while the player is silent; then the 🎤 button remains */
const MAX_SILENCE = 5 * 60_000;

export default function App() {
  const [index, setIndex] = useState(0);
  const character = CHARACTERS[index];
  const [phase, setPhase] = useState<Phase>('select');
  const [bubble, setBubble] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [mood, setMood] = useState<Mood>('calm');
  const [move, setMove] = useState<Move | null>(null);
  const [microphone, setMicrophone] = useState(listeningAvailable);
  const [listening, setListening] = useState(false);
  const [heardText, setHeardText] = useState('');
  /** the microphone is really listening now (warm-up takes a moment) */
  const [ready, setReady] = useState(false);
  /** after an unrecognized answer the buttons are highlighted as an immediate fallback */
  const [highlight, setHighlight] = useState(false);
  /** what recognition returned (only in ?debug) */
  const [entries, setEntries] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [muted, setMuted] = useState(false);

  const game = useRef<Game | null>(null);
  // every player action increments the generation, so that an old running flow (speaking, listening) ends
  const generation = useRef(0);
  const cancelListening = useRef<() => void>(() => {});
  const dialogue = useRef<Dialogue | null>(null);
  /** the last question or guess, so that it can be repeated on request */
  const lastQuestion = useRef('');
  const settingsRef = useRef({ microphone, muted });
  settingsRef.current = { microphone, muted };

  useEffect(() => {
    const t = setTimeout(async () => {
      // with recorded voices synthesis does not matter
      if (!speechAvailable || (await hasRecordings())) return;
      const voice = czechVoice();
      if (!voice) setNotice('Prohlížeč nemá český hlas, postavička může mluvit s přízvukem. Nejlíp mluví v prohlížeči Edge.');
      else if (!hasVoice('male')) setNotice('Prohlížeč nemá český mužský hlas, Robík, Kvak a Bohouš proto mluví upraveným ženským hlasem. Mužský hlas má třeba Microsoft Edge.');
      else if (!isNatural(voice)) setNotice('Tip: nejpřirozeněji postavičky mluví v prohlížeči Microsoft Edge.');
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const interrupt = () => {
    generation.current++;
    silence();
    cancelListening.current();
    setListening(false);
    setSpeaking(false);
    return generation.current;
  };

  /** Says the text. An utterance also sets the emotion of the face and voice. */
  const speak = useCallback(async (what: string | Utterance, gen: number) => {
    if (gen !== generation.current) return false;
    const text = typeof what === 'string' ? what : what.text;
    const tuning = typeof what === 'string' ? undefined : EXPRESSIONS[what.mood].voice;
    if (typeof what !== 'string') setMood(what.mood);
    setBubble(text);
    setSpeaking(true);
    await say(text, character.voice, settingsRef.current.muted, tuning, character.id);
    if (gen !== generation.current) return false;
    setSpeaking(false);
    return true;
  }, [character]);

  const getDialogue = () => (dialogue.current ??= new Dialogue(character.lines));

  // forward declaration because of mutual calls
  const answerRef = useRef<(o: Answer) => void>(() => {});

  /**
   * Listens over and over until `handle` returns true. It sits through silence and recognition
   * failures (network, immediate end) and starts listening again.
   */
  const logHeard = (s: Heard, loudness: number) => {
    const transcripts = (s.transcripts ?? []).map((p) => `${p.final ? '' : '~'}„${p.text}“ ${p.confidence ? p.confidence.toFixed(2) : ''}`).join(' | ');
    const row = `${(s.duration / 1000).toFixed(1)}s ${s.error ?? ''}${s.shortened ? ' shortened' : ''} vol. ${loudness.toFixed(3)} → ${detectInsult(s.texts) ? 'insult' : (recognizeAnswer(withoutInsults(s.texts)) ?? '?')}: ${transcripts || '—'}${s.texts.length ? ` ⇒ ${s.texts.join(' | ')}` : ''} [${(s.events ?? []).join(' ')}]`;
    console.debug('[listening]', row, s);
    setEntries((z) => [row, ...z].slice(0, 8));
  };

  const listenContinuously = useCallback(
    async (gen: number, handle: (texts: string[], loudness: number, shortVoice: boolean) => Promise<boolean>) => {
      let failures = 0;
      let lastSound = Date.now();
      try {
        while (gen === generation.current && settingsRef.current.microphone && listeningAvailable) {
          setListening(true);
          setReady(false);
          startSegment();
          const p = listen(() => gen === generation.current && setReady(true), playerFinished);
          cancelListening.current = p.cancel;
          let s: Heard;
          try {
            s = await p.result;
          } catch (e) {
            if (gen !== generation.current) return;
            if ((e as Error).message === 'microphone-busy' && isMeasuring()) {
              disableMeasuring();
              setNotice('Tohle zařízení neumí zároveň poslouchat a měřit hlasitost, filtr hlasitosti je vypnutý.');
              continue;
            }
            setMicrophone(false);
            setNotice('Mikrofon není povolený. Odpovídej tlačítky, nebo povol mikrofon v prohlížeči.');
            return;
          }
          if (gen !== generation.current || !settingsRef.current.microphone) return;
          if (debugMode) logHeard(s, segmentPeak());
          // the microphone is held by the loudness measurement and recognition got no audio: the measurement yields
          if (isMeasuring() && s.noAudio && s.texts.length === 0) {
            disableMeasuring();
            setNotice('Tohle zařízení neumí zároveň poslouchat a měřit hlasitost, filtr hlasitosti je vypnutý.');
            continue;
          }

          // something sounded, but without words: if it was the player's voice, ask them to repeat
          const loudness = segmentPeak();
          const playerSpoke = s.error === 'no-match' || s.error === SHORT_VOICE || (isMeasuring() && referenceLoudness() !== null && isPlayer(loudness));
          if (isUnintelligible(s) && playerSpoke) {
            failures = 0;
            lastSound = Date.now();
            setListening(false);
            if (await handle([], loudness, s.error === SHORT_VOICE)) return;
            continue;
          }

          if (s.texts.length === 0) {
            if (isFailure(s)) {
              if (++failures > MAX_FAILURES) {
                setNotice('Rozpoznávání řeči teď nefunguje, zkontroluj připojení k internetu. Pak klikni na 🎤, nebo odpovídej tlačítky.');
                return;
              }
              await wait(pauseAfterFailure(failures));
            } else {
              failures = 0;
              if (Date.now() - lastSound > MAX_SILENCE) return;
            }
            continue;
          }

          failures = 0;
          lastSound = Date.now();
          setListening(false);
          if (await handle(s.texts, loudness, false)) return;
        }
      } finally {
        if (gen === generation.current) setListening(false);
      }
    },
    [],
  );

  /** Listens for an answer. When it does not understand, it says so and keeps listening. For a guess it accepts only yes/no. */
  const listenForAnswer = useCallback(
    async (gen: number, yesNoOnly = false) => {
      setHeardText('');
      let misunderstood = 0;
      let shortCount = 0;
      await listenContinuously(gen, async (texts, loudness, shortVoice) => {
        // an insult does not count as an answer: "nejsi chytrá" is not "ne"
        const insult = detectInsult(texts, lastQuestion.current);
        const answer = insult ? null : recognizeAnswer(withoutInsults(texts), lastQuestion.current);
        if (texts.length > 0) {
          // background talk is quietly overheard and listening continues
          if (!isPlayer(loudness, answer !== null)) {
            setHeardText(`${texts[0]} (moc potichu, asi někdo jiný)`);
            return false;
          }
          if (insult) {
            // it pushes back humorously and repeats the question
            setHeardText(texts[0]);
            await wait(thinkDelay());
            if (!(await speak(getDialogue().insult(insult), gen))) return true;
            await wait(PAUSE_BETWEEN);
            await speak({ text: lastQuestion.current, mood: 'calm' }, gen);
            return false;
          }
          if (!answer && isBackgroundTalk(texts)) {
            setHeardText(`${texts[0]} (to nebyla odpověď)`);
            return false;
          }
          setHeardText(texts[0]);
          if (!answer && isRepeatRequest(texts)) {
            await wait(thinkDelay());
            await speak(lastQuestion.current, gen);
            return false;
          }
        } else setHeardText(shortVoice ? '… (něco krátkého, ale bez slov)' : '…');
        if (answer && (!yesNoOnly || answer === 'yes' || answer === 'no')) {
          calibrate(loudness);
          setHighlight(false);
          answerRef.current(answer);
          return true;
        }
        misunderstood++;
        setHighlight(true);
        await wait(thinkDelay());
        // A short word without a transcript is almost always a "ne" that recognition did not catch:
        // the longer form hints it, which is recognized reliably. Otherwise it hints only after several failures.
        const hint =
          shortVoice && ++shortCount <= 2
            ? ` ${EXTRAS.hintLonger}`
            : misunderstood % 3 !== 0
              ? ''
              : yesNoOnly
                ? ` ${EXTRAS.hintGuess}`
                : ` ${EXTRAS.hintQuestion}`;
        const r = getDialogue().dontUnderstand();
        await speak({ ...r, text: r.text + hint }, gen);
        return false;
      });
    },
    [speak, listenContinuously, character],
  );

  const nextMove = useCallback(async (gen: number, utterances: Utterance[] = []) => {
    const h = game.current;
    if (!h) return;
    const p = getDialogue();
    // first it reacts to the answer, and only then thinks about what next
    for (const r of utterances) {
      if (!(await speak(r, gen))) return;
      await wait(PAUSE_BETWEEN);
      if (gen !== generation.current) return;
    }
    const t = h.nextMove();
    setMood(t.type === 'giveUp' ? 'sadness' : 'thinking');
    setBubble('…');
    await wait(thinkDelay());
    if (gen !== generation.current) return;

    if (t.type === 'question') {
      setMove(t);
      lastQuestion.current = t.text;
      const mood = p.questionMood(h.ranking()[0]?.prob ?? 0);
      if (await speak({ text: t.text, mood }, gen)) listenForAnswer(gen);
    } else if (t.type === 'guess') {
      setMove(t);
      const r = p.guess(t.animal.name, t.confidence, h.questionCount);
      lastQuestion.current = r.text;
      if (await speak(r, gen)) listenForAnswer(gen, true);
    } else {
      setPhase('giveUp');
      if (await speak(p.giveUp(), gen)) waitForStartRef.current(gen);
    }
  }, [speak, listenForAnswer, character]);

  const answer = useCallback(async (o: Answer) => {
    const h = game.current;
    if (!h || !move || phase !== 'game') return;
    const gen = interrupt();
    setHighlight(false);
    // the buttons disappear until the character asks the next question
    setMove(null);
    const p = getDialogue();
    if (move.type === 'question') {
      const expectedYes = h.expectedYes(move.id);
      const confidenceBefore = h.ranking()[0]?.prob ?? 0;
      h.answer(move.id, o);
      const confidenceAfter = h.ranking()[0]?.prob ?? 0;
      nextMove(gen, p.afterAnswer({ answer: o, questionCount: h.questionCount, expectedYes, confidenceBefore, confidenceAfter }));
    } else if (move.type === 'guess') {
      if (o === 'yes') {
        setMove(move); // leaves the picture of the guessed animal in the bubble
        setPhase('win');
        setMood('celebration');
        await wait(PAUSE_BETWEEN);
        if (!(await speak(p.win(h.questionCount), gen))) return;
        await wait(PAUSE_BETWEEN);
        const prompt = settingsRef.current.microphone && listeningAvailable ? ` ${EXTRAS.promptAgain}` : '';
        const r = p.again();
        if (await speak({ ...r, text: r.text + prompt }, gen)) waitForStartRef.current(gen);
      } else {
        h.resolveGuess(move.index, false);
        const r = p.wrong();
        setMood(r.mood);
        await wait(PAUSE_BEFORE);
        if (await speak(r, gen)) nextMove(gen);
      }
    }
  }, [move, phase, nextMove, speak, character]);
  answerRef.current = answer;

  /** Waits until the player says "hra". It remembers how loudly they speak from that. */
  const waitForStart = useCallback(async (gen: number) => {
    if (!settingsRef.current.microphone || !listeningAvailable) return;
    await enableMeasuring();
    if (gen !== generation.current) return;
    setHeardText('');
    await listenContinuously(gen, async (texts, loudness) => {
      if (texts.length === 0) return false;
      setHeardText(texts[0]);
      if (!isStart(texts)) return false;
      forgetPlayer();
      calibrateFromStart(loudness);
      startGameRef.current();
      return true;
    });
  }, [listenContinuously]);
  const waitForStartRef = useRef(waitForStart);
  waitForStartRef.current = waitForStart;

  const chooseCharacter = async () => {
    const gen = interrupt();
    dialogue.current = new Dialogue(character.lines);
    setPhase('intro');
    setTimeout(() => gen === generation.current && setMood('calm'), 1200);
    const prompt = settingsRef.current.microphone && listeningAvailable ? ` ${EXTRAS.promptIntro}` : '';
    const r = dialogue.current.intro();
    if (await speak({ ...r, text: r.text + prompt }, gen)) waitForStart(gen);
  };

  const startGame = async () => {
    const gen = interrupt();
    if (settingsRef.current.microphone && listeningAvailable) enableMeasuring();
    game.current = new Game(database);
    dialogue.current = new Dialogue(character.lines);
    setMove(null);
    setHeardText('');
    setPhase('game');
    if (await speak(dialogue.current.start(), gen)) nextMove(gen);
  };

  const startGameRef = useRef(startGame);
  startGameRef.current = startGame;

  const backToSelection = () => {
    interrupt();
    game.current = null;
    dialogue.current = null;
    setMove(null);
    setBubble('');
    setMood('calm');
    setPhase('select');
  };

  const toggleMicrophone = () => {
    if (microphone) {
      settingsRef.current.microphone = false;
      cancelListening.current();
      setListening(false);
      setMicrophone(false);
    } else {
      setMicrophone(true);
      settingsRef.current.microphone = true;
      setNotice('');
      if (phase === 'game' && move && !speaking) listenForAnswer(interrupt(), move.type === 'guess');
      if ((phase === 'intro' || phase === 'win' || phase === 'giveUp') && !speaking) waitForStart(interrupt());
    }
  };

  /** Manual restart of listening with the 🎤 button. */
  const listenAgain = () => {
    setNotice('');
    if (phase === 'game') {
      if (move) listenForAnswer(interrupt(), move.type === 'guess');
    } else waitForStart(interrupt());
  };

  const step = (step: number) => setIndex((i) => (i + step + CHARACTERS.length) % CHARACTERS.length);

  const count = game.current?.questionCount ?? 0;
  const isGuess = move?.type === 'guess';

  return (
    <div
      className="app"
      style={{ background: `radial-gradient(circle at 50% 30%, ${character.background[0]}, ${character.background[1]})` }}
    >
      <header>
        <h1>Hádání zvířat</h1>
        <div className="controls">
          {phase !== 'select' && (
            <button className="small" onClick={backToSelection} title="Vybrat jinou postavičku">
              ⟲ Postavičky
            </button>
          )}
          <button className="small" onClick={() => setMuted((z) => !z)} title="Zapnout nebo vypnout hlas">
            {muted ? '🔇' : '🔊'}
          </button>
          {listeningAvailable && (
            <button
              className={`small ${microphone ? 'on' : ''}`}
              onClick={toggleMicrophone}
              title="Odpovídat hlasem"
            >
              {microphone ? '🎤 zapnutý' : '🎤 vypnutý'}
            </button>
          )}
        </div>
      </header>

      <main>
        <div className="stage">
          <Scene character={character} speaking={speaking} mood={mood} />
          {phase === 'select' && (
            <>
              <button className="arrow left" onClick={() => step(-1)} aria-label="Předchozí postavička">
                ◀
              </button>
              <button className="arrow right" onClick={() => step(1)} aria-label="Další postavička">
                ▶
              </button>
            </>
          )}
        </div>

        <section className="panel">
          {phase === 'select' ? (
            <>
              <h2 style={{ color: character.color }}>{character.name}</h2>
              <p className="description">{character.description}</p>
              <div className="dots">
                {CHARACTERS.map((p, i) => (
                  <button
                    key={p.id}
                    className={i === index ? 'active' : ''}
                    onClick={() => setIndex(i)}
                    aria-label={p.name}
                  />
                ))}
              </div>
              <button className="big" onClick={chooseCharacter}>
                Hrát s touhle postavičkou
              </button>
            </>
          ) : (
            <>
              {bubble && (
                <div className={`bubble ${speaking ? 'speaking' : ''}`}>
                  {isGuess && move.type === 'guess' && <span className="emoji">{move.animal.emoji}</span>}
                  {bubble}
                </div>
              )}

              {phase === 'intro' && (
                <button className="big" onClick={startGame}>
                  Mám ho, začni!
                </button>
              )}

              {phase !== 'game' && microphone && (listening || !speaking) && (
                <div className="status">
                  {listening ? (
                    <span className="listening">● Řekni „hra“ a začneme</span>
                  ) : (
                    <button className="link" onClick={listenAgain}>
                      🎤 Poslouchat
                    </button>
                  )}
                  {heardText && <span className="heard">🎧 „{heardText}“</span>}
                </div>
              )}

              {phase === 'game' && move && (
                <>
                  <div className={`answers ${highlight ? 'highlight' : ''}`}>
                    {(isGuess ? BUTTONS.slice(0, 2) : BUTTONS).map((t) => (
                      <button key={t.answer} className={`answer ${t.variant}`} onClick={() => answer(t.answer)}>
                        {t.text}
                      </button>
                    ))}
                  </div>
                  <div className="status">
                    {listening ? (
                      <span className={`listening ${ready ? '' : 'warming-up'}`}>{ready ? '● Poslouchám, mluv' : '○ Chystám mikrofon…'}</span>
                    ) : microphone && !speaking ? (
                      <button className="link" onClick={listenAgain}>
                        🎤 Řekni odpověď
                      </button>
                    ) : null}
                    {heardText && <span className="heard">🎧 „{heardText}“</span>}
                    <span className="counter">Otázka {count + (isGuess ? 0 : 1)}</span>
                  </div>
                </>
              )}

              {(phase === 'win' || phase === 'giveUp') && (
                <button className="big" onClick={startGame}>
                  Hrát znovu
                </button>
              )}
            </>
          )}
          {notice && <p className="notice">{notice}</p>}
          {!listeningAvailable && phase !== 'select' && (
            <p className="notice">Tento prohlížeč neumí poslouchat. Hlasové odpovědi fungují v Chrome, Edge a Safari.</p>
          )}
        </section>

        {debugMode && game.current && (
          <aside className="debug">
            {game.current
              .ranking()
              .slice(0, 6)
              .map((x) => (
                <div key={x.index}>
                  {database.animals[x.index].emoji} {database.animals[x.index].name}: {(x.prob * 100).toFixed(1)} %
                </div>
              ))}
            {entries.map((z, i) => (
              <div key={i} className="entry">
                {z}
              </div>
            ))}
            <div>
              player loudness: {referenceLoudness()?.toFixed(3) ?? '–'}, last: {segmentPeak().toFixed(3)}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
