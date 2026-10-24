# Hádání zvířat

Webová hra pro děti: animovaná 3D postavička se česky ptá na otázky, ty odpovídáš
**ano / ne / nevím / může být** (hlasem nebo tlačítky) a ona hádá, jaké zvíře si myslíš.

Hraj na **https://tomaas-zeman.github.io/animal-guesser/**

## Jak to funguje

- **Databáze** [`src/data/zvirata.json`](src/data/zvirata.json): otázky a zvířata. U každého zvířete je
  pro vlastnost pravděpodobnost odpovědi „ano“ (0 až 1), chybějící vlastnost znamená 0.
  Zhruba 250 zvířat, hlavně ta, která znají děti: naše ryby, ptáci, savci, plazi, obojživelníci a hmyz
  i exotická zvířata. U skupin, kde to dává smysl, jsou konkrétní druhy (hadi: užovka, zmije, kobra,
  chřestýš, krajta, hroznýš, anakonda; kočkovité šelmy, sovy, papoušci, žáby, ryby…) a otázky, které
  je rozliší (kápě, vousy, žije v řece, jí ryby, odlétá na zimu, plete pavučinu, je to brouk…).
- **Hádání** [`src/game/engine.ts`](src/game/engine.ts): místo pevného rozhodovacího stromu
  se pravděpodobnosti zvířat po každé odpovědi přepočítají (Bayes) a další otázka je ta s největším
  informačním ziskem. Jedna špatná odpověď proto zvíře nevyřadí, jen ho odsune. „Nevím“ nic nemění,
  „může být“ je slabé ano. Při špatném tipu se zvíře vyřadí a hra pokračuje.
- **Pravidla** (`pravidla` a `vylucne` v databázi): pták má peří, savec neklade vejce, ryba má ploutve…
  Co z odpovědí plyne, na to se postavička už neptá. Zvíře, které jasně odporuje některé odpovědi,
  netipuje, dokud jsou ve hře zvířata bez rozporu. Na co mají všechna zvířata, která sedí na odpovědi,
  stejnou jasnou odpověď (žije v moři → nežije v lese), na to se taky neptá.
- **Jisté otázky** (`jiste`): skupina, stavba těla, moře… Rozpor s nimi váží víc než s barvou nebo
  skákáním, takže po „je to obojživelník“ hra neodběhne k ještěrkám. Kde se děti pletou (delfín je
  savec, tučňák pták), mají zvířata u jistých otázek 0,15 až 0,85 místo 0 nebo 1.
- **Simulace** [`src/game/simulace.test.ts`](src/game/simulace.test.ts) odehraje stovky her s hráči,
  kteří se občas spletou, a hlídá úspěšnost, tipy v rozporu s odpověďmi a zbytečné otázky.
  [`databaze.test.ts`](src/game/databaze.test.ts) hlídá, že zvířata dodržují pravidla a dají se od sebe rozlišit.
- **Řeč** [`src/rec/`](src/rec): postavičky mluví předem namluvenými nahrávkami (viz níže), co nahrané není,
  řekne `speechSynthesis` (cs-CZ). Poslech přes Web Speech API (Chrome, Edge, Safari). Tlačítka fungují vždy.
- **Postavičky** [`src/postavicky/`](src/postavicky): liška Lili, robot Robík, sova Soňa, žabák Kvak, banán Bohouš a pokémon Vojtača,
  poskládaní z 3D tvarů v React Three Fiber (three.js).

## Vývoj

```bash
npm install
npm run dev        # vývojový server
npm test           # testy a simulace hádání
npm run build      # produkční build do dist/
```

Přidej `?debug=1` do adresy a uvidíš, která zvířata postavička zrovna podezírá.

**Přidání zvířete:** připiš řádek do `zvirata` v `src/data/zvirata.json` a spusť `npm test`.
Testy ukážou, jestli nové zvíře odporuje pravidlům a jestli se dá uhodnout a odlišit od ostatních.

Každý push do `master` spustí testy, build a nasazení na GitHub Pages.

## Hlasy postaviček

Postavičky mluví nahrávkami z `public/hlasy/<postava>/<id>.mp3`. Každá věta má vlastní soubor, jehož
jméno je otisk textu ([`src/hlasy/klice.ts`](src/hlasy/klice.ts)). Tipy se skládají ze začátku věty
(„Je to“), jména zvířete („liška?“) a případně konce („že jo?“), takže stačí ~750 nahrávek na postavičku
místo každé věty s každým zvířetem. Když nahrávka chybí, větu řekne syntéza prohlížeče.

- **Zdarma a automaticky:** workflow [Namluvit hlasy](.github/workflows/hlasy.yml) namluví chybějící věty
  neuronovými hlasy Microsoft Edge (Vlasta a Antonín, přes [edge-tts](https://github.com/rany2/edge-tts)) a commitne je.
  Spustí se sám, když se v `master` změní hlášky, otázky nebo nastavení hlasů, a jde spustit ručně
  v záložce Actions (i jen pro jednu postavičku, nebo znovu všechno po změně hlasu).
- **Výška a tempo hlasů:** [`scripts/hlasy-tts.json`](scripts/hlasy-tts.json).
- **Jiné služby:** `npm run hlasy:tts -- <edge|azure|google|elevenlabs>`; klíče se berou z proměnných
  prostředí (`AZURE_SPEECH_KEY` a `AZURE_SPEECH_REGION`, `GOOGLE_TTS_KEY`, `ELEVENLABS_API_KEY`), nikdy je necommituj.
  `--postava liska`, `--limit 10`, `--prepsat`, `--zkouska` (jen vypíše, co by namlouval).
- **Vlastním hlasem:** stránka [`?nahravani`](https://tomaas-zeman.github.io/animal-guesser/?nahravani)
  ukáže větu po větě, nahraješ ji mikrofonem (mezerník), přehraješ, a nakonec stáhneš ZIP, který se
  rozbalí do `public/`. Nahrávky v prohlížeči hra na tom zařízení používá hned. Ticho na začátku a konci se ořízne samo.
- `npm run hlasy:seznam` vypíše všechny věty jako `hlasy-seznam.json`, `npm run hlasy:index` zapíše
  `public/hlasy/index.json` (děje se samo před `dev` a `build`).
