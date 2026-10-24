// Nahrávací stránka (?nahravani): věta po větě namluvit hlasy postaviček vlastním mikrofonem.
// Nahrávky se ukládají v prohlížeči, na konci se stáhnou jako ZIP pro složku public/.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { vsechnyUseky, type Usek } from './hlasy/klice';
import { nactiIndex, obnovMistni, prehraj, zastav, zvukZBlobu, type IndexHlasu } from './hlasy/prehravac';
import { klicNahravky, kliceNahravek, nactiNahravku, smazNahravku, ulozNahravku, vsechnyNahravky } from './hlasy/uloziste';
import { vytvorZip } from './hlasy/zip';
import { POSTAVICKY } from './postavicky';
import { rekni, zmlkni } from './rec/mluveni';

type Filtr = 'vse' | 'chybi' | 'nahrane';

/** Formát nahrávky: AAC v MP4 přehraje každý prohlížeč, jinak co prohlížeč umí. */
function formatNahravani(): { mimeType?: string; pripona: string } {
  const moznosti: [string, string][] = [
    ['audio/mp4;codecs=mp4a.40.2', 'm4a'],
    ['audio/mp4', 'm4a'],
    ['audio/webm;codecs=opus', 'webm'],
    ['audio/ogg;codecs=opus', 'ogg'],
  ];
  for (const [mime, pripona] of moznosti) if (MediaRecorder.isTypeSupported?.(mime)) return { mimeType: mime, pripona };
  return { pripona: 'webm' };
}

const NAPOVEDA: Record<Usek['druh'], string> = {
  veta: '',
  zacatek: 'Začátek tipu. Řekni ho, jako by věta pokračovala jménem zvířete, a na konci se nezastavuj.',
  jmeno: 'Jméno zvířete na konci tipu. Řekni ho s intonací, jakou má poslední slovo věty.',
  konec: 'Konec tipu, zazní hned po jménu zvířete.',
};

const stahni = (blob: Blob, jmeno: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = jmeno;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
};

