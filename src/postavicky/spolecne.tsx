// Společné díly a animace pro všechny postavičky.
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { VYRAZY, jeNapjata, jeSmutna, jeVesela, type Nalada } from './emoce';

export type { Nalada } from './emoce';

export interface PostavickaProps {
  mluvi: boolean;
  nalada: Nalada;
}

const lerp = THREE.MathUtils.lerp;
const PLNA_OTOCKA = Math.PI * 2;

/**
 * Animace těla: dýchání, poskakování, natáčení hlavy podle nálady, mrkání,
 * pohled očí, obočí a pohyb pusy. Výraz pro každou náladu je v `VYRAZY`.
 * Vrací refy, které postavička připojí na své části.
 */
export function useAnimace({ mluvi, nalada }: PostavickaProps) {
  const telo = useRef<THREE.Group>(null);
  const hlava = useRef<THREE.Group>(null);
  const oci = useRef<THREE.Group>(null);
  const pusa = useRef<THREE.Object3D>(null);
  const usmev = useRef<THREE.Object3D>(null);
  const oboci = useRef<THREE.Group>(null);
  const dalsiMrknuti = useRef(2);
  const mrkaniDo = useRef(0);
  const pohled = useRef({ x: 0, y: 0, dalsi: 1 });
  // kdy se nálada naposledy změnila, kvůli jednorázovým pohybům (piruetka, leknutí)
  const zmena = useRef<{ nalada: Nalada | null; t: number }>({ nalada: null, t: 0 });

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const k = Math.min(1, dt * 6);
    const v = VYRAZY[nalada];
    if (zmena.current.nalada !== nalada) zmena.current = { nalada, t };
    const odZmeny = t - zmena.current.t;

    if (telo.current) {
      // při radosti skáče a při dopadu se trochu zplácne, jinak jen dýchá
      const skace = v.skok > 0;
      const rychlostSkoku = nalada === 'oslava' ? 7 : 6;
      const skok = skace ? Math.abs(Math.sin(t * rychlostSkoku)) : 0;
      // leknutí: krátce povyskočí
      const leknuti = nalada === 'prekvapeni' && odZmeny < 0.4 ? Math.sin((odZmeny / 0.4) * Math.PI) * 0.18 : 0;
      const y = skace ? skok * v.skok : leknuti + Math.sin(t * 2) * 0.03;
      telo.current.position.y = lerp(telo.current.position.y, y, skace || leknuti ? 1 : k);
      const zplacnuti = skace ? Math.pow(1 - skok, 6) * 0.14 : 0;
      // smutná postavička dýchá pomaleji a zhluboka (povzdech)
      const dech = jeSmutna(nalada) ? Math.sin(t * 1.3) * 0.028 : Math.sin(t * 2.2) * 0.018;
      const sy = 1 + dech - zplacnuti + (skace ? skok * 0.05 : 0);
      const sxz = 1 - dech * 0.6 + zplacnuti * 0.7;
      telo.current.scale.set(lerp(telo.current.scale.x, sxz, 0.5), lerp(telo.current.scale.y, sy, 0.5), lerp(telo.current.scale.z, sxz, 0.5));

      if (nalada === 'oslava' && odZmeny < 1.1) {
        // na oslavu se jednou dokola zatočí
        const f = odZmeny / 1.1;
        telo.current.rotation.y = (f * f * (3 - 2 * f)) * PLNA_OTOCKA;
      } else {
        if (telo.current.rotation.y > Math.PI) telo.current.rotation.y -= PLNA_OTOCKA;
        const rotY = skace ? Math.sin(t * 3) * 0.5 : Math.sin(t * 0.7) * 0.12;
        telo.current.rotation.y = lerp(telo.current.rotation.y, rotY, k);
      }
      telo.current.rotation.x = lerp(telo.current.rotation.x, v.sklon, k);
      const kolebani = nalada === 'premysli' ? Math.sin(t * 1.4) * 0.05 : Math.sin(t * 1.1) * 0.02;
      telo.current.rotation.z = lerp(telo.current.rotation.z, kolebani, k);
    }

    if (hlava.current) {
      let x = Math.sin(t * 1.3) * 0.04;
      let z = Math.sin(t * 0.9) * 0.05;
      if (v.hlava) {
        [x, z] = v.hlava;
        if (nalada === 'premysli') x += Math.sin(t * 1.5) * 0.05;
        if (nalada === 'zvedavost') z += Math.sin(t * 1.2) * 0.04;
      } else if (jeVesela(nalada)) {
        // radostné pokyvování
        x = Math.sin(t * 6) * 0.08;
      }
      if (v.chveni) z += Math.sin(t * 8) * v.chveni;
      if (mluvi && !jeSmutna(nalada)) x += Math.sin(t * 7) * 0.05;
      hlava.current.rotation.x = lerp(hlava.current.rotation.x, x, k);
      hlava.current.rotation.z = lerp(hlava.current.rotation.z, z, k);
    }

    if (oci.current) {
      if (t > dalsiMrknuti.current) {
        mrkaniDo.current = t + 0.13;
        // v napětí mrká častěji, při údivu skoro vůbec
        const mezera = jeNapjata(nalada) ? 1 + Math.random() * 1.5 : nalada === 'prekvapeni' ? 4 : 2 + Math.random() * 3;
        dalsiMrknuti.current = t + mezera;
      }
      const mrka = t < mrkaniDo.current;
      oci.current.scale.y = lerp(oci.current.scale.y, mrka ? 0.1 : v.oci, mrka ? 1 : k);

      // oči se občas rozhlédnou, při přemýšlení koukají nahoru do strany
      const p = pohled.current;
      if (t > p.dalsi) {
        const doKamery = Math.random() < 0.5;
        p.x = doKamery ? 0 : (Math.random() - 0.5) * 0.5;
        p.y = doKamery ? 0 : (Math.random() - 0.5) * 0.3;
        p.dalsi = t + 1 + Math.random() * 2.5;
      }
      const [px, py] = v.pohled ?? [p.x, p.y];
      oci.current.traverse((o) => {
        const r = o.userData.zrak as number | undefined;
        if (r === undefined) return;
        o.position.x = lerp(o.position.x, px * r * 0.45, Math.min(1, dt * 12));
        o.position.y = lerp(o.position.y, py * r * 0.45, Math.min(1, dt * 12));
      });
    }

    if (oboci.current) {
      const pohup = 0.02 + Math.abs(Math.sin(t * 3)) * 0.02;
      const [l, r] = v.oboci ?? (mluvi ? [[pohup, 0], [pohup, 0]] : [[0, 0], [0, 0]]);
      oboci.current.children.forEach((o, i) => {
        const [zvednuti, natoceni] = i === 0 ? l : r;
        const zaklad = (o.userData.y as number) ?? 0;
        o.position.y = lerp(o.position.y, zaklad + zvednuti, k);
        o.rotation.z = lerp(o.rotation.z, (i === 0 ? 1 : -1) * natoceni + (o.userData.rz ?? 0), k);
      });
    }

    const maUsmev = Boolean(usmev.current);
    if (pusa.current) {
      // postavička bez úsměvu má pusu pořád trochu otevřenou
      const vKlidu = maUsmev ? v.pusa : Math.max(v.pusa, v.usmev < 0 ? 0.12 : 0.2);
      // smutná mluví s menší pusou, veselá s větší
      const rozsah = jeSmutna(nalada) ? 0.55 : jeVesela(nalada) ? 1.1 : 0.75;
      const cil = mluvi ? 0.25 + rozsah * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 4.7)) : vKlidu;
      pusa.current.scale.y = lerp(pusa.current.scale.y, cil, Math.min(1, dt * 18));
      if (maUsmev) pusa.current.visible = pusa.current.scale.y > 0.06;
    }
    if (usmev.current) {
      // zavřená pusa je úsměv, při smutku se obrátí, při přemýšlení se narovná
      usmev.current.scale.y = lerp(usmev.current.scale.y, v.usmev, k);
      usmev.current.visible = !pusa.current || pusa.current.scale.y < 0.3;
    }
  });

  return { telo, hlava, oci, pusa, usmev, oboci };
}

