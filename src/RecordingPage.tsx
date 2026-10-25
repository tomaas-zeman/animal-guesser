// Recording page (?recording): record the characters' voices with your own microphone, sentence by sentence.
// Recordings are stored in the browser and at the end downloaded as a ZIP for the public/ folder.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { allSegments, type Segment } from './voices/keys';
import { loadIndex, refreshLocal, playClips, stop, clipFromBlob, type VoiceIndex } from './voices/player';
import { recordingKey, recordingKeys, loadRecording, deleteRecording, saveRecording, allRecordings } from './voices/storage';
import { createZip } from './voices/zip';
import { CHARACTERS } from './characters';
import { say, silence } from './speech/speaking';

type Filter = 'all' | 'missing' | 'recorded';

/** Recording format: AAC in MP4 plays in every browser, otherwise whatever the browser supports. */
function recordingFormat(): { mimeType?: string; extension: string } {
  const options: [string, string][] = [
    ['audio/mp4;codecs=mp4a.40.2', 'm4a'],
    ['audio/mp4', 'm4a'],
    ['audio/webm;codecs=opus', 'webm'],
    ['audio/ogg;codecs=opus', 'ogg'],
  ];
  for (const [mime, extension] of options) if (MediaRecorder.isTypeSupported?.(mime)) return { mimeType: mime, extension };
  return { extension: 'webm' };
}

const HINTS: Record<Segment['kind'], string> = {
  sentence: '',
  start: 'Začátek tipu. Řekni ho, jako by věta pokračovala jménem zvířete, a na konci se nezastavuj.',
  name: 'Jméno zvířete na konci tipu. Řekni ho s intonací, jakou má poslední slovo věty.',
  end: 'Konec tipu, zazní hned po jménu zvířete.',
};

const download = (blob: Blob, name: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
};

