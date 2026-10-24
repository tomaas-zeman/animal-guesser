import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, Oboci, Oko, Podstavec, Pusa, Tvaricka, useAnimace, type PostavickaProps } from './spolecne';
import { jeNapjata, jeSmutna, jeVesela } from './emoce';

const ZLUTA = '#ffd83a';
const HNEDA = '#5a3a1a';
const PIHY = '#9a6424';
const STOPKA = '#8a9a3a';
const CERVENA = '#e0245e';

/** Polovina tloušťky banánu uprostřed. */
const R = 0.36;
/** Osa banánu zespodu nahoru, prohnutá do písmene C. Začíná v kloubu, kolem kterého se celý banán naklání. */
const OSA = new THREE.CatmullRomCurve3(
  [
    [0.12, -0.04],
    [-0.06, 0.3],
    [-0.14, 0.7],
    [-0.1, 1.1],
    [0.06, 1.42],
    [0.3, 1.62],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
);
const DOPREDU = new THREE.Vector3(0, 0, 1);

/** Tloušťka podél banánu: uprostřed nejširší, ke koncům se zužuje. */
const polomer = (u: number) => R * Math.max(0.14, Math.pow(Math.sin(Math.PI * u), 0.55));

/** Bod na slupce: u podél banánu (0 dole, 1 nahoře), uhel kolem osy (π/2 je vpředu, kde má obličej). */
function naSlupce(u: number, uhel: number, odsazeni = 0) {
  const stred = OSA.getPointAt(u);
  const tecna = OSA.getTangentAt(u);
  const bok = new THREE.Vector3().crossVectors(DOPREDU, tecna).normalize();
  // pět hran jako u opravdového banánu, uprostřed obličeje je ploška
  const r = polomer(u) * (1 + 0.045 * Math.cos(5 * (uhel - Math.PI / 2) + Math.PI)) + odsazeni;
  const smer = bok.multiplyScalar(Math.cos(uhel)).addScaledVector(DOPREDU, Math.sin(uhel));
  return { bod: stred.addScaledVector(smer, r), smer };
}

function slupka(delka = 72, kolem = 48) {
  const pozice: number[] = [];
  const indexy: number[] = [];
  for (let i = 0; i <= delka; i++) {
    for (let j = 0; j <= kolem; j++) {
      const { bod } = naSlupce(i / delka, (j / kolem) * Math.PI * 2);
      pozice.push(bod.x, bod.y, bod.z);
    }
  }
  for (let i = 0; i < delka; i++) {
    for (let j = 0; j < kolem; j++) {
      const a = i * (kolem + 1) + j;
      const b = a + kolem + 1;
      indexy.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pozice, 3));
  g.setIndex(indexy);
  g.computeVertexNormals();
  return g;
}

/** Natočení kolem osy z tak, aby věc stála kolmo na banán v místě u. */
const naklonV = (u: number) => {
  const t = OSA.getTangentAt(u);
  return Math.atan2(-t.x, t.y);
};

/** Hnědá pihovatá tečka, kterou má každý pořádně zralý banán. */
function Piha({ u, uhel, r = 0.035 }: { u: number; uhel: number; r?: number }) {
  const { bod, smer } = naSlupce(u, uhel, -0.004);
  const q = new THREE.Quaternion().setFromUnitVectors(DOPREDU, smer);
  return (
    <mesh position={bod} quaternion={q} scale={[1, 0.8, 0.25]}>
      <sphereGeometry args={[r, 16, 12]} />
      <Mat barva={PIHY} lesk={0.3} />
    </mesh>
  );
}

/** Tenká ručička s bílou rukavičkou, otáčí se v rameni. */
function Ruka({ ruka, strana }: { ruka: React.RefObject<THREE.Group | null>; strana: -1 | 1 }) {
  const { bod } = naSlupce(0.4, strana === -1 ? 0 : Math.PI, -0.03);
  return (
    <group position={bod}>
      <group ref={ruka} rotation={[0, 0, strana * 0.45]}>
        <mesh position={[0, -0.17, 0]} castShadow>
          <capsuleGeometry args={[0.028, 0.3, 6, 12]} />
          <Mat barva={HNEDA} />
        </mesh>
        <Koule r={0.075} barva="#ffffff" position={[0, -0.36, 0.01]} scale={[1, 1.05, 0.85]} lesk={0.4} />
        <Koule r={0.032} barva="#ffffff" position={[strana * -0.06, -0.33, 0.03]} lesk={0.4} />
      </group>
    </group>
  );
}

/** Retro mikrofon na stojanu, banán je přece komik. */
function Mikrofon() {
  const chrom = <meshPhysicalMaterial color="#c9ced6" metalness={0.9} roughness={0.25} clearcoat={1} />;
  return (
    <group position={[-0.8, 0, 0.12]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 32]} />
        {chrom}
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.92, 12]} />
        {chrom}
      </mesh>
      <group position={[0, 0.96, 0.02]} rotation={[0.5, 0, 0]}>
        <mesh position={[0, -0.07, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.022, 0.16, 16]} />
          <Mat barva="#2b2b33" lesk={0.6} />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.065, 24, 20]} />
          <meshPhysicalMaterial color="#8d939c" metalness={0.7} roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
}

