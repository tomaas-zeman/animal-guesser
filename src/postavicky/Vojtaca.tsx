import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, Oboci, Oko, Podstavec, Pusa, useAnimace, type PostavickaProps } from './spolecne';
import { jeNapjata, jeSmutna, jeVesela } from './emoce';

const ZLUTA = '#ffd21f';
const BRICHO = '#ffe88a';
const HNEDA = '#6b3e1e';
const OBOCI = '#7a4a22';
const UCHO = '#ffc9a8';
const CERVENA = '#e8402a';
const MONTERKY = '#3d6fb6';
const GUMAKY = '#2f6b3a';
const KSILTOVKA = '#d7372f';
const SENO = '#e2b84a';
const DREVO = '#9a6a3a';

/** Kus koule, třeba lacl montérek, který přesně sedí na břiše. Úhly jsou jako u THREE.SphereGeometry. */
function Vysec({
  r,
  phi,
  theta,
  barva,
  lesk,
}: {
  r: number;
  phi: [number, number];
  theta: [number, number];
  barva: string;
  lesk?: number;
}) {
  return (
    <mesh castShadow>
      <sphereGeometry args={[r, 48, 32, phi[0], phi[1], theta[0], theta[1]]} />
      <Mat barva={barva} lesk={lesk} />
    </mesh>
  );
}

/** Velké ucho jako má fenek, zevnitř narůžovělé. Otáčí se u kořene, takže s ním jde stříhat. */
function Ucho({ ucho, strana }: { ucho: React.RefObject<THREE.Group | null>; strana: -1 | 1 }) {
  return (
    <group position={[strana * 0.26, 0.26, -0.05]}>
      <group ref={ucho} rotation={[0, 0, strana * -0.5]}>
        <mesh position={[0, 0.33, 0]} scale={[1, 1, 0.4]} castShadow>
          <coneGeometry args={[0.23, 0.7, 32]} />
          <Mat barva={ZLUTA} lesk={0.3} />
        </mesh>
        <mesh position={[0, 0.3, 0.05]} scale={[1, 1, 0.22]}>
          <coneGeometry args={[0.16, 0.55, 32]} />
          <Mat barva={UCHO} lesk={0.2} />
        </mesh>
      </group>
    </group>
  );
}

/** Vidle zapíchnuté do hlíny, bez nich vidlák není vidlák. */
function Vidle() {
  const kov = <meshPhysicalMaterial color="#9aa2ab" metalness={0.85} roughness={0.35} />;
  return (
    <group position={[0.78, 0, -0.2]} rotation={[0.08, 0, -0.16]}>
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.022, 1.05, 12]} />
        <Mat barva={DREVO} lesk={0.25} />
      </mesh>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.24, 0.03, 0.03]} />
        {kov}
      </mesh>
      {[-0.105, -0.035, 0.035, 0.105].map((x) => (
        <mesh key={x} position={[x, 0.13, 0]} castShadow>
          <cylinderGeometry args={[0.009, 0.004, 0.24, 8]} />
          {kov}
        </mesh>
      ))}
    </group>
  );
}

/** Balík sena, na kterém se dá po práci posedět. */
function Balik() {
  return (
    <group position={[-0.68, 0.19, 0.12]} rotation={[0, 0.5, Math.PI / 2]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.38, 32]} />
        <Mat barva={SENO} lesk={0.1} />
      </mesh>
      {[-0.1, 0.1].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.192, 0.008, 8, 40]} />
          <Mat barva="#b5482a" />
        </mesh>
      ))}
    </group>
  );
}