/** Styl materiálu pro celou postavičku: srst je měkká a sametová. */
const StylMaterialu = createContext({ srst: false });

export function Styl({ srst, children }: { srst: boolean; children: ReactNode }) {
  return <StylMaterialu.Provider value={{ srst }}>{children}</StylMaterialu.Provider>;
}

export function Mat({
  barva,
  lesk = 0.35,
  zare,
  kov = 0,
  glazura = 0,
  pruhlednost,
}: {
  barva: string;
  lesk?: number;
  zare?: string;
  kov?: number;
  /** lesklá vrstva navrch, jako lak nebo mokrá kůže */
  glazura?: number;
  pruhlednost?: number;
}) {
  const { srst } = useContext(StylMaterialu);
  const odlesk = useMemo(() => new THREE.Color(barva).lerp(new THREE.Color('#ffffff'), 0.55), [barva]);
  return (
    <meshPhysicalMaterial
      color={barva}
      roughness={1 - lesk}
      metalness={kov}
      emissive={zare ?? '#000000'}
      emissiveIntensity={zare ? 1.4 : 0}
      sheen={srst && !zare ? 1 : 0}
      sheenColor={odlesk}
      sheenRoughness={0.45}
      clearcoat={glazura}
      clearcoatRoughness={0.15}
      transparent={pruhlednost !== undefined}
      opacity={pruhlednost ?? 1}
    />
  );
}

