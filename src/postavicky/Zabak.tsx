import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, Oko, Pusa, useAnimace, type PostavickaProps } from './spolecne';

const ZELENA = '#5cb85c';
const SVETLA = '#c8eaa0';
const ZLATA = '#ffcf33';

export function Zabak(props: PostavickaProps) {
  const { telo, hlava, oci, pusa } = useAnimace(props);
  const koruna = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (koruna.current) koruna.current.rotation.y = clock.elapsedTime * 0.8;
  });

  return (
    <group ref={telo}>
      {/* zadní nohy */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Koule r={0.3} barva={ZELENA} position={[s * 0.5, 0.25, -0.05]} scale={[0.9, 0.7, 1.3]} />
          <Koule r={0.16} barva={ZELENA} position={[s * 0.55, 0.05, 0.35]} scale={[1.5, 0.4, 1.2]} />
        </group>
      ))}
      {/* tělo */}
      <Koule r={0.62} barva={ZELENA} position={[0, 0.65, 0]} scale={[1.1, 0.95, 0.95]} />
      <Koule r={0.45} barva={SVETLA} position={[0, 0.55, 0.28]} scale={[1, 1, 0.6]} />
      {/* přední nožky */}
      {[-0.3, 0.3].map((x) => (
        <Koule key={x} r={0.12} barva={ZELENA} position={[x, 0.08, 0.45]} scale={[1.4, 0.5, 1.2]} />
      ))}
      {/* hlava */}
      <group ref={hlava} position={[0, 1.35, 0.05]}>
        <Koule r={0.55} barva={ZELENA} scale={[1.25, 0.8, 1]} />
        {/* oči nahoře na hlavě */}
        {[-0.28, 0.28].map((x) => (
          <Koule key={x} r={0.2} barva={ZELENA} position={[x, 0.35, 0.18]} />
        ))}
        <group ref={oci} position={[0, 0.38, 0.3]}>
          <Oko pozice={[-0.28, 0, 0]} r={0.15} duhovka="#14240a" />
          <Oko pozice={[0.28, 0, 0]} r={0.15} duhovka="#14240a" />
        </group>
        {/* tvářičky */}
        {[-0.45, 0.45].map((x) => (
          <Koule key={x} r={0.08} barva="#ff9aa8" position={[x, -0.05, 0.4]} scale={[1, 0.6, 0.4]} />
        ))}
        <Pusa pusaRef={pusa} pozice={[0, -0.12, 0.5]} sirka={0.26} barva="#c2355a" />
        {/* koruna */}
        <group ref={koruna} position={[0, 0.55, -0.05]}>
          <mesh>
            <cylinderGeometry args={[0.2, 0.22, 0.14, 20, 1, true]} />
            <meshStandardMaterial color={ZLATA} metalness={0.7} roughness={0.25} side={THREE.DoubleSide} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const u = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.sin(u) * 0.21, 0.13, Math.cos(u) * 0.21]}>
                <coneGeometry args={[0.05, 0.13, 6]} />
                <meshStandardMaterial color={ZLATA} metalness={0.7} roughness={0.25} />
              </mesh>
            );
          })}
          <mesh position={[0, 0, 0.215]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <Mat barva="#e0245e" lesk={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
