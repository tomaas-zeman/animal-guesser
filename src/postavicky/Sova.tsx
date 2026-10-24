import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, Oko, Pusa, useAnimace, type PostavickaProps } from './spolecne';

const HNEDA = '#8a5a3c';
const SVETLA = '#e9d3b0';
const ORANZOVA = '#f2a03d';

export function Sova(props: PostavickaProps) {
  const { telo, hlava, oci, pusa } = useAnimace(props);
  const kridla = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!kridla.current) return;
    const t = clock.elapsedTime;
    const mavani = props.nalada === 'radost' ? 0.6 + Math.sin(t * 16) * 0.6 : props.mluvi ? 0.1 + Math.sin(t * 5) * 0.08 : 0.05;
    kridla.current.children.forEach((k, i) => {
      k.rotation.z = (i === 0 ? -1 : 1) * mavani;
    });
  });

  return (
    <group ref={telo}>
      {/* tělo */}
      <Koule r={0.7} barva={HNEDA} position={[0, 0.85, 0]} scale={[1, 1.15, 0.9]} />
      <Koule r={0.5} barva={SVETLA} position={[0, 0.75, 0.3]} scale={[1, 1.25, 0.6]} />
      {/* pírka na bříšku */}
      {[
        [-0.15, 0.95],
        [0.15, 0.95],
        [0, 0.75],
        [-0.2, 0.6],
        [0.2, 0.6],
      ].map(([x, y]) => (
        <mesh key={`${x}${y}`} position={[x, y, 0.6]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.06, 0.1, 3]} />
          <Mat barva={HNEDA} />
        </mesh>
      ))}
      {/* křídla */}
      <group ref={kridla}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.62, 1.2, 0]}>
            <Koule r={0.3} barva="#6e4428" position={[s * 0.08, -0.35, 0]} scale={[0.45, 1.3, 0.9]} />
          </group>
        ))}
      </group>
      {/* pařátky */}
      {[-0.22, 0.22].map((x) => (
        <Koule key={x} r={0.11} barva={ORANZOVA} position={[x, 0.08, 0.3]} scale={[1.3, 0.6, 1.2]} />
      ))}
      {/* hlava */}
      <group ref={hlava} position={[0, 1.75, 0]}>
        <Koule r={0.55} barva={HNEDA} scale={[1.15, 0.95, 1]} />
        {/* obličejové disky */}
        {[-0.24, 0.24].map((x) => (
          <Koule key={x} r={0.25} barva={SVETLA} position={[x, 0.03, 0.36]} scale={[1, 1, 0.5]} />
        ))}
        {/* ouška */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.4, 0.5, 0]} rotation={[0, 0, -s * 0.4]} castShadow>
            <coneGeometry args={[0.12, 0.35, 5]} />
            <Mat barva={HNEDA} />
          </mesh>
        ))}
        <group ref={oci} position={[0, 0.05, 0.44]}>
          <Oko pozice={[-0.24, 0, 0]} r={0.16} duhovka="#1b1205" belmo="#ffd75e" />
          <Oko pozice={[0.24, 0, 0]} r={0.16} duhovka="#1b1205" belmo="#ffd75e" />
        </group>
        {/* zobák */}
        <mesh position={[0, -0.13, 0.56]} rotation={[Math.PI * 0.6, 0, 0]}>
          <coneGeometry args={[0.07, 0.2, 12]} />
          <Mat barva={ORANZOVA} />
        </mesh>
        <Pusa pusaRef={pusa} pozice={[0, -0.27, 0.5]} sirka={0.07} barva="#5a2b10" />
        {/* brýle, protože je to chytrá sova */}
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, 0.05, 0.58]}>
            <torusGeometry args={[0.19, 0.022, 10, 32]} />
            <Mat barva="#2d2d2d" lesk={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0.07, 0.6]}>
          <boxGeometry args={[0.1, 0.03, 0.02]} />
          <Mat barva="#2d2d2d" />
        </mesh>
      </group>
    </group>
  );
}