export function Vojtaca(props: PostavickaProps) {
  const { telo, hlava, oci, pusa, usmev, oboci } = useAnimace(props);
  const levaRuka = useRef<THREE.Group>(null);
  const pravaRuka = useRef<THREE.Group>(null);
  const leveUcho = useRef<THREE.Group>(null);
  const praveUcho = useRef<THREE.Group>(null);
  const steblo = useRef<THREE.Group>(null);
  const ocas = useRef<THREE.Group>(null);
  const n = props.nalada;
  // tvářičky jiskří, když má radost, je to přece pokémon
  const jiskri = jeVesela(n) ? '#ff6a3a' : undefined;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // [zvednutí do strany, předpažení] pro levou a pravou ruku
    let l: [number, number] = [0.35 + Math.sin(t * 1.4) * 0.04, 0];
    let p: [number, number] = [0.35 + Math.sin(t * 1.4 + 1) * 0.04, 0];
    if (jeVesela(n)) {
      // pěsti nad hlavou jako po vyhraném přetahování lanem
      l = [2.6 + Math.sin(t * 8) * 0.25, 0];
      p = [2.6 + Math.sin(t * 8 + Math.PI) * 0.25, 0];
    } else if (n === 'prekvapeni') {
      l = [1.5, -0.3];
      p = [1.5, -0.3];
    } else if (jeSmutna(n)) {
      l = [0.08, 0.15];
      p = [0.08, 0.15];
    } else if (n === 'dotcena') {
      // ruce založené na prsou, uražený sedlák
      l = [0.15, -1.45];
      p = [0.25, -1.35];
    } else if (n === 'premysli') {
      // drbe se pod čepicí
      l = [0.3, 0];
      p = [2.7 + Math.sin(t * 6) * 0.08, -0.5];
    } else if (jeNapjata(n)) {
      // nervózně si mne ruce
      l = [0.2 + Math.sin(t * 10) * 0.04, -0.85];
      p = [0.2 - Math.sin(t * 10) * 0.04, -0.85];
    } else if (props.mluvi) {
      // mává rukama, jako když vysvětluje sousedovi přes plot
      l = [0.5 + Math.sin(t * 4) * 0.35, -0.25];
      p = [0.8 + Math.sin(t * 3.3 + 1) * 0.5, -0.45];
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
    // uši: při údivu se napřímí, ve smutku svěsí, při mluvení sebou cukají
    const rozevreni = n === 'prekvapeni' ? 0.25 : jeSmutna(n) ? 1.0 : n === 'dotcena' ? 0.75 : 0.5;
    const cuk = props.mluvi ? Math.sin(t * 9) * 0.06 : Math.max(0, Math.sin(t * 0.9) - 0.97) * 3;
    for (const [ucho, s] of [
      [leveUcho.current, -1],
      [praveUcho.current, 1],
    ] as const) {
      if (!ucho) continue;
      ucho.rotation.z = THREE.MathUtils.lerp(ucho.rotation.z, s * -(rozevreni + cuk), 0.15);
    }
    if (steblo.current) {
      // stéblo v puse se pohupuje, při přemýšlení se s ním žvýká
      const rychlost = n === 'premysli' ? 6 : 1.5;
      steblo.current.rotation.z = -1.0 + Math.sin(t * rychlost) * (n === 'premysli' ? 0.2 : 0.06);
    }
    if (ocas.current) {
      const vrteni = jeVesela(n) ? Math.sin(t * 12) * 0.35 : Math.sin(t * 1.8) * 0.08;
      ocas.current.rotation.z = THREE.MathUtils.lerp(ocas.current.rotation.z, vrteni, 0.2);
    }
  });

  return (
    <>
      {/* kus pole: tráva, balík sena a vidle */}
      <Podstavec barva="#8cc152" okraj="#7a5230" lesk={0.15}>
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.0, 64]} />
          <Mat barva="#8cc152" lesk={0.15} />
        </mesh>
        <Balik />
        <Vidle />
        {[
          [-0.4, 0.62],
          [0.45, 0.6],
          [-0.82, -0.3],
          [0.25, -0.75],
          [0.82, 0.35],
        ].map(([x, z]) => (
          <group key={`${x}`} position={[x, 0, z]}>
            {[-1, 0, 1].map((i) => (
              <mesh key={i} position={[i * 0.025, 0.05, 0]} rotation={[0, 0, i * -0.3]}>
                <coneGeometry args={[0.018, 0.12, 6]} />
                <Mat barva="#5f9e3a" />
              </mesh>
            ))}
          </group>
        ))}
        {/* rozházená stébla sena */}
        {[
          [-0.3, 0.45, 0.4],
          [0.15, 0.7, -0.6],
          [-0.55, 0.5, 1.4],
          [0.55, 0.15, 2.2],
        ].map(([x, z, r]) => (
          <mesh key={`${x}`} position={[x, 0.006, z]} rotation={[Math.PI / 2, 0, r]}>
            <cylinderGeometry args={[0.006, 0.006, 0.22, 6]} />
            <Mat barva={SENO} />
          </mesh>
        ))}
      </Podstavec>

      <group ref={telo} position={[0, 0.02, 0]}>
        {/* gumáky */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.2, 0, 0.04]}>
            <mesh position={[0, 0.13, 0]} castShadow>
              <cylinderGeometry args={[0.095, 0.1, 0.24, 24]} />
              <Mat barva={GUMAKY} lesk={0.6} glazura={0.6} />
            </mesh>
            <Koule r={0.1} barva={GUMAKY} position={[0, 0.045, 0.07]} scale={[1, 0.5, 1.4]} glazura={0.6} lesk={0.6} />
            <mesh position={[0, 0.248, 0]}>
              <torusGeometry args={[0.095, 0.014, 8, 24]} />
              <Mat barva={GUMAKY} lesk={0.6} />
            </mesh>
          </group>
        ))}

        {/* ocas jako blesk, s hnědým kořenem */}
        <group ref={ocas} position={[0.18, 0.4, -0.4]} rotation={[0, 0.3, 0]}>
          <mesh position={[0.08, 0.06, 0]} rotation={[0, 0, -0.9]} castShadow>
            <boxGeometry args={[0.07, 0.2, 0.05]} />
            <Mat barva={HNEDA} />
          </mesh>
          <mesh position={[0.18, 0.2, 0]} rotation={[0, 0, 0.5]} castShadow>
            <boxGeometry args={[0.1, 0.26, 0.05]} />
            <Mat barva={ZLUTA} />
          </mesh>
          <mesh position={[0.3, 0.38, 0]} rotation={[0, 0, -0.9]} castShadow>
            <boxGeometry args={[0.14, 0.32, 0.05]} />
            <Mat barva={ZLUTA} />
          </mesh>
        </group>

        {/* buclaté tělo v montérkách s laclem a kšandami */}
        <group position={[0, 0.55, 0]} scale={[1.05, 0.95, 0.95]}>
          <Koule r={0.5} barva={ZLUTA} lesk={0.3} />
          <Vysec r={0.506} phi={[0, Math.PI * 2]} theta={[Math.PI * 0.55, Math.PI * 0.45]} barva={MONTERKY} lesk={0.2} />
          <Vysec r={0.507} phi={[Math.PI / 2 - 0.42, 0.84]} theta={[Math.PI * 0.33, Math.PI * 0.24]} barva={MONTERKY} lesk={0.2} />
          {[-1, 1].map((s) => (
            <Vysec key={s} r={0.507} phi={[Math.PI / 2 + s * 0.36 - 0.05, 0.1]} theta={[Math.PI * 0.08, Math.PI * 0.27]} barva={MONTERKY} lesk={0.2} />
          ))}
          {/* knoflíky na kšandách */}
          {[-1, 1].map((s) => (
            <Koule key={s} r={0.028} barva="#d9c25a" position={[s * 0.16, 0.13, 0.47]} lesk={0.8} />
          ))}
        </group>

        {/* ruce */}
        {(
          [
            [levaRuka, -1],
            [pravaRuka, 1],
          ] as const
        ).map(([ruka, s]) => (
          <group key={s} position={[s * 0.44, 0.74, 0.02]}>
            <group ref={ruka} rotation={[0, 0, s * 0.35]}>
              <mesh position={[0, -0.14, 0]} castShadow>
                <capsuleGeometry args={[0.075, 0.18, 8, 16]} />
                <Mat barva={ZLUTA} lesk={0.3} />
              </mesh>
              <Koule r={0.09} barva={ZLUTA} position={[0, -0.3, 0.01]} lesk={0.3} />
            </group>
          </group>
        ))}

        {/* hlava se natáčí kolem krku */}
        <group ref={hlava} position={[0, 0.98, 0.02]}>
          <group position={[0, 0.38, 0]}>
            <Koule r={0.48} barva={ZLUTA} scale={[1.05, 0.96, 1]} lesk={0.3} />
            <Ucho ucho={leveUcho} strana={-1} />
            <Ucho ucho={praveUcho} strana={1} />

            <group ref={oci} position={[0, 0.07, 0.4]}>
              <Oko pozice={[-0.16, 0, 0]} r={0.1} duhovka="#3a2412" />
              <Oko pozice={[0.16, 0, 0]} r={0.1} duhovka="#3a2412" />
            </group>
            {/* huňaté obočí */}
            <Oboci oboRef={oboci} y={0.2} z={0.41} roztec={0.16} delka={0.1} tloustka={0.036} barva={OBOCI} sklon={-0.2} />

            {/* elektrické tvářičky */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.31, -0.08, 0.35]} rotation={[0, s * 0.72, 0]} scale={[1, 1, 0.35]}>
                <sphereGeometry args={[0.085, 24, 16]} />
                <Mat barva={CERVENA} lesk={0.4} zare={jiskri} />
              </mesh>
            ))}

            {/* nos */}
            <Koule r={0.045} barva={HNEDA} position={[0, -0.01, 0.475]} scale={[1.2, 0.9, 1]} lesk={0.6} />

            <Pusa pusaRef={pusa} usmevRef={usmev} pozice={[0, -0.16, 0.44]} sirka={0.12} barva="#6a2418" natoceni={-0.4} />

            {/* stéblo trávy v koutku pusy */}
            <group ref={steblo} position={[0.1, -0.16, 0.44]} rotation={[0.3, 0, -1.0]}>
              <mesh position={[0, -0.14, 0]}>
                <cylinderGeometry args={[0.006, 0.008, 0.28, 6]} />
                <Mat barva="#d8c25a" />
              </mesh>
            </group>

            {/* kšiltovka */}
            <group position={[0, 0.3, 0.02]} rotation={[-0.12, 0, 0]}>
              <mesh castShadow scale={[1.04, 0.62, 1.04]}>
                <sphereGeometry args={[0.33, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Mat barva={KSILTOVKA} lesk={0.25} />
              </mesh>
              <mesh position={[0, 0.0, 0.2]} rotation={[0.4, 0, 0]} scale={[1, 1, 1.3]} castShadow>
                <cylinderGeometry args={[0.28, 0.28, 0.03, 32, 1, false, -Math.PI / 2, Math.PI]} />
                <Mat barva={KSILTOVKA} lesk={0.25} />
              </mesh>
              <Koule r={0.03} barva={KSILTOVKA} position={[0, 0.205, 0]} lesk={0.25} />
              {/* bílý štítek vpředu */}
              <mesh position={[0, 0.08, 0.315]} rotation={[-0.25, 0, 0]} scale={[1, 0.7, 0.2]}>
                <sphereGeometry args={[0.08, 20, 16]} />
                <Mat barva="#ffffff" lesk={0.3} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}