export default function Nahravani() {
  const [postavaIndex, setPostavaIndex] = useState(0);
  const postavicka = POSTAVICKY[postavaIndex];
  const postava = postavicka.id;
  const useky = useMemo(() => vsechnyUseky(postava), [postava]);
  const skupiny = useMemo(() => [...new Set(useky.map((u) => u.skupina))], [useky]);
  const [skupina, setSkupina] = useState('');
  const [filtr, setFiltr] = useState<Filtr>('vse');
  const [index, setIndex] = useState<IndexHlasu>({});
  const [mistni, setMistni] = useState<Set<string>>(new Set());
  const [aktualniId, setAktualniId] = useState('');
  const [nahrava, setNahrava] = useState(false);
  const [hlasitost, setHlasitost] = useState(0);
  const [chyba, setChyba] = useState('');
  const [prehratPo, setPrehratPo] = useState(true);
  const [dalsiPo, setDalsiPo] = useState(false);

  const stream = useRef<MediaStream | null>(null);
  const rekorder = useRef<MediaRecorder | null>(null);
  const mereni = useRef<number>(0);

  useEffect(() => {
    nactiIndex().then(setIndex);
    kliceNahravek().then(setMistni);
  }, []);

  const naWebu = (u: Usek) => !!index[postava]?.[u.id];
  const uMe = (u: Usek) => mistni.has(klicNahravky(postava, u.id));

  const vyber = useky.filter(
    (u) =>
      (!skupina || u.skupina === skupina) &&
      (filtr === 'vse' || (filtr === 'chybi' ? !naWebu(u) && !uMe(u) : naWebu(u) || uMe(u))),
  );
  const aktualni = vyber.find((u) => u.id === aktualniId) ?? vyber[0];
  const poradi = aktualni ? vyber.indexOf(aktualni) : -1;

  const posun = (krok: number) => {
    const u = vyber[poradi + krok];
    if (u) setAktualniId(u.id);
  };
  const dalsiChybejici = () => {
    const u = [...vyber.slice(poradi + 1), ...vyber.slice(0, poradi)].find((x) => !naWebu(x) && !uMe(x));
    if (u) setAktualniId(u.id);
  };

  const prehrajUsek = useCallback(
    async (u: Usek) => {
      zmlkni();
      const n = await nactiNahravku(klicNahravky(postava, u.id));
      let blob = n?.blob;
      if (!blob && index[postava]?.[u.id]) {
        const r = await fetch(`./hlasy/${postava}/${u.id}.${index[postava][u.id]}`);
        if (r.ok) blob = await r.blob();
      }
      if (!blob) return;
      const z = await zvukZBlobu(blob);
      if (z) await prehraj([z]);
    },
    [postava, index],
  );

  const zacniNahravat = async () => {
    if (!aktualni || nahrava) return;
    setChyba('');
    zmlkni();
    try {
      stream.current ??= await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
      });
    } catch {
      setChyba('Mikrofon není povolený. Povol ho v nastavení prohlížeče a zkus to znovu.');
      return;
    }
    const s = stream.current;
    const { mimeType, pripona } = formatNahravani();
    const r = new MediaRecorder(s, { mimeType, audioBitsPerSecond: 64_000 });
    const kusy: Blob[] = [];
    const u = aktualni;
    r.ondataavailable = (e) => e.data.size && kusy.push(e.data);
    r.onstop = async () => {
      cancelAnimationFrame(mereni.current);
      setHlasitost(0);
      setNahrava(false);
      const blob = new Blob(kusy, { type: r.mimeType || mimeType });
      if (blob.size < 500) {
        setChyba('Nahrávka je prázdná, zkus to znovu.');
        return;
      }
      await ulozNahravku({ klic: klicNahravky(postava, u.id), blob, pripona, text: u.text, kdy: Date.now() });
      obnovMistni();
      setMistni(await kliceNahravek());
      if (prehratPo) await prehrajUsek(u);
      if (dalsiPo) posun(1);
    };
    // ukazatel hlasitosti, ať je vidět, že mikrofon slyší
    const ac = new AudioContext();
    const analyza = ac.createAnalyser();
    ac.createMediaStreamSource(s).connect(analyza);
    const data = new Float32Array(analyza.fftSize);
    const mer = () => {
      analyza.getFloatTimeDomainData(data);
      setHlasitost(Math.min(1, Math.max(...data.map(Math.abs)) * 1.5));
      if (r.state === 'recording') mereni.current = requestAnimationFrame(mer);
      else ac.close();
    };
    rekorder.current = r;
    r.start();
    setNahrava(true);
    mereni.current = requestAnimationFrame(mer);
  };

  const zastavNahravani = () => {
    if (rekorder.current?.state === 'recording') rekorder.current.stop();
  };

  const smaz = async (u: Usek) => {
    await smazNahravku(klicNahravky(postava, u.id));
    obnovMistni();
    setMistni(await kliceNahravek());
  };

  const ukazka = (u: Usek) => {
    zastav();
    rekni(u.druh === 'jmeno' ? `Je to ${u.text}` : u.text, postavicka.hlas);
  };

  const stahniZip = async (jenTato: boolean) => {
    const vse = await vsechnyNahravky();
    const vybrane = vse.filter((n) => !jenTato || n.klic.startsWith(`${postava}/`));
    if (vybrane.length === 0) return;
    const soubory = await Promise.all(
      vybrane.map(async (n) => ({ cesta: `hlasy/${n.klic}.${n.pripona}`, data: new Uint8Array(await n.blob.arrayBuffer()) })),
    );
    stahni(vytvorZip(soubory), jenTato ? `hlasy-${postava}.zip` : 'hlasy.zip');
  };

  const stahniSeznam = () => {
    const seznam = Object.fromEntries(POSTAVICKY.map((p) => [p.id, vsechnyUseky(p.id)]));
    stahni(new Blob([JSON.stringify(seznam, null, 2)], { type: 'application/json' }), 'hlasy-seznam.json');
  };

  // ovládání klávesnicí: mezerník nahrává, šipky listují
  const klavesy = useRef<(e: KeyboardEvent) => void>(() => {});
  klavesy.current = (e) => {
    const cil = e.target as HTMLElement;
    if (cil.tagName === 'SELECT' || cil.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (nahrava) zastavNahravani();
      else zacniNahravat();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      posun(1);
    } else if (e.key === 'ArrowLeft') posun(-1);
    else if (e.key === 'p' || e.key === 'P') aktualni && prehrajUsek(aktualni);
    else if (e.key === 'n' || e.key === 'N') dalsiChybejici();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => klavesy.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const nahranych = useky.filter((u) => naWebu(u) || uMe(u)).length;
  const lokalnich = useky.filter(uMe).length;

  return (
    <div className="nahravani" style={{ background: `linear-gradient(${postavicka.pozadi[0]}, ${postavicka.pozadi[1]})` }}>
      <header>
        <h1>Namlouvání hlasů</h1>
        <a className="maly" href="./">
          ← Zpět do hry
        </a>
      </header>

      <div className="nahravani-obsah">
        <div className="nahravani-postavy">
          {POSTAVICKY.map((p, i) => (
            <button
              key={p.id}
              className={`maly ${i === postavaIndex ? 'zapnuto' : ''}`}
              onClick={() => {
                setPostavaIndex(i);
                setAktualniId('');
              }}
            >
              {p.jmeno}
            </button>
          ))}
        </div>

        <div className="nahravani-filtry">
          <select value={skupina} onChange={(e) => setSkupina(e.target.value)}>
            <option value="">Všechny věty</option>
            {skupiny.map((s) => (
              <option key={s} value={s}>
                {s} ({useky.filter((u) => u.skupina === s).length})
              </option>
            ))}
          </select>
          <select value={filtr} onChange={(e) => setFiltr(e.target.value as Filtr)}>
            <option value="vse">nahrané i nenahrané</option>
            <option value="chybi">jen chybějící</option>
            <option value="nahrane">jen nahrané</option>
          </select>
          <span>
            Nahráno {nahranych} z {useky.length}
            {lokalnich > 0 && `, z toho ${lokalnich} v tomto prohlížeči`}
          </span>
        </div>

        {aktualni ? (
          <section className="nahravani-karta">
            <div className="nahravani-meta">
              {aktualni.skupina} · {poradi + 1}/{vyber.length} ·{' '}
              {uMe(aktualni) ? '● nahráno v prohlížeči' : naWebu(aktualni) ? '✓ na webu' : '○ chybí'}
            </div>
            <div className="nahravani-text">
              {aktualni.druh === 'konec' && '… '}
              {aktualni.text}
              {aktualni.druh === 'zacatek' && ' …'}
            </div>
            {NAPOVEDA[aktualni.druh] && <p className="nahravani-napoveda">{NAPOVEDA[aktualni.druh]}</p>}
            <div className="nahravani-hlasitost">
              <div style={{ width: `${hlasitost * 100}%` }} />
            </div>
            <div className="nahravani-tlacitka">
              <button className={`velky ${nahrava ? 'nahrava' : ''}`} onClick={nahrava ? zastavNahravani : zacniNahravat}>
                {nahrava ? '⏹ Hotovo' : '⏺ Nahrát'}
              </button>
              <button className="maly" onClick={() => prehrajUsek(aktualni)} disabled={!uMe(aktualni) && !naWebu(aktualni)}>
                ▶ Přehrát
              </button>
              <button className="maly" onClick={() => ukazka(aktualni)} title="Jak větu říká syntéza řeči">
                🔈 Syntéza
              </button>
              {uMe(aktualni) && (
                <button className="maly" onClick={() => smaz(aktualni)}>
                  🗑 Smazat
                </button>
              )}
            </div>
            <div className="nahravani-tlacitka">
              <button className="maly" onClick={() => posun(-1)}>
                ← Předchozí
              </button>
              <button className="maly" onClick={() => posun(1)}>
                Další →
              </button>
              <button className="maly" onClick={dalsiChybejici}>
                ⏭ Další nenahraná
              </button>
            </div>
            <div className="nahravani-volby">
              <label>
                <input type="checkbox" checked={prehratPo} onChange={(e) => setPrehratPo(e.target.checked)} /> přehrát po nahrání
              </label>
              <label>
                <input type="checkbox" checked={dalsiPo} onChange={(e) => setDalsiPo(e.target.checked)} /> pak hned další věta
              </label>
            </div>
            {chyba && <p className="upozorneni">{chyba}</p>}
            <p className="nahravani-napoveda">
              Mezerník: nahrát / hotovo · Enter nebo →: další · ←: předchozí · P: přehrát · N: další nenahraná. Ticho na
              začátku a na konci se ořízne samo.
            </p>
          </section>
        ) : (
          <p>Tady už nic nezbývá. 🎉</p>
        )}

        <ol className="nahravani-seznam">
          {vyber.map((u) => (
            <li key={u.id} className={u === aktualni ? 'aktivni' : ''} onClick={() => setAktualniId(u.id)}>
              <span>{uMe(u) ? '●' : naWebu(u) ? '✓' : '○'}</span> {u.text}
            </li>
          ))}
        </ol>

        <section className="nahravani-karta">
          <h2>Jak dostat nahrávky do hry</h2>
          <p>
            Nahrávky se ukládají jen v tomhle prohlížeči. Hra na tomhle zařízení je používá hned, takže si je můžeš
            vyzkoušet. Aby je slyšeli všichni, stáhni ZIP, rozbal ho do složky <code>public/</code> v repozitáři
            (vznikne <code>public/hlasy/{postava}/…</code>) a pushni do master.
          </p>
          <div className="nahravani-tlacitka">
            <button className="maly" onClick={() => stahniZip(true)}>
              ⬇ ZIP: {postavicka.jmeno}
            </button>
            <button className="maly" onClick={() => stahniZip(false)}>
              ⬇ ZIP: všechny postavičky
            </button>
            <button className="maly" onClick={stahniSeznam}>
              ⬇ Seznam vět (JSON)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
