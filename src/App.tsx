import { useCallback, useEffect, useRef, useState } from 'react';
import db from './data/zvirata.json';
import { Hra, type Databaze, type Odpoved, type Tah } from './game/engine';
import { POSTAVICKY, nahodne } from './postavicky';
import type { Nalada } from './postavicky/spolecne';
import { ceskyHlas, jePrirozeny, maHlas, mluveniDostupne, rekni, zmlkni } from './rec/mluveni';
import { jeHrac, kalibruj, meriSe, referencniHlasitost, spickaUseku, vypniMereni, zacniUsek, zapniMereni, zapomenHrace } from './rec/hlasitost';
import {
  MAX_PORUCH,
  jeHovorOkolo,
  jeNesrozumitelne,
  jePorucha,
  jeStart,
  jeZopakuj,
  pauzaPoPoruse,
  poslechDostupny,
  poslouchej,
  rozpoznejOdpoved,
  type Slyseni,
} from './rec/poslech';
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

/** chvilka "přemýšlení", než postavička začne mluvit */
const PAUZA_PRED = 400;
/** nádech mezi reakcí a další otázkou */
const PAUZA_MEZI = 350;
/** jak dlouho nejvýš poslouchá, když hráč mlčí; pak zůstane tlačítko 🎤 */
const MAX_TICHO = 5 * 60_000;

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
  /** poslední otázka nebo tip, aby ji šlo na požádání zopakovat */
  const posledniOtazka = useRef('');
  const nastaveniRef = useRef({ mikrofon, ztlumeno });
  nastaveniRef.current = { mikrofon, ztlumeno };

  useEffect(() => {
    const t = setTimeout(() => {
      if (!mluveniDostupne) return;
      const hlas = ceskyHlas();
      if (!hlas) setUpozorneni('Prohlížeč nemá český hlas, postavička může mluvit s přízvukem. Nejlíp mluví v prohlížeči Edge.');
      else if (!maHlas('muz')) setUpozorneni('Prohlížeč nemá český mužský hlas, Robík a Kvak proto mluví upraveným ženským hlasem. Mužský hlas má třeba Microsoft Edge.');
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

  /**
   * Poslouchá pořád dokola, dokud `zpracuj` nevrátí true. Mlčení a výpadky
   * rozpoznávání (síť, okamžitý konec) přečká a poslech znovu spustí.
   */
  const poslouchejPorad = useCallback(
    async (gen: number, zpracuj: (texty: string[], hlasitost: number) => Promise<boolean>) => {
      let poruch = 0;
      let posledniZvuk = Date.now();
      try {
        while (gen === generace.current && nastaveniRef.current.mikrofon && poslechDostupny) {
          setPosloucha(true);
          zacniUsek();
          const p = poslouchej();
          zrusPoslech.current = p.zrus;
          let s: Slyseni;
          try {
            s = await p.vysledek;
          } catch (e) {
            if (gen !== generace.current) return;
            if ((e as Error).message === 'mikrofon-obsazen' && meriSe()) {
              vypniMereni();
              setUpozorneni('Tohle zařízení neumí zároveň poslouchat a měřit hlasitost, filtr hlasitosti je vypnutý.');
              continue;
            }
            setMikrofon(false);
            setUpozorneni('Mikrofon není povolený. Odpovídej tlačítky, nebo povol mikrofon v prohlížeči.');
            return;
          }
          if (gen !== generace.current || !nastaveniRef.current.mikrofon) return;

          // něco zaznělo, ale bez slov: když to byl hlas hráče, ať to zopakuje
          const hlasitost = spickaUseku();
          const hracMluvil = s.chyba === 'no-match' || (meriSe() && referencniHlasitost() !== null && jeHrac(hlasitost));
          if (jeNesrozumitelne(s) && hracMluvil) {
            poruch = 0;
            posledniZvuk = Date.now();
            setPosloucha(false);
            if (await zpracuj([], hlasitost)) return;
            continue;
          }

          if (s.texty.length === 0) {
            if (jePorucha(s)) {
              if (++poruch > MAX_PORUCH) {
                setUpozorneni('Rozpoznávání řeči teď nefunguje, zkontroluj připojení k internetu. Pak klikni na 🎤, nebo odpovídej tlačítky.');
                return;
              }
              await pockej(pauzaPoPoruse(poruch));
            } else {
              poruch = 0;
              if (Date.now() - posledniZvuk > MAX_TICHO) return;
            }
            continue;
          }

          poruch = 0;
          posledniZvuk = Date.now();
          setPosloucha(false);
          if (await zpracuj(s.texty, hlasitost)) return;
        }
      } finally {
        if (gen === generace.current) setPosloucha(false);
      }
    },
    [],
  );

  /** Poslouchá odpověď. Když nerozumí, řekne to, a poslouchá dál. U tipu bere jen ano/ne. */
  const poslouchejOdpoved = useCallback(
    async (gen: number, jenAnoNe = false) => {
      setSlyseno('');
      let nerozumi = 0;
      await poslouchejPorad(gen, async (texty, hlasitost) => {
        const odpoved = rozpoznejOdpoved(texty);
        if (texty.length > 0) {
          // hovor okolo se tiše přeslechne a poslouchá se dál
          if (!jeHrac(hlasitost, odpoved !== null)) {
            setSlyseno(`${texty[0]} (moc potichu, asi někdo jiný)`);
            return false;
          }
          if (jeHovorOkolo(texty)) {
            setSlyseno(`${texty[0]} (to nebyla odpověď)`);
            return false;
          }
          setSlyseno(texty[0]);
          if (!odpoved && jeZopakuj(texty)) {
            await pockej(PAUZA_PRED);
            await mluv(posledniOtazka.current, gen);
            return false;
          }
        } else setSlyseno('…');
        if (odpoved && (!jenAnoNe || odpoved === 'ano' || odpoved === 'ne')) {
          kalibruj(hlasitost);
          odpovezRef.current(odpoved);
          return true;
        }
        nerozumi++;
        await pockej(PAUZA_PRED);
        // napoví až po několika nezdarech, a krátce, ať to nezdržuje
        const napoveda = nerozumi % 3 !== 0 ? '' : jenAnoNe ? ' Řekni ano, nebo ne.' : ' Řekni ano, ne, nebo nevím.';
        await mluv(nahodne(postavicka.hlasky.nerozumim) + napoveda, gen);
        return false;
      });
    },
    [mluv, poslouchejPorad, postavicka],
  );

  const dalsiTah = useCallback(async (gen: number, reakce = '') => {
    const h = hra.current;
    if (!h) return;
    const t = h.dalsiTah();
    setNalada(t.typ === 'vzdavam' ? 'smutek' : 'premysli');
    setBublina('…');
    await pockej(PAUZA_PRED);
    if (gen !== generace.current) return;

    if (t.typ === 'otazka') {
      // jednou za hru prozradí, že už má favorita
      let uvod = reakce;
      if (!reklTuseni.current && (h.poradi()[0]?.pst ?? 0) >= 0.3) {
        reklTuseni.current = true;
        uvod = nahodne(postavicka.hlasky.tuseni);
      }
      setNalada('klid');
      if (uvod) {
        if (!(await mluv(uvod, gen))) return;
        await pockej(PAUZA_MEZI);
        if (gen !== generace.current) return;
      }
      setTah(t);
      posledniOtazka.current = t.text;
      if (await mluv(t.text, gen)) poslouchejOdpoved(gen);
    } else if (t.typ === 'tip') {
      setTah(t);
      setNalada('tipuje');
      const veta = nahodne(postavicka.hlasky.tip).replace('{z}', t.zvire.jmeno.toLowerCase());
      posledniOtazka.current = veta;
      if (await mluv(veta, gen)) poslouchejOdpoved(gen, true);
    } else {
      setFaze('vzdavam');
      if (await mluv(postavicka.hlasky.vzdavam, gen)) cekejNaStartRef.current(gen);
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
        await pockej(PAUZA_MEZI);
        if (await mluv(nahodne(postavicka.hlasky.vyhra), gen)) cekejNaStartRef.current(gen);
      } else {
        h.vyhodnotTip(tah.index, false);
        setNalada('smutek');
        await pockej(PAUZA_PRED);
        if (await mluv(nahodne(postavicka.hlasky.omyl), gen)) dalsiTah(gen);
      }
    }
  }, [tah, faze, dalsiTah, mluv, postavicka]);
  odpovezRef.current = odpovez;

  /** Čeká, až hráč řekne "hra". Podle toho si zapamatuje, jak nahlas mluví. */
  const cekejNaStart = useCallback(async (gen: number) => {
    if (!nastaveniRef.current.mikrofon || !poslechDostupny) return;
    await zapniMereni();
    if (gen !== generace.current) return;
    setSlyseno('');
    await poslouchejPorad(gen, async (texty, hlasitost) => {
      if (texty.length === 0) return false;
      setSlyseno(texty[0]);
      if (!jeStart(texty)) return false;
      zapomenHrace();
      kalibruj(hlasitost);
      zacniRef.current();
      return true;
    });
  }, [poslouchejPorad]);
  const cekejNaStartRef = useRef(cekejNaStart);
  cekejNaStartRef.current = cekejNaStart;

  const vyberPostavicku = async () => {
    const gen = prerus();
    setFaze('uvod');
    setNalada('radost');
    setTimeout(() => gen === generace.current && setNalada('klid'), 1200);
    const vyzva = nastaveniRef.current.mikrofon && poslechDostupny ? ' Až ho budeš mít, řekni: hra!' : '';
    if (await mluv(postavicka.hlasky.uvod + vyzva, gen)) cekejNaStart(gen);
  };

  const zacni = async () => {
    const gen = prerus();
    if (nastaveniRef.current.mikrofon && poslechDostupny) zapniMereni();
    hra.current = new Hra(databaze);
    reklTuseni.current = false;
    setTah(null);
    setSlyseno('');
    setFaze('hra');
    setNalada('klid');
    if (await mluv(nahodne(postavicka.hlasky.zacatek), gen)) dalsiTah(gen);
  };

  const zacniRef = useRef(zacni);
  zacniRef.current = zacni;

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
      nastaveniRef.current.mikrofon = false;
      zrusPoslech.current();
      setPosloucha(false);
      setMikrofon(false);
    } else {
      setMikrofon(true);
      nastaveniRef.current.mikrofon = true;
      setUpozorneni('');
      if (faze === 'hra' && tah && !mluvi) poslouchejOdpoved(prerus(), tah.typ === 'tip');
      if ((faze === 'uvod' || faze === 'vyhra' || faze === 'vzdavam') && !mluvi) cekejNaStart(prerus());
    }
  };

  /** Ruční znovuspuštění poslechu tlačítkem 🎤. */
  const poslouchejZnovu = () => {
    setUpozorneni('');
    if (faze === 'hra') {
      if (tah) poslouchejOdpoved(prerus(), tah.typ === 'tip');
    } else cekejNaStart(prerus());
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

              {faze !== 'hra' && mikrofon && (posloucha || !mluvi) && (
                <div className="stav">
                  {posloucha ? (
                    <span className="posloucham">● Řekni „hra“ a začneme</span>
                  ) : (
                    <button className="odkaz" onClick={poslouchejZnovu}>
                      🎤 Poslouchat
                    </button>
                  )}
                  {slyseno && <span className="slyseno">🎧 „{slyseno}“</span>}
                </div>
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
                      <button className="odkaz" onClick={poslouchejZnovu}>
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
            <div>
              hlasitost hráče: {referencniHlasitost()?.toFixed(3) ?? '–'}, poslední: {spickaUseku().toFixed(3)}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
