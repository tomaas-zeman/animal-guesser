import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, useAnimace, type PostavickaProps } from './spolecne';

const KOV = '#8fb3d9';
const TMAVY = '#28354a';
const SVETLO = '#4ff0ff';

export function Robot(props: PostavickaProps) {
  const { telo, hlava, oci, pusa } = useAnimace(props);
  const anteny = useRef<THREE.MeshStandardMaterial>(null);
  const ruce = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (anteny.current) {
      const rychlost = props.nalada === 'premysli' ? 10 : 2;
      anteny.current.emissiveIntensity = 0.6 + 0.6 * Math.sin(t * rychlost);
    }
    if (ruce.current) {
      ruce.current.children.forEach((ruka, i) => {
        const s = i === 0 ? -1 : 1;
        const zvednuti = props.nalada === 'radost' ? 2.4 + Math.sin(t * 10 + i) * 0.4 : 0;
        ruka.rotation.z = s * (0.15 + zvednuti);
        ruka.rotation.x = props.mluvi && props.nalada !== 'radost' ? Math.sin(t * 4 + i) * 0.25 : 0;
      });
    }
  });

  return (
    <group ref={telo}>
      {/* nohy */}
      {[-0.25, 0.25].map((x) => (
        <group key={x} position={[x, 0.25, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.4, 16]} />
            <Mat barva={TMAVY} />
          </mesh>
          <RoundedBox args={[0.3, 0.12, 0.4]} radius={0.05} position={[0, -0.2, 0.05]} castShadow>
            <Mat barva={KOV} />
          </RoundedBox>
        </group>
      ))}
      {/* trup */}
      <RoundedBox args={[1.1, 0.95, 0.75]} radius={0.18} position={[0, 0.95, 0]} castShadow>
        <Mat barva={KOV} lesk={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.55, 0.4, 0.05]} radius={0.05} position={[0, 0.98, 0.38]}>
        <Mat barva={TMAVY} />
      </RoundedBox>
      {['#ff5d5d', '#ffd84f', '#5dff8a'].map((b, i) => (
        <Koule key={b} r={0.05} barva={b} position={[-0.14 + i * 0.14, 1.02, 0.42]}>
          <Mat barva={b} zare={b} />
        </Koule>
      ))}
      {/* ruce */}
      <group ref={ruce}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.62, 1.25, 0]}>
            <mesh castShadow position={[0, -0.3, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.6, 12]} />
              <Mat barva={TMAVY} />
            </mesh>
            <Koule r={0.13} barva={KOV} position={[0, -0.62, 0]} />
          </group>
        ))}
      </group>
      {/* hlava */}
      <group ref={hlava} position={[0, 1.78, 0]}>
        <RoundedBox args={[0.95, 0.72, 0.75]} radius={0.16} castShadow>
          <Mat barva={KOV} lesk={0.6} />
        </RoundedBox>
        <RoundedBox args={[0.78, 0.52, 0.05]} radius={0.08} position={[0, 0, 0.37]}>
          <Mat barva={TMAVY} lesk={0.8} />
        </RoundedBox>
        <group ref={oci} position={[0, 0.07, 0.41]}>
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <Mat barva={SVETLO} zare={SVETLO} />
            </mesh>
          ))}
        </group>
        <mesh ref={pusa} position={[0, -0.14, 0.41]} scale={[1, 0.2, 1]}>
          <boxGeometry args={[0.3, 0.12, 0.02]} />
          <Mat barva={SVETLO} zare={SVETLO} />
        </mesh>
        {/* uši a anténa */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.1, 20]} />
            <Mat barva={TMAVY} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
          <Mat barva={TMAVY} />
        </mesh>
        <mesh position={[0, 0.68, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial ref={anteny} color="#ff4a4a" emissive="#ff2020" emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  );
}
