import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, Oboci, Oko, Podstavec, Pusa, Tvaricka, useAnimace, type PostavickaProps } from './spolecne';

const ZELENA = '#6cc75a';
const TMAVA = '#4fa646';
const SVETLA = '#e2f5b8';
const ZLATA = '#ffcf33';

/** Žabí nožka se třemi prstíky. */
function Chodidlo({ pozice, natoceni }: { pozice: [number, number, number]; natoceni: number }) {
  return (
    <group position={pozice} rotation={[0, natoceni, 0]}>
      {[-1, 0, 1].map((i) => (
        <group key={i} rotation={[0, i * 0.45, 0]}>
          <Koule r={0.05} barva={ZELENA} position={[0, 0, 0.1]} scale={[0.8, 0.6, 2.2]} glazura={0.5} />
          <Koule r={0.045} barva={ZELENA} position={[0, 0, 0.2]} glazura={0.5} />
        </group>
      ))}
    </group>
  );
}

export function Zabak(props: PostavickaProps) {
  const { telo, hlava, oci, pusa, usmev, oboci } = useAnimace(props);
  const koruna = useRef<THREE.Group>(null);
  const vlnky = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (koruna.current) {
      // korunka se jen lehce kymácí, při radosti poskočí
      koruna.current.rotation.z = 0.15 + Math.sin(t * 2.3) * 0.06;
      koruna.current.position.y = 0.48 + (props.nalada === 'radost' ? Math.abs(Math.sin(t * 6 + 0.6)) * 0.06 : 0);
    }
    if (vlnky.current) {
      vlnky.current.children.forEach((v, i) => {
        const f = (t * 0.35 + i / 3) % 1;
        v.scale.setScalar(0.4 + f * 0.6);
        ((v as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - f) * 0.6;
      });
    }
  });

  return (
    <>
      {/* rybníček s leknínem */}
      <Podstavec barva="#7fd0ea" okraj="#5f9e57" lesk={0.85}>
        <group ref={vlnky} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <ringGeometry args={[0.95, 0.98, 64]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.5} depthWrite={false} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, 0.012, 0.05]} rotation={[-Math.PI / 2, 0, 0.6]} receiveShadow>
          <circleGeometry args={[0.72, 48, 0.25, Math.PI * 2 - 0.5]} />
          <Mat barva="#4fae4a" lesk={0.6} glazura={0.6} />
        </mesh>
        {/* leknínový květ */}
        <group position={[-0.72, 0.02, 0.38]}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const u = (i / 6) * Math.PI * 2;
            return (
              <Koule
                key={i}
                r={0.07}
                barva="#ffb6d1"
                position={[Math.cos(u) * 0.06, 0.05, Math.sin(u) * 0.06]}
                rotation={[0, -u, 0.6]}
                scale={[1.5, 0.5, 0.8]}
              />
            );
          })}
          <Koule r={0.04} barva="#ffd84f" position={[0, 0.08, 0]} />
        </group>
      </Podstavec>

      <group ref={telo} position={[0, 0.02, 0]}>
        {/* zadní stehýnka */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Koule r={0.28} barva={ZELENA} position={[s * 0.46, 0.22, -0.02]} scale={[0.9, 0.75, 1.25]} glazura={0.4} />
            <Chodidlo pozice={[s * 0.52, 0.03, 0.22]} natoceni={s * 0.4} />
          </group>
        ))}
        {/* tělo */}
        <Koule r={0.52} barva={ZELENA} position={[0, 0.5, 0]} scale={[1.15, 0.9, 1]} glazura={0.4} />
        <Koule r={0.38} barva={SVETLA} position={[0, 0.42, 0.26]} scale={[1, 0.95, 0.65]} glazura={0.3} />
        {/* přední ručičky */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Koule r={0.1} barva={ZELENA} position={[s * 0.36, 0.3, 0.32]} scale={[0.9, 1.5, 0.9]} rotation={[0.3, 0, s * 0.2]} glazura={0.4} />
            <Chodidlo pozice={[s * 0.36, 0.05, 0.32]} natoceni={s * 0.2} />
          </group>
        ))}
        {/* hlava */}
        <group ref={hlava} position={[0, 1.05, 0.06]}>
          <Koule r={0.55} barva={ZELENA} scale={[1.3, 0.82, 1]} glazura={0.4} />
          {/* tečky na hlavě */}
          {[
            [-0.35, 0.3, -0.25],
            [0.1, 0.4, -0.3],
            [0.42, 0.22, -0.3],
          ].map(([x, y, z]) => (
            <Koule key={`${x}`} r={0.07} barva={TMAVA} position={[x, y, z]} scale={[1, 0.5, 1]} />
          ))}
          {/* oči nahoře na hlavě */}
          {[-0.3, 0.3].map((x) => (
            <Koule key={x} r={0.21} barva={ZELENA} position={[x, 0.36, 0.12]} glazura={0.4} />
          ))}
          <group ref={oci} position={[0, 0.38, 0.27]}>
            <Oko pozice={[-0.3, 0, 0]} r={0.16} duhovka="#3d7a1e" />
            <Oko pozice={[0.3, 0, 0]} r={0.16} duhovka="#3d7a1e" />
          </group>
          <Oboci oboRef={oboci} y={0.6} z={0.3} roztec={0.3} delka={0.1} barva={TMAVA} sklon={0.1} />
          <Tvaricka pozice={[-0.5, -0.06, 0.38]} r={0.1} />
          <Tvaricka pozice={[0.5, -0.06, 0.38]} r={0.1} />
          {/* nosní dírky */}
          {[-0.06, 0.06].map((x) => (
            <Koule key={x} r={0.018} barva={TMAVA} position={[x, 0.05, 0.54]} />
          ))}
          <Pusa pusaRef={pusa} usmevRef={usmev} pozice={[0, -0.12, 0.51]} sirka={0.2} barva="#7a1f3a" natoceni={-0.35} />
          {/* korunka */}
          <group ref={koruna} position={[0.08, 0.48, -0.05]} rotation={[-0.1, 0, 0.15]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.2, 0.22, 0.14, 32, 1, true]} />
              <meshPhysicalMaterial color={ZLATA} metalness={0.8} roughness={0.2} clearcoat={1} side={THREE.DoubleSide} />
            </mesh>
            {[0, 1, 2, 3, 4].map((i) => {
              const u = (i / 5) * Math.PI * 2;
              return (
                <group key={i} position={[Math.sin(u) * 0.21, 0.12, Math.cos(u) * 0.21]}>
                  <mesh castShadow>
                    <coneGeometry args={[0.055, 0.12, 16]} />
                    <meshPhysicalMaterial color={ZLATA} metalness={0.8} roughness={0.2} clearcoat={1} />
                  </mesh>
                  <mesh position={[0, 0.07, 0]}>
                    <sphereGeometry args={[0.025, 12, 12]} />
                    <meshPhysicalMaterial color={ZLATA} metalness={0.8} roughness={0.2} />
                  </mesh>
                </group>
              );
            })}
            {[0, 1, 2, 3, 4].map((i) => {
              const u = ((i + 0.5) / 5) * Math.PI * 2;
              const barvy = ['#e0245e', '#3fa9f5', '#e0245e', '#7ed957', '#3fa9f5'];
              return (
                <mesh key={i} position={[Math.sin(u) * 0.222, 0, Math.cos(u) * 0.222]}>
                  <sphereGeometry args={[0.03, 16, 16]} />
                  <meshPhysicalMaterial color={barvy[i]} roughness={0.05} clearcoat={1} />
                </mesh>
              );
            })}
          </group>
        </group>
      </group>
    </>
  );
}