/** Banánová slupka na pódiu, aby bylo po čem uklouznout. */
function Slupka() {
  return (
    <group position={[0.68, 0.015, 0.42]} rotation={[0, 0.7, 0]}>
      {[0, 1, 2, 3].map((i) => {
        const u = (i / 4) * Math.PI * 2 + 0.3;
        return (
          <Koule
            key={i}
            r={0.07}
            barva={ZLUTA}
            position={[Math.cos(u) * 0.09, 0.012, Math.sin(u) * 0.09]}
            rotation={[0, -u, 0]}
            scale={[1.9, 0.22, 0.75]}
            glazura={0.3}
          />
        );
      })}
      <Koule r={0.05} barva={ZLUTA} position={[0, 0.03, 0]} scale={[1, 0.8, 1]} />
      <Koule r={0.022} barva={HNEDA} position={[0, 0.07, 0]} />
    </group>
  );
}

export function Banan(props: PostavickaProps) {
  const { telo, hlava, oci, pusa, usmev, oboci } = useAnimace(props);
  const levaRuka = useRef<THREE.Group>(null);
  const pravaRuka = useRef<THREE.Group>(null);
  const motylek = useRef<THREE.Group>(null);

  const tvar = useMemo(() => slupka(), []);
  const vrsek = useMemo(() => ({ bod: OSA.getPointAt(1), naklon: naklonV(1) }), []);
  const spodek = useMemo(() => OSA.getPointAt(0), []);
  const oblicej = useMemo(() => ({ bod: OSA.getPointAt(0.5), naklon: naklonV(0.5) }), []);
  const krk = useMemo(() => ({ bod: naSlupce(0.31, Math.PI / 2, 0.01).bod, naklon: naklonV(0.31) }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const n = props.nalada;
    // [zvednutí do strany, předpažení] pro levou a pravou ruku
    let l: [number, number] = [0.45 + Math.sin(t * 1.6) * 0.05, 0];
    let p: [number, number] = [0.45 + Math.sin(t * 1.6 + 1) * 0.05, 0];
    if (jeVesela(n)) {
      // ruce nad hlavou, mává jako na konci vystoupení
      l = [2.5 + Math.sin(t * 9) * 0.3, 0];
      p = [2.5 + Math.sin(t * 9 + Math.PI) * 0.3, 0];
    } else if (n === 'prekvapeni') {
      l = [1.35, -0.2];
      p = [1.35, -0.2];
    } else if (jeSmutna(n)) {
      l = [0.12, 0.1];
      p = [0.12, 0.1];
    } else if (n === 'premysli') {
      // jednou rukou se drbe na bradě
      l = [0.35, 0];
      p = [0.55, -1.25 + Math.sin(t * 3) * 0.06];
    } else if (jeNapjata(n)) {
      // ručičky spojené před sebou, napjatě je mne
      l = [0.25 + Math.sin(t * 10) * 0.04, -0.7];
      p = [0.25 - Math.sin(t * 10) * 0.04, -0.7];
    } else if (props.mluvi) {
      // gestikuluje jako vypravěč vtipů
      l = [0.6 + Math.sin(t * 4.5) * 0.35, -0.3];
      p = [0.9 + Math.sin(t * 3.7 + 1) * 0.45, -0.4];
    }
    const k = 0.14;
    for (const [ruka, [z, x], s] of [
      [levaRuka.current, l, -1],
      [pravaRuka.current, p, 1],
    ] as const) {
      if (!ruka) continue;
      ruka.rotation.z = THREE.MathUtils.lerp(ruka.rotation.z, s * z, k);
      ruka.rotation.x = THREE.MathUtils.lerp(ruka.rotation.x, x, k);
    }
    if (motylek.current) {
      // motýlek se při smíchu roztočí, jinak se jen pohupuje
      const cil = jeVesela(n) ? Math.sin(t * 12) * 0.35 : Math.sin(t * 2) * 0.05;
      motylek.current.rotation.z = THREE.MathUtils.lerp(motylek.current.rotation.z, krk.naklon + cil, 0.2);
    }
  });

  return (
    <>
      {/* malé dřevěné pódium s reflektorem */}
      <Podstavec barva="#d99a5b" okraj="#a8673a" lesk={0.35}>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
          <mesh key={x} position={[x, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.012, Math.sqrt(1.05 ** 2 - x * x) * 2]} />
            <meshBasicMaterial color="#a8673a" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        ))}
        <mesh position={[0, 0.004, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.62, 48]} />
          <meshBasicMaterial color="#fff3c0" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <Mikrofon />
        <Slupka />
      </Podstavec>

      <group ref={telo} position={[0, 0.02, 0]}>
        {/* nožičky v červených botaskách */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.08 + 0.1, 0, 0]}>
            <mesh position={[0, 0.22, 0]} castShadow>
              <capsuleGeometry args={[0.03, 0.26, 6, 12]} />
              <Mat barva={HNEDA} />
            </mesh>
            <Koule r={0.1} barva={CERVENA} position={[s * 0.02, 0.06, 0.05]} scale={[0.9, 0.62, 1.4]} glazura={0.5} />
            <Koule r={0.1} barva="#ffffff" position={[s * 0.02, 0.025, 0.05]} scale={[0.95, 0.25, 1.45]} />
          </group>
        ))}

        {/* celý banán se kolem nožiček naklání, kývá a ohýbá */}
        <group ref={hlava} position={[0, 0.36, 0]}>
          <mesh geometry={tvar} castShadow>
            <Mat barva={ZLUTA} lesk={0.45} glazura={0.35} />
          </mesh>
          {/* stopka nahoře a tmavá špička dole */}
          <group position={vrsek.bod} rotation={[0, 0, vrsek.naklon]}>
            <mesh position={[0, 0.07, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.06, 0.16, 16]} />
              <Mat barva={STOPKA} lesk={0.3} />
            </mesh>
            <mesh position={[0, 0.155, 0]}>
              <cylinderGeometry args={[0.05, 0.045, 0.03, 16]} />
              <Mat barva={HNEDA} lesk={0.2} />
            </mesh>
          </group>
          <Koule r={0.06} barva={HNEDA} position={spodek} scale={[1, 0.7, 1]} />

          {[
            [0.22, 0.4],
            [0.7, 0.15],
            [0.64, 2.7],
            [0.33, 2.95],
            [0.82, 1.05, 0.025],
            [0.5, 4.2],
            [0.28, 5.1],
            [0.75, 4.8],
            [0.16, 2.0, 0.025],
          ].map(([u, uhel, r]) => (
            <Piha key={`${u}-${uhel}`} u={u} uhel={uhel} r={r} />
          ))}

          {/* obličej sedí na přední plošce banánu */}
          <group position={oblicej.bod} rotation={[0, 0, oblicej.naklon]}>
            <group ref={oci} position={[0, 0.14, R - 0.05]}>
              <Oko pozice={[-0.13, 0, 0]} r={0.12} duhovka="#5a3a1a" />
              <Oko pozice={[0.13, 0, 0]} r={0.12} duhovka="#5a3a1a" />
            </group>
            <Oboci oboRef={oboci} y={0.32} z={R - 0.04} roztec={0.14} delka={0.09} tloustka={0.02} barva={HNEDA} sklon={0.15} />
            <Tvaricka pozice={[-0.22, -0.07, R - 0.08]} r={0.07} />
            <Tvaricka pozice={[0.22, -0.07, R - 0.08]} r={0.07} />
            <Pusa pusaRef={pusa} usmevRef={usmev} pozice={[0, -0.1, R - 0.01]} sirka={0.13} barva="#6a2a1a" />
          </group>

          {/* motýlek jako správný komik */}
          <group ref={motylek} position={krk.bod} rotation={[0, 0, krk.naklon]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.075, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]} scale={[1, 1, 0.45]} castShadow>
                <coneGeometry args={[0.065, 0.14, 24]} />
                <Mat barva={CERVENA} lesk={0.55} glazura={0.4} />
              </mesh>
            ))}
            <Koule r={0.035} barva={CERVENA} scale={[1, 1, 0.7]} lesk={0.55} />
            {[
              [-0.09, 0.025],
              [-0.07, -0.03],
              [0.08, 0.03],
              [0.1, -0.02],
            ].map(([x, y]) => (
              <mesh key={`${x}`} position={[x, y, 0.03]}>
                <sphereGeometry args={[0.009, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            ))}
          </group>

          <Ruka ruka={levaRuka} strana={-1} />
          <Ruka ruka={pravaRuka} strana={1} />
        </group>
      </group>
    </>
  );
}
