import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, Oboci, Oko, Podstavec, Pusa, Styl, Tvaricka, useAnimace, type PostavickaProps } from './spolecne';
import { jeSmutna, jeVesela } from './emoce';

const HNEDA = '#9a6544';
const TMAVA = '#6e4428';
const SVETLA = '#f3e1c2';
const ORANZOVA = '#f6a53b';

export function Sova(props: PostavickaProps) {
  const { telo, hlava, oci, pusa, usmev, oboci } = useAnimace(props);
  const kridla = useRef<THREE.Group>(null);
  const strapec = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (kridla.current) {
      const mavani =
        jeVesela(props.nalada)
          ? 0.6 + Math.sin(t * 16) * 0.6
          : props.nalada === 'prekvapeni'
            ? 0.55
            : jeSmutna(props.nalada)
              ? 0.02
              : props.mluvi ? 0.12 + Math.sin(t * 5) * 0.08 : 0.06 + Math.sin(t * 2.2) * 0.02;
      kridla.current.children.forEach((k, i) => {
        k.rotation.z = (i === 0 ? -1 : 1) * mavani;
      });
    }
    if (strapec.current) strapec.current.rotation.z = Math.sin(t * 2.5) * 0.25;
  });

  return (
    <Styl srst>
      {/* pařez */}
      <Podstavec barva="#eac992" okraj="#7a5134" vyska={0.24}>
        {[0.3, 0.55, 0.8].map((r) => (
          <mesh key={r} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r, r + 0.025, 64]} />
            <Mat barva="#c99e66" />
          </mesh>
        ))}
        {/* hromádka knížek */}
        <group position={[0.68, 0, 0.3]} rotation={[0, -0.5, 0]}>
          {[
            ['#e5584f', 0.05, 0],
            ['#4f8fd9', 0.13, 0.2],
          ].map(([b, y, r]) => (
            <group key={b as string} position={[0, y as number, 0]} rotation={[0, r as number, 0]}>
              <RoundedBox args={[0.34, 0.08, 0.26]} radius={0.015} castShadow>
                <Mat barva={b as string} lesk={0.4} />
              </RoundedBox>
              <mesh position={[0.01, 0, 0]}>
                <boxGeometry args={[0.33, 0.06, 0.24]} />
                <Mat barva="#fff8e8" />
              </mesh>
            </group>
          ))}
        </group>
      </Podstavec>

      <group ref={telo}>
        {/* tělo */}
        <Koule r={0.62} barva={HNEDA} position={[0, 0.7, 0]} scale={[1, 1.12, 0.92]} />
        <Koule r={0.46} barva={SVETLA} position={[0, 0.62, 0.24]} scale={[1, 1.2, 0.7]} />
        {/* pírka na bříšku */}
        {[
          [-0.14, 0.82],
          [0.14, 0.82],
          [-0.24, 0.6],
          [0, 0.6],
          [0.24, 0.6],
          [-0.13, 0.38],
          [0.13, 0.38],
        ].map(([x, y]) => (
          <mesh key={`${x}${y}`} position={[x, y, 0.56 - Math.abs(x) * 0.35 - Math.abs(y - 0.6) * 0.25]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.055, 0.014, 8, 16, Math.PI]} />
            <Mat barva="#c99e66" />
          </mesh>
        ))}
        {/* křídla */}
        <group ref={kridla}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.56, 1.0, 0]}>
              <Koule r={0.28} barva={TMAVA} position={[s * 0.06, -0.3, 0]} scale={[0.42, 1.25, 0.9]} />
              {[-0.1, 0, 0.1].map((z) => (
                <Koule key={z} r={0.08} barva={TMAVA} position={[s * 0.06, -0.62, z]} scale={[0.5, 1.2, 0.8]} />
              ))}
            </group>
          ))}
        </group>
        {/* pařátky */}
        {[-0.2, 0.2].map((x) => (
          <group key={x} position={[x, 0.05, 0.36]}>
            {[-1, 0, 1].map((i) => (
              <Koule key={i} r={0.06} barva={ORANZOVA} position={[i * 0.06, 0, Math.abs(i) * -0.02]} scale={[0.9, 0.7, 1.5]} rotation={[0, i * 0.4, 0]} />
            ))}
          </group>
        ))}
        {/* hlava */}
        <group ref={hlava} position={[0, 1.5, 0]}>
          <Koule r={0.6} barva={HNEDA} scale={[1.18, 0.95, 0.98]} />
          {/* obličejový disk */}
          {[-0.25, 0.25].map((x) => (
            <Koule key={x} r={0.28} barva={SVETLA} position={[x, 0.02, 0.36]} scale={[1, 1.05, 0.55]} />
          ))}
          {/* ouška */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.48, 0.45, 0]} rotation={[0, 0, -s * 0.5]}>
              <mesh castShadow scale={[1, 1, 0.6]}>
                <coneGeometry args={[0.13, 0.36, 24]} />
                <Mat barva={HNEDA} />
              </mesh>
              <mesh position={[0, -0.03, 0.05]} scale={[1, 1, 0.4]}>
                <coneGeometry args={[0.07, 0.24, 16]} />
                <Mat barva={SVETLA} />
              </mesh>
            </group>
          ))}
          <group ref={oci} position={[0, 0.04, 0.47]}>
            <Oko pozice={[-0.25, 0, 0]} r={0.17} duhovka="#e8941e" />
            <Oko pozice={[0.25, 0, 0]} r={0.17} duhovka="#e8941e" />
          </group>
          <Oboci oboRef={oboci} y={0.3} z={0.48} roztec={0.24} delka={0.13} barva={TMAVA} sklon={-0.2} />
          {/* zobáček */}
          <mesh position={[0, -0.13, 0.6]} rotation={[Math.PI * 0.62, 0, 0]} castShadow>
            <coneGeometry args={[0.065, 0.18, 24]} />
            <Mat barva={ORANZOVA} lesk={0.6} glazura={0.6} />
          </mesh>
          <Pusa pusaRef={pusa} usmevRef={usmev} pozice={[0, -0.25, 0.53]} sirka={0.06} barva="#5a2b10" natoceni={-0.3} />
          <Tvaricka pozice={[-0.44, -0.15, 0.36]} />
          <Tvaricka pozice={[0.44, -0.15, 0.36]} />
          {/* brýle, protože je to chytrá sova */}
          {[-0.25, 0.25].map((x) => (
            <mesh key={x} position={[x, 0.04, 0.6]}>
              <torusGeometry args={[0.2, 0.02, 12, 48]} />
              <Mat barva="#c0392b" lesk={0.8} glazura={1} />
            </mesh>
          ))}
          <mesh position={[0, 0.07, 0.62]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.014, 0.08, 4, 8]} />
            <Mat barva="#c0392b" lesk={0.8} />
          </mesh>
          {/* studentská čepička */}
          <group position={[0, 0.55, -0.02]} rotation={[-0.15, 0, 0.12]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.22, 0.25, 0.14, 32]} />
              <Mat barva="#2f2a44" />
            </mesh>
            <RoundedBox args={[0.62, 0.035, 0.62]} radius={0.012} position={[0, 0.08, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <Mat barva="#2f2a44" lesk={0.3} />
            </RoundedBox>
            <Koule r={0.03} barva="#ffcf33" position={[0, 0.11, 0]} lesk={0.8} />
            <group ref={strapec} position={[0.3, 0.1, 0.12]}>
              <mesh position={[0, -0.1, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} />
                <Mat barva="#ffcf33" />
              </mesh>
              <mesh position={[0, -0.22, 0]}>
                <coneGeometry args={[0.035, 0.09, 12]} />
                <Mat barva="#ffcf33" />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </Styl>
  );
}