export default function RecordingPage() {
  const [characterIndex, setCharacterIndex] = useState(0);
  const character = CHARACTERS[characterIndex];
  const characterId = character.id;
  const segments = useMemo(() => allSegments(characterId), [characterId]);
  const groups = useMemo(() => [...new Set(segments.map((u) => u.group))], [segments]);
  const [group, setGroup] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [index, setIndex] = useState<VoiceIndex>({});
  const [local, setLocal] = useState<Set<string>>(new Set());
  const [currentId, setCurrentId] = useState('');
  const [recording, setRecording] = useState(false);
  const [loudness, setLoudness] = useState(0);
  const [error, setError] = useState('');
  const [playAfter, setPlayAfter] = useState(true);
  const [nextAfter, setNextAfter] = useState(false);

  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const measuring = useRef<number>(0);

  useEffect(() => {
    loadIndex().then(setIndex);
    recordingKeys().then(setLocal);
  }, []);

  const onSite = (u: Segment) => !!index[characterId]?.[u.id];
  const isLocal = (u: Segment) => local.has(recordingKey(characterId, u.id));

  const visible = segments.filter(
    (u) =>
      (!group || u.group === group) &&
      (filter === 'all' || (filter === 'missing' ? !onSite(u) && !isLocal(u) : onSite(u) || isLocal(u))),
  );
  const current = visible.find((u) => u.id === currentId) ?? visible[0];
  const ranking = current ? visible.indexOf(current) : -1;

  const step = (step: number) => {
    const u = visible[ranking + step];
    if (u) setCurrentId(u.id);
  };
  const nextMissing = () => {
    const u = [...visible.slice(ranking + 1), ...visible.slice(0, ranking)].find((x) => !onSite(x) && !isLocal(x));
    if (u) setCurrentId(u.id);
  };

  const playSegment = useCallback(
    async (u: Segment) => {
      silence();
      const n = await loadRecording(recordingKey(characterId, u.id));
      let blob = n?.blob;
      if (!blob && index[characterId]?.[u.id]) {
        const r = await fetch(`./voices/${characterId}/${u.id}.${index[characterId][u.id]}`);
        if (r.ok) blob = await r.blob();
      }
      if (!blob) return;
      const z = await clipFromBlob(blob);
      if (z) await playClips([z]);
    },
    [characterId, index],
  );

  const startRecording = async () => {
    if (!current || recording) return;
    setError('');
    silence();
    try {
      stream.current ??= await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
      });
    } catch {
      setError('Mikrofon není povolený. Povol ho v nastavení prohlížeče a zkus to znovu.');
      return;
    }
    const s = stream.current;
    const { mimeType, extension } = recordingFormat();
    const r = new MediaRecorder(s, { mimeType, audioBitsPerSecond: 64_000 });
    const chunks: Blob[] = [];
    const u = current;
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = async () => {
      cancelAnimationFrame(measuring.current);
      setLoudness(0);
      setRecording(false);
      const blob = new Blob(chunks, { type: r.mimeType || mimeType });
      if (blob.size < 500) {
        setError('Nahrávka je prázdná, zkus to znovu.');
        return;
      }
      await saveRecording({ key: recordingKey(characterId, u.id), blob, extension, text: u.text, when: Date.now() });
      refreshLocal();
      setLocal(await recordingKeys());
      if (playAfter) await playSegment(u);
      if (nextAfter) step(1);
    };
    // loudness meter, so it is visible that the microphone hears
    const ac = new AudioContext();
    const analysis = ac.createAnalyser();
    ac.createMediaStreamSource(s).connect(analysis);
    const data = new Float32Array(analysis.fftSize);
    const measure = () => {
      analysis.getFloatTimeDomainData(data);
      setLoudness(Math.min(1, Math.max(...data.map(Math.abs)) * 1.5));
      if (r.state === 'recording') measuring.current = requestAnimationFrame(measure);
      else ac.close();
    };
    recorder.current = r;
    r.start();
    setRecording(true);
    measuring.current = requestAnimationFrame(measure);
  };

  const stopRecording = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  const remove = async (u: Segment) => {
    await deleteRecording(recordingKey(characterId, u.id));
    refreshLocal();
    setLocal(await recordingKeys());
  };

  const preview = (u: Segment) => {
    stop();
    say(u.kind === 'name' ? `Je to ${u.text}` : u.text, character.voice);
  };

  const downloadZip = async (onlyThis: boolean) => {
    const all = await allRecordings();
    const selected = all.filter((n) => !onlyThis || n.key.startsWith(`${characterId}/`));
    if (selected.length === 0) return;
    const files = await Promise.all(
      selected.map(async (n) => ({ path: `voices/${n.key}.${n.extension}`, data: new Uint8Array(await n.blob.arrayBuffer()) })),
    );
    download(createZip(files), onlyThis ? `voices-${characterId}.zip` : 'voices.zip');
  };

  const downloadList = () => {
    const list = Object.fromEntries(CHARACTERS.map((p) => [p.id, allSegments(p.id)]));
    download(new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' }), 'voice-list.json');
  };

  // keyboard controls: space records, arrows browse
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'SELECT' || target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (recording) stopRecording();
      else startRecording();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'p' || e.key === 'P') current && playSegment(current);
    else if (e.key === 'n' || e.key === 'N') nextMissing();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const recordedCount = segments.filter((u) => onSite(u) || isLocal(u)).length;
  const localCount = segments.filter(isLocal).length;

  return (
    <div className="recording" style={{ background: `linear-gradient(${character.background[0]}, ${character.background[1]})` }}>
      <header>
        <h1>Namlouvání hlasů</h1>
        <a className="small" href="./">
          ← Zpět do hry
        </a>
      </header>

      <div className="recording-content">
        <div className="recording-characters">
          {CHARACTERS.map((p, i) => (
            <button
              key={p.id}
              className={`small ${i === characterIndex ? 'on' : ''}`}
              onClick={() => {
                setCharacterIndex(i);
                setCurrentId('');
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="recording-filters">
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">Všechny věty</option>
            {groups.map((s) => (
              <option key={s} value={s}>
                {s} ({segments.filter((u) => u.group === s).length})
              </option>
            ))}
          </select>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">nahrané i nenahrané</option>
            <option value="missing">jen chybějící</option>
            <option value="recorded">jen nahrané</option>
          </select>
          <span>
            Nahráno {recordedCount} z {segments.length}
            {localCount > 0 && `, z toho ${localCount} v tomto prohlížeči`}
          </span>
        </div>

        {current ? (
          <section className="recording-card">
            <div className="recording-meta">
              {current.group} · {ranking + 1}/{visible.length} ·{' '}
              {isLocal(current) ? '● nahráno v prohlížeči' : onSite(current) ? '✓ na webu' : '○ chybí'}
            </div>
            <div className="recording-text">
              {current.kind === 'end' && '… '}
              {current.text}
              {current.kind === 'start' && ' …'}
            </div>
            {HINTS[current.kind] && <p className="recording-hint">{HINTS[current.kind]}</p>}
            <div className="recording-loudness">
              <div style={{ width: `${loudness * 100}%` }} />
            </div>
            <div className="recording-buttons">
              <button className={`big ${recording ? 'recording-active' : ''}`} onClick={recording ? stopRecording : startRecording}>
                {recording ? '⏹ Hotovo' : '⏺ Nahrát'}
              </button>
              <button className="small" onClick={() => playSegment(current)} disabled={!isLocal(current) && !onSite(current)}>
                ▶ Přehrát
              </button>
              <button className="small" onClick={() => preview(current)} title="Jak větu říká syntéza řeči">
                🔈 Syntéza
              </button>
              {isLocal(current) && (
                <button className="small" onClick={() => remove(current)}>
                  🗑 Smazat
                </button>
              )}
            </div>
            <div className="recording-buttons">
              <button className="small" onClick={() => step(-1)}>
                ← Předchozí
              </button>
              <button className="small" onClick={() => step(1)}>
                Další →
              </button>
              <button className="small" onClick={nextMissing}>
                ⏭ Další nenahraná
              </button>
            </div>
            <div className="recording-options">
              <label>
                <input type="checkbox" checked={playAfter} onChange={(e) => setPlayAfter(e.target.checked)} /> přehrát po nahrání
              </label>
              <label>
                <input type="checkbox" checked={nextAfter} onChange={(e) => setNextAfter(e.target.checked)} /> pak hned další věta
              </label>
            </div>
            {error && <p className="notice">{error}</p>}
            <p className="recording-hint">
              Mezerník: nahrát / hotovo · Enter nebo →: další · ←: předchozí · P: přehrát · N: další nenahraná. Ticho na
              začátku a na konci se ořízne samo.
            </p>
          </section>
        ) : (
          <p>Tady už nic nezbývá. 🎉</p>
        )}

        <ol className="recording-list">
          {visible.map((u) => (
            <li key={u.id} className={u === current ? 'active' : ''} onClick={() => setCurrentId(u.id)}>
              <span>{isLocal(u) ? '●' : onSite(u) ? '✓' : '○'}</span> {u.text}
            </li>
          ))}
        </ol>

        <section className="recording-card">
          <h2>Jak dostat nahrávky do hry</h2>
          <p>
            Nahrávky se ukládají jen v tomhle prohlížeči. Hra na tomhle zařízení je používá hned, takže si je můžeš
            vyzkoušet. Aby je slyšeli všichni, stáhni ZIP, rozbal ho do složky <code>public/</code> v repozitáři
            (vznikne <code>public/voices/{characterId}/…</code>) a pushni do master.
          </p>
          <div className="recording-buttons">
            <button className="small" onClick={() => downloadZip(true)}>
              ⬇ ZIP: {character.name}
            </button>
            <button className="small" onClick={() => downloadZip(false)}>
              ⬇ ZIP: všechny postavičky
            </button>
            <button className="small" onClick={downloadList}>
              ⬇ Seznam vět (JSON)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
