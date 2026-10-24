# Hádání zvířat

Webová hra pro děti: animovaná 3D postavička se česky ptá na otázky, ty odpovídáš
**ano / ne / nevím / může být** (hlasem nebo tlačítky) a ona hádá, jaké zvíře si myslíš.

Hraj na **https://tomaas-zeman.github.io/animal-guesser/**

## Jak to funguje

- **Databáze** [`src/data/zvirata.json`](src/data/zvirata.json): otázky a zvířata. U každého zvířete je
  pro vlastnost pravděpodobnost odpovědi „ano“ (0 až 1), chybějící vlastnost znamená 0.
  U skupin, kde to dává smysl, jsou konkrétní druhy (hadi: užovka, zmije, kobra, chřestýš, krajta,
  hroznýš, anakonda; kočkovité šelmy, medvědi, žraloci, velryby, papoušci, sovy, žáby…) a otázky,
  které je rozliší (kápě, chrastí, škrtí, chocholka, péřová ouška, žije v horách…).
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
- **Řeč** [`src/rec/`](src/rec): mluvení přes `speechSynthesis` (cs-CZ), poslech přes Web Speech API
  (Chrome, Edge, Safari). Tlačítka fungují vždy.
- **Postavičky** [`src/postavicky/`](src/postavicky): liška Lili, robot Robík, sova Soňa a žabák Kvak,
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
