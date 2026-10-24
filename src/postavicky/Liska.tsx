import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, Oko, Pusa, useAnimace, type PostavickaProps } from './spolecne';

const ORANZOVA = '#e8762b';
const BILA = '#fff3e4';
const TMAVA = '#3a2418';

export function Liska(props: PostavickaProps) {
  const { telo, hlava, oci, pusa } = useAnimace(props);
  const ocas = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ocas.current) return;
    const rychlost = props.nalada === 'radost' ? 14 : 3;
    ocas.current.rotation.y = Math.sin(clock.elapsedTime * rychlost) * 0.35;
  });

  return (
    <group ref={telo}>
      {/* tělo */}
      <Koule r={0.62} barva={ORANZOVA} position={[0, 0.75, 0]} scale={[1, 1.1, 0.9]} />
      <Koule r={0.42} barva={BILA} position={[0, 0.7, 0.3]} scale={[1, 1.2, 0.7]} />
      {/* tlapky */}
      {[-0.28, 0.28].map((x) => (
        <Koule key={x} r={0.16} barva={TMAVA} position={[x, 0.12, 0.25]} scale={[1, 0.7, 1.3]} />
      ))}
      {[-0.55, 0.55].map((x) => (
        <Koule key={x} r={0.14} barva={TMAVA} position={[x, 0.75, 0.15]} />
      ))}
      {/* ocas */}
      <group ref={ocas} position={[0, 0.45, -0.5]}>
        <Koule r={0.3} barva={ORANZOVA} position={[0.15, 0.25, -0.35]} scale={[0.8, 0.8, 1.6]} rotation={[0.7, 0, 0]} />
        <Koule r={0.18} barva={BILA} position={[0.2, 0.62, -0.72]} />
      </group>
      {/* hlava */}
      <group ref={hlava} position={[0, 1.65, 0]}>
        <Koule r={0.52} barva={ORANZOVA} scale={[1.1, 1, 1]} />
        <Koule r={0.24} barva={BILA} position={[-0.2, -0.2, 0.3]} scale={[1, 0.8, 0.9]} />
        <Koule r={0.24} barva={BILA} position={[0.2, -0.2, 0.3]} scale={[1, 0.8, 0.9]} />
        {/* čumák */}
        <mesh castShadow position={[0, -0.1, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.17, 0.36, 24]} />
          <Mat barva={BILA} />
        </mesh>
        <Koule r={0.07} barva="#1a1010" position={[0, -0.1, 0.74]} />
        {/* uši */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.32, 0.45, -0.02]} rotation={[0, 0, -s * 0.35]}>
            <mesh castShadow>
              <coneGeometry args={[0.18, 0.45, 4]} />
              <Mat barva={ORANZOVA} />
            </mesh>
            <mesh position={[0, 0.15, 0.02]}>
              <coneGeometry args={[0.08, 0.18, 4]} />
              <Mat barva={TMAVA} />
            </mesh>
          </group>
        ))}
        <group ref={oci} position={[0, 0.1, 0.5]}>
          <Oko pozice={[-0.2, 0, 0]} r={0.13} duhovka="#3b2a10" />
          <Oko pozice={[0.2, 0, 0]} r={0.13} duhovka="#3b2a10" />
        </group>
        <Pusa pusaRef={pusa} pozice={[0, -0.3, 0.52]} sirka={0.1} />
      </group>
    </group>
  );
}