/** Kreslené oko: bělmo, barevná duhovka, velká zornička a dva odlesky. */
export function Oko({
  pozice,
  r = 0.13,
  duhovka = '#2b1d0e',
  belmo = '#ffffff',
}: {
  pozice: [number, number, number];
  r?: number;
  duhovka?: string;
  belmo?: string;
}) {
  return (
    <group position={pozice}>
      <mesh scale={[1, 1, 0.75]}>
        <sphereGeometry args={[r, 32, 32]} />
        <meshPhysicalMaterial color={belmo} roughness={0.3} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      {/* zornička se hýbe, podle userData.zrak ji posouvá animace */}
      <group userData={{ zrak: r }}>
        <mesh position={[0, 0, r * 0.52]} scale={[1, 1, 0.45]}>
          <sphereGeometry args={[r * 0.68, 32, 24]} />
          <meshPhysicalMaterial color={duhovka} roughness={0.35} clearcoat={1} clearcoatRoughness={0.05} />
        </mesh>
        <mesh position={[0, 0, r * 0.62]} scale={[1, 1, 0.4]}>
          <sphereGeometry args={[r * 0.45, 24, 20]} />
          <meshPhysicalMaterial color="#0b0710" roughness={0.2} clearcoat={1} clearcoatRoughness={0.02} />
        </mesh>
        <mesh position={[-r * 0.22, r * 0.26, r * 0.82]}>
          <sphereGeometry args={[r * 0.2, 16, 16]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <mesh position={[r * 0.24, -r * 0.2, r * 0.8]}>
          <sphereGeometry args={[r * 0.09, 12, 12]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Obočí nad očima, natáčí se podle nálady. Levé je první. */
export function Oboci({
  oboRef,
  y,
  z,
  roztec,
  delka = 0.12,
  tloustka = 0.022,
  barva = '#3a2418',
  sklon = 0,
  zare,
}: {
  oboRef: React.RefObject<THREE.Group | null>;
  y: number;
  z: number;
  roztec: number;
  delka?: number;
  tloustka?: number;
  barva?: string;
  /** základní natočení vnějších konců dolů */
  sklon?: number;
  zare?: string;
}) {
  return (
    <group ref={oboRef}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * roztec, y, z]} rotation={[0, 0, s * -sklon + Math.PI / 2]} userData={{ y, rz: s * -sklon + Math.PI / 2 }}>
          <capsuleGeometry args={[tloustka, delka, 6, 12]} />
          <Mat barva={barva} zare={zare} />
        </mesh>
      ))}
    </group>
  );
}

