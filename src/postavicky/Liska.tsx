import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, Oboci, Oko, Podstavec, Pusa, Styl, Tvaricka, useAnimace, type PostavickaProps } from './spolecne';

const ORANZOVA = '#f07a2a';
const BILA = '#fff6ea';
const TMAVA = '#4a2a1c';
const RUZOVA = '#ffc2b4';

export function Liska(props: PostavickaProps) {
  const { telo, hlava, oci, pusa, usmev, oboci } = useAnimace(props);
  const ocas = useRef<THREE.Group>(null);
  const usi = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ocas.current) {
      const rychlost = props.nalada === 'radost' ? 14 : 3;
      ocas.current.rotation.y = Math.sin(t * rychlost) * 0.35;
      ocas.current.rotation.z = Math.sin(t * rychlost * 0.5) * 0.08;
    }
    if (usi.current) {
      // uši se občas zacukají, při smutku klesnou
      const cuk = Math.sin(t * 9) * Math.max(0, Math.sin(t * 0.8) - 0.9) * 2;
      usi.current.children.forEach((u, i) => {
        const s = i === 0 ? -1 : 1;
        const dolu = props.nalada === 'smutek' ? 0.5 : 0;
        u.rotation.z = THREE.MathUtils.lerp(u.rotation.z, -s * (0.32 + dolu) + s * cuk * 0.4, 0.15);
      });
    }
  });

  return (
    <Styl srst>
      <Podstavec barva="#8fd16a" okraj="#6a9e4c">
        {/* kytičky a houbička v trávě */}
        {[
          [-0.75, 0.35, '#ffffff'],
          [0.7, 0.45, '#ffd84f'],
          [0.45, -0.6, '#ff9ccf'],
        ].map(([x, z, b]) => (
          <group key={`${x}`} position={[x as number, 0, z as number]}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Koule
                key={i}
                r={0.045}
                barva={b as string}
                position={[Math.cos((i / 5) * Math.PI * 2) * 0.05, 0.03, Math.sin((i / 5) * Math.PI * 2) * 0.05]}
                scale={[1, 0.4, 1]}
              />
            ))}
            <Koule r={0.035} barva="#ffb43a" position={[0, 0.045, 0]} />
          </group>
        ))}
        <group position={[-0.62, 0, -0.55]}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.16, 16]} />
            <Mat barva="#fff3dc" />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <sphereGeometry args={[0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Mat barva="#e5483b" lesk={0.6} />
          </mesh>
          {[
            [0.05, 0.25, 0.06],
            [-0.06, 0.24, 0.04],
            [0, 0.27, -0.06],
          ].map(([x, y, z]) => (
            <Koule key={`${x}${z}`} r={0.022} barva="#ffffff" position={[x, y, z]} />
          ))}
        </group>
      </Podstavec>

      <group ref={telo}>
        {/* tělo */}
        <Koule r={0.5} barva={ORANZOVA} position={[0, 0.6, 0]} scale={[1, 1.12, 0.95]} />
        <Koule r={0.36} barva={BILA} position={[0, 0.55, 0.22]} scale={[1, 1.2, 0.8]} />
        {/* tlapky */}
        {[-0.22, 0.22].map((x) => (
          <Koule key={x} r={0.15} barva={TMAVA} position={[x, 0.1, 0.2]} scale={[1, 0.65, 1.3]} />
        ))}
        {[-1, 1].map((s) => (
          <Koule key={s} r={0.13} barva={TMAVA} position={[s * 0.36, 0.62, 0.3]} scale={[0.9, 1.2, 0.9]} rotation={[0, 0, s * 0.3]} />
        ))}
        {/* nadýchaný ocas */}
        <group ref={ocas} position={[0, 0.35, -0.42]}>
          <Koule r={0.22} barva={ORANZOVA} position={[0.12, 0.05, -0.15]} />
          <Koule r={0.3} barva={ORANZOVA} position={[0.3, 0.32, -0.3]} />
          <Koule r={0.27} barva={ORANZOVA} position={[0.42, 0.65, -0.3]} />
          <Koule r={0.2} barva={BILA} position={[0.46, 0.9, -0.24]} />
        </group>
        {/* hlava */}
        <group ref={hlava} position={[0, 1.45, 0]}>
          <Koule r={0.6} barva={ORANZOVA} scale={[1.14, 0.96, 0.98]} />
          {/* bílé lícní chmýří */}
          {[-1, 1].map((s) => (
            <Koule key={s} r={0.22} barva={BILA} position={[s * 0.27, -0.25, 0.3]} scale={[1.1, 0.72, 0.8]} />
          ))}
          {/* krátký kulatý čumáček */}
          <Koule r={0.2} barva={BILA} position={[0, -0.16, 0.48]} scale={[1.15, 0.85, 1]} />
          <Koule r={0.07} barva="#1a1010" position={[0, -0.08, 0.67]} scale={[1.35, 1, 1]} lesk={0.85} glazura={1} />
          {/* uši */}
          <group ref={usi}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.38, 0.46, -0.05]} rotation={[0, 0, -s * 0.32]} scale={1.15}>
                <mesh castShadow>
                  <coneGeometry args={[0.22, 0.52, 32]} />
                  <Mat barva={ORANZOVA} />
                </mesh>
                <mesh position={[0, -0.03, 0.09]} scale={[1, 1, 0.45]}>
                  <coneGeometry args={[0.14, 0.36, 24]} />
                  <Mat barva={RUZOVA} />
                </mesh>
                <mesh position={[0, 0.155, 0]}>
                  <coneGeometry args={[0.1, 0.215, 32]} />
                  <Mat barva={TMAVA} />
                </mesh>
              </group>
            ))}
          </group>
          <group ref={oci} position={[0, 0.06, 0.48]}>
            <Oko pozice={[-0.25, 0, 0]} r={0.15} duhovka="#7a4a1c" />
            <Oko pozice={[0.25, 0, 0]} r={0.15} duhovka="#7a4a1c" />
          </group>
          <Oboci oboRef={oboci} y={0.27} z={0.5} roztec={0.25} barva={TMAVA} sklon={0.15} />
          <Tvaricka pozice={[-0.42, -0.13, 0.4]} />
          <Tvaricka pozice={[0.42, -0.13, 0.4]} />
          <Pusa pusaRef={pusa} usmevRef={usmev} pozice={[0, -0.25, 0.63]} sirka={0.08} natoceni={-0.3} />
        </group>
      </group>
    </Styl>
  );
}
