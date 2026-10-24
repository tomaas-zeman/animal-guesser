import { useCallback, useEffect, useRef, useState } from 'react';
import db from './data/zvirata.json';
import { Hra, type Databaze, type Odpoved, type Tah } from './game/engine';
import { POSTAVICKY, nahodne } from './postavicky';
import type { Nalada } from './postavicky/spolecne';
import { ceskyHlas, jePrirozeny, mluveniDostupne, rekni, zmlkni } from './rec/mluveni';
import { poslechDostupny, poslouchej, rozpoznejOdpoved } from './rec/poslech';
import { Scena } from './Scena';

const databaze = db as unknown as Databaze;
const ladeni = new URLSearchParams(location.search).has('debug');

type Faze = 'vyber' | 'uvod' | 'hra' | 'vyhra' | 'vzdavam';

const TLACITKA: { odpoved: Odpoved; text: string; trida: string }[] = [
  { odpoved: 'ano', text: 'Ano', trida: 'ano' },
  { odpoved: 'ne', text: 'Ne', trida: 'ne' },
  { odpoved: 'nevim', text: 'Nevím', trida: 'nevim' },
  { odpoved: 'mozna', text: 'Může být', trida: 'mozna' },
];

const pockej = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [index, setIndex] = useState(0);
  const postavicka = POSTAVICKY[index];
  const [faze, setFaze] = useState<Faze>('vyber');
  const [bublina, setBublina] = useState('');
  const [mluvi, setMluvi] = useState(false);
  const [nalada, setNalada] = useState<Nalada>('klid');
  const [tah, setTah] = useState<Tah | null>(null);
  const [mikrofon, setMikrofon] = useState(poslechDostupny);
  const [posloucha, setPosloucha] = useState(false);
  const [slyseno, setSlyseno] = useState('');
  const [upozorneni, setUpozorneni] = useState('');
  const [ztlumeno, setZtlumeno] = useState(false);

  const hra = useRef<Hra | null>(null);
  // každá akce hráče zvýší generaci, aby starý rozběhnutý průběh (mluvení, poslech) skončil
  const generace = useRef(0);
  const zrusPoslech = useRef<() => void>(() => {});
  const reklTuseni = useRef(false);
  const nastaveniRef = useRef({ mikrofon, ztlumeno });
  nastaveniRef.current = { mikrofon, ztlumeno };

  useEffect(() => {
    const t = setTimeout(() => {
      if (!mluveniDostupne) return;
      const hlas = ceskyHlas();
      if (!hlas) setUpozorneni('Prohlížeč nemá český hlas, postavička může mluvit s přízvukem. Nejlíp mluví v prohlížeči Edge.');
      else if (!jePrirozeny(hlas)) setUpozorneni('Tip: nejpřirozeněji postavičky mluví v prohlížeči Microsoft Edge.');
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const prerus = () => {
    generace.current++;
    zmlkni();
    zrusPoslech.current();
    setPosloucha(false);
    setMluvi(false);
    return generace.current;
  };

  const mluv = useCallback(async (text: string, gen: number) => {
    if (gen !== generace.current) return false;
    setBublina(text);
    setMluvi(true);
    await rekni(text, postavicka.hlas, nastaveniRef.current.ztlumeno);
    if (gen !== generace.current) return false;
    setMluvi(false);
    return true;
  }, [postavicka]);

  // dopředná deklarace kvůli vzájemnému volání
  const odpovezRef = useRef<(o: Odpoved) => void>(() => {});

  const poslouchejOdpoved = useCallback(async (gen: number, pokus = 0) => {
    if (!nastaveniRef.current.mikrofon || !poslechDostupny || gen !== generace.current) return;
    setSlyseno('');
    setPosloucha(true);
    const p = poslouchej();
    zrusPoslech.current = p.zrus;
    let texty: string[] = [];
    try {
      texty = await p.vysledek;
    } catch {
      setMikrofon(false);
      setUpozorneni('Mikrofon není povolený. Odpovídej tlačítky, nebo povol mikrofon v prohlížeči.');
    }
    if (gen !== generace.current) return;
    setPosloucha(false);
    if (texty.length === 0) return; // ticho: hráč může kliknout na tlačítko nebo na mikrofon
    setSlyseno(texty[0]);
    const odpoved = rozpoznejOdpoved(texty);
    if (odpoved) {
      odpovezRef.current(odpoved);
    } else if (pokus < 2) {
      if (await mluv(postavicka.hlasky.nerozumim, gen)) poslouchejOdpoved(gen, pokus + 1);
    }
  }, [mluv, postavicka]);

  const dalsiTah = useCallback(async (gen: number, reakce = '') => {
    const h = hra.current;
    if (!h) return;
    const t = h.dalsiTah();
    if (t.typ === 'otazka') {
      setNalada('premysli');
      setBublina(reakce || '…');
      await pockej(450);
      if (gen !== generace.current) return;
      // jednou za hru prozradí, že už má favorita
      let uvod = reakce;
      if (!reklTuseni.current && (h.poradi()[0]?.pst ?? 0) >= 0.3) {
        reklTuseni.current = true;
        uvod = nahodne(postavicka.hlasky.tuseni);
      }
      setNalada('klid');
      setTah(t);
      // reakce a otázka jako jedna věta, aby mezi nimi nebyla dlouhá pauza
      if (await mluv(uvod ? `${uvod} ${t.text}` : t.text, gen)) poslouchejOdpoved(gen);
    } else if (t.typ === 'tip') {
      setTah(t);
      setNalada('tipuje');
      const veta = nahodne(postavicka.hlasky.tip).replace('{z}', t.zvire.jmeno.toLowerCase());
      if (await mluv(veta, gen)) poslouchejOdpoved(gen);
    } else {
      setNalada('smutek');
      setFaze('vzdavam');
      await mluv(postavicka.hlasky.vzdavam, gen);
    }
  }, [mluv, poslouchejOdpoved, postavicka]);

  const odpovez = useCallback(async (o: Odpoved) => {
    const h = hra.current;
    if (!h || !tah || faze !== 'hra') return;
    const gen = prerus();
    // tlačítka zmizí, dokud postavička nepoloží další otázku
    setTah(null);
    if (tah.typ === 'otazka') {
      h.odpovez(tah.id, o);
      // reaguje skoro vždycky, ale ne pokaždé, aby to neznělo naučeně
      dalsiTah(gen, Math.random() < 0.75 ? nahodne(postavicka.hlasky.reakce[o]) : '');
    } else if (tah.typ === 'tip') {
      if (o === 'ano') {
        setTah(tah); // nechá v bublině obrázek uhodnutého zvířete
        setFaze('vyhra');
        setNalada('radost');
        await mluv(nahodne(postavicka.hlasky.vyhra), gen);
      } else {
        h.vyhodnotTip(tah.index, false);
        setNalada('smutek');
        if (await mluv(nahodne(postavicka.hlasky.omyl), gen)) dalsiTah(gen);
      }
    }
  }, [tah, faze, dalsiTah, mluv, postavicka]);
  odpovezRef.current = odpovez;

  const vyberPostavicku = async () => {
    const gen = prerus();
    setFaze('uvod');
    setNalada('radost');
    setTimeout(() => gen === generace.current && setNalada('klid'), 1200);
    await mluv(postavicka.hlasky.uvod, gen);
  };

  const zacni = async () => {
    const gen = prerus();
    hra.current = new Hra(databaze);
    reklTuseni.current = false;
    setTah(null);
    setSlyseno('');
    setFaze('hra');
    setNalada('klid');
    if (await mluv(nahodne(postavicka.hlasky.zacatek), gen)) dalsiTah(gen);
  };

  const zpetNaVyber = () => {
    prerus();
    hra.current = null;
    setTah(null);
    setBublina('');
    setNalada('klid');
    setFaze('vyber');
  };

  const prepniMikrofon = () => {
    if (mikrofon) {
      zrusPoslech.current();
      setPosloucha(false);
      setMikrofon(false);
    } else {
      setMikrofon(true);
      nastaveniRef.current.mikrofon = true;
      if (faze === 'hra' && !mluvi) poslouchejOdpoved(generace.current);
    }
  };

  const posun = (krok: number) => setIndex((i) => (i + krok + POSTAVICKY.length) % POSTAVICKY.length);

  const pocet = hra.current?.pocetOtazek ?? 0;
  const naTip = tah?.typ === 'tip';

  return (
    <div
      className="aplikace"
      style={{ background: `radial-gradient(circle at 50% 30%, ${postavicka.pozadi[0]}, ${postavicka.pozadi[1]})` }}
    >
      <header>
        <h1>Hádání zvířat</h1>
        <div className="ovladani">
          {faze !== 'vyber' && (
            <button className="maly" onClick={zpetNaVyber} title="Vybrat jinou postavičku">
              ⟲ Postavičky
            </button>
          )}
          <button className="maly" onClick={() => setZtlumeno((z) => !z)} title="Zapnout nebo vypnout hlas">
            {ztlumeno ? '🔇' : '🔊'}
          </button>
          {poslechDostupny && (
            <button
              className={`maly ${mikrofon ? 'zapnuto' : ''}`}
              onClick={prepniMikrofon}
              title="Odpovídat hlasem"
            >
              {mikrofon ? '🎤 zapnutý' : '🎤 vypnutý'}
            </button>
          )}
        </div>
      </header>

      <main>
        <div className="scena">
          <Scena postavicka={postavicka} mluvi={mluvi} nalada={nalada} />
          {faze === 'vyber' && (
            <>
              <button className="sipka vlevo" onClick={() => posun(-1)} aria-label="Předchozí postavička">
                ◀
              </button>
              <button className="sipka vpravo" onClick={() => posun(1)} aria-label="Další postavička">
                ▶
              </button>
            </>
          )}
        </div>

        <section className="panel">
          {faze === 'vyber' ? (
            <>
              <h2 style={{ color: postavicka.barva }}>{postavicka.jmeno}</h2>
              <p className="popis">{postavicka.popis}</p>
              <div className="tecky">
                {POSTAVICKY.map((p, i) => (
                  <button
                    key={p.id}
                    className={i === index ? 'aktivni' : ''}
                    onClick={() => setIndex(i)}
                    aria-label={p.jmeno}
                  />
                ))}
              </div>
              <button className="velky" onClick={vyberPostavicku}>
                Hrát s touhle postavičkou
              </button>
            </>
          ) : (
            <>
              {bublina && (
                <div className={`bublina ${mluvi ? 'mluvi' : ''}`}>
                  {naTip && tah.typ === 'tip' && <span className="emoji">{tah.zvire.emoji}</span>}
                  {bublina}
                </div>
              )}

              {faze === 'uvod' && (
                <button className="velky" onClick={zacni}>
                  Mám ho, začni!
                </button>
              )}

              {faze === 'hra' && tah && (
                <>
                  <div className="odpovedi">
                    {(naTip ? TLACITKA.slice(0, 2) : TLACITKA).map((t) => (
                      <button key={t.odpoved} className={`odpoved ${t.trida}`} onClick={() => odpovez(t.odpoved)}>
                        {t.text}
                      </button>
                    ))}
                  </div>
                  <div className="stav">
                    {posloucha ? (
                      <span className="posloucham">● Poslouchám…</span>
                    ) : mikrofon && !mluvi ? (
                      <button className="odkaz" onClick={() => poslouchejOdpoved(generace.current)}>
                        🎤 Řekni odpověď
                      </button>
                    ) : null}
                    {slyseno && <span className="slyseno">🎧 „{slyseno}“</span>}
                    <span className="pocitadlo">Otázka {pocet + (naTip ? 0 : 1)}</span>
                  </div>
                </>
              )}

              {(faze === 'vyhra' || faze === 'vzdavam') && (
                <button className="velky" onClick={zacni}>
                  Hrát znovu
                </button>
              )}
            </>
          )}
          {upozorneni && <p className="upozorneni">{upozorneni}</p>}
          {!poslechDostupny && faze !== 'vyber' && (
            <p className="upozorneni">Tento prohlížeč neumí poslouchat. Hlasové odpovědi fungují v Chrome, Edge a Safari.</p>
          )}
        </section>

        {ladeni && hra.current && (
          <aside className="ladeni">
            {hra.current
              .poradi()
              .slice(0, 6)
              .map((x) => (
                <div key={x.index}>
                  {databaze.zvirata[x.index].emoji} {databaze.zvirata[x.index].jmeno}: {(x.pst * 100).toFixed(1)} %
                </div>
              ))}
          </aside>
        )}
      </main>
    </div>
  );
}