/** Pusa: zavřená je to úsměv, při mluvení se otvírá (škáluje se v ose y) a je vidět jazýček. */
export function Pusa({
  pusaRef,
  usmevRef,
  pozice,
  sirka = 0.16,
  barva = '#4a1420',
  jazyk = '#ff7a8a',
  natoceni = 0,
}: {
  pusaRef: React.RefObject<THREE.Object3D | null>;
  usmevRef?: React.RefObject<THREE.Object3D | null>;
  pozice: [number, number, number];
  sirka?: number;
  barva?: string;
  jazyk?: string;
  /** naklonění pusy dozadu, aby seděla na zakulacené tváři */
  natoceni?: number;
}) {
  return (
    <group position={pozice} rotation={[natoceni, 0, 0]}>
      <mesh ref={pusaRef as React.RefObject<THREE.Mesh>} scale={[1, 0.2, 0.45]}>
        <sphereGeometry args={[sirka, 24, 20]} />
        <Mat barva={barva} lesk={0.5} />
        <mesh position={[0, -sirka * 0.5, sirka * 0.15]} scale={[0.7, 0.45, 0.6]}>
          <sphereGeometry args={[sirka, 20, 16]} />
          <Mat barva={jazyk} lesk={0.6} />
        </mesh>
      </mesh>
      {usmevRef && (
        <group ref={usmevRef as React.RefObject<THREE.Group>}>
          <mesh position={[0, sirka * 0.55, sirka * 0.1]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[sirka * 0.6, Math.max(0.012, sirka * 0.11), 10, 32, Math.PI]} />
            <Mat barva={barva} lesk={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Růžová tvářička. */
export function Tvaricka({ pozice, r = 0.09, barva = '#ff8fa3' }: { pozice: [number, number, number]; r?: number; barva?: string }) {
  return (
    <mesh position={pozice} scale={[1.2, 0.75, 0.35]}>
      <sphereGeometry args={[r, 20, 16]} />
      <meshStandardMaterial color={barva} roughness={0.9} transparent opacity={0.75} depthWrite={false} />
    </mesh>
  );
}

export function Koule({
  r,
  barva,
  lesk,
  glazura,
  children,
  ...props
}: { r: number; barva: string; lesk?: number; glazura?: number; children?: ReactNode } & ThreeElements['mesh']) {
  return (
    <mesh castShadow {...props}>
      <sphereGeometry args={[r, 40, 32]} />
      <Mat barva={barva} lesk={lesk} glazura={glazura} />
      {children}
    </mesh>
  );
}

/** Kulatý podstavec, na kterém postavička stojí (vršek je v y = 0). */
export function Podstavec({
  barva,
  okraj,
  r = 1.05,
  vyska = 0.2,
  lesk = 0.2,
  children,
}: {
  barva: string;
  okraj: string;
  r?: number;
  vyska?: number;
  lesk?: number;
  children?: ReactNode;
}) {
  return (
    <group>
      <mesh position={[0, -vyska / 2, 0]} receiveShadow>
        <cylinderGeometry args={[r, r * 0.94, vyska, 64]} />
        <Mat barva={okraj} lesk={lesk} />
      </mesh>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[r, 64]} />
        <Mat barva={barva} lesk={lesk} />
      </mesh>
      <mesh position={[0, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <torusGeometry args={[r - 0.025, 0.03, 12, 64]} />
        <Mat barva={okraj} lesk={lesk} />
      </mesh>
      {children}
    </group>
  );
}
