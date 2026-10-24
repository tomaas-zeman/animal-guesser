import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Koule, Mat, Oboci, Podstavec, Tvaricka, useAnimace, type PostavickaProps } from './spolecne';

const KOV = '#e6f0fb';
const MODRA = '#4f8fd9';
const TMAVY = '#1d2a40';
const SVETLO = '#5ff4ff';

/** Srdíčko na hrudi. */
function useSrdce() {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.1);
    s.bezierCurveTo(-0.02, -0.08, -0.12, -0.02, -0.12, 0.04);
    s.bezierCurveTo(-0.12, 0.1, -0.05, 0.12, 0, 0.07);
    s.bezierCurveTo(0.05, 0.12, 0.12, 0.1, 0.12, 0.04);
    s.bezierCurveTo(0.12, -0.02, 0.02, -0.08, 0, -0.1);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 4, curveSegments: 24 });
    g.center();
    return g;
  }, []);
}

export function Robot(props: PostavickaProps) {
  const { telo, hlava, oci, pusa, oboci } = useAnimace(props);
  const anteny = useRef<THREE.MeshPhysicalMaterial>(null);
  const srdce = useRef<THREE.Mesh>(null);
  const ruce = useRef<THREE.Group>(null);
  const prstenec = useRef<THREE.MeshPhysicalMaterial>(null);
  const tvarSrdce = useSrdce();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (anteny.current) {
      const rychlost = props.nalada === 'premysli' ? 10 : 2;
      anteny.current.emissiveIntensity = 0.8 + 0.7 * Math.sin(t * rychlost);
    }
    if (srdce.current) {
      // srdíčko tluče, při radosti rychleji
      const tep = props.nalada === 'radost' ? 8 : 3;
      const s = 1 + Math.pow(Math.max(0, Math.sin(t * tep)), 8) * 0.25;
      srdce.current.scale.setScalar(s);
    }
    if (prstenec.current) prstenec.current.emissiveIntensity = 0.9 + 0.4 * Math.sin(t * 1.5);
    if (ruce.current) {
      ruce.current.children.forEach((ruka, i) => {
        const s = i === 0 ? -1 : 1;
        const zvednuti = props.nalada === 'radost' ? 2.4 + Math.sin(t * 10 + i) * 0.4 : 0;
        ruka.rotation.z = s * (0.18 + zvednuti);
        ruka.rotation.x = props.mluvi && props.nalada !== 'radost' ? Math.sin(t * 4 + i) * 0.25 : 0;
      });
    }
  });

  return (
    <>
      <Podstavec barva="#c9d6e6" okraj="#8fa3bd" lesk={0.55}>
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.78, 0.84, 64]} />
          <meshPhysicalMaterial ref={prstenec} color={SVETLO} emissive={SVETLO} emissiveIntensity={1} toneMapped={false} />
        </mesh>
      </Podstavec>

      <group ref={telo}>
        {/* nožičky */}
        {[-0.2, 0.2].map((x) => (
          <group key={x} position={[x, 0.2, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.08, 0.08, 0.3, 20]} />
              <Mat barva={TMAVY} lesk={0.6} />
            </mesh>
            <mesh castShadow position={[0, -0.13, 0.05]} scale={[1, 0.55, 1.25]}>
              <sphereGeometry args={[0.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <Mat barva={MODRA} lesk={0.7} glazura={1} />
            </mesh>
          </group>
        ))}
        {/* trup */}
        <RoundedBox args={[0.9, 0.78, 0.66]} radius={0.24} smoothness={6} position={[0, 0.72, 0]} castShadow>
          <Mat barva={KOV} lesk={0.7} kov={0.15} glazura={1} />
        </RoundedBox>
        <RoundedBox args={[0.5, 0.4, 0.06]} radius={0.08} smoothness={4} position={[0, 0.72, 0.32]}>
          <Mat barva={TMAVY} lesk={0.85} glazura={1} />
        </RoundedBox>
        <mesh ref={srdce} position={[0, 0.73, 0.37]}>
          <primitive object={tvarSrdce} attach="geometry" />
          <meshPhysicalMaterial color="#ff5d84" emissive="#ff3d6e" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
        {/* ručičky */}
        <group ref={ruce}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.5, 0.95, 0]}>
              <mesh castShadow position={[0, -0.22, 0]}>
                <capsuleGeometry args={[0.065, 0.32, 8, 16]} />
                <Mat barva={TMAVY} lesk={0.6} />
              </mesh>
              <Koule r={0.12} barva={MODRA} position={[0, -0.48, 0]} lesk={0.7} glazura={1} />
            </group>
          ))}
        </group>
        {/* krk */}
        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.12, 24]} />
          <Mat barva={TMAVY} lesk={0.6} />
        </mesh>
        {/* hlava */}
        <group ref={hlava} position={[0, 1.58, 0]}>
          <RoundedBox args={[1.2, 0.86, 0.85]} radius={0.32} smoothness={8} castShadow>
            <Mat barva={KOV} lesk={0.7} kov={0.15} glazura={1} />
          </RoundedBox>
          {/* obrazovka s obličejem */}
          <RoundedBox args={[0.98, 0.62, 0.06]} radius={0.2} smoothness={6} position={[0, -0.02, 0.41]}>
            <Mat barva={TMAVY} lesk={0.95} glazura={1} />
          </RoundedBox>
          <group ref={oci} position={[0, 0.03, 0.45]}>
            {[-0.2, 0.2].map((x) => (
              <group key={x} position={[x, 0, 0]}>
                <mesh scale={[1, 1.15, 0.3]}>
                  <sphereGeometry args={[0.1, 24, 24]} />
                  <meshBasicMaterial color={SVETLO} toneMapped={false} />
                </mesh>
                <mesh position={[-0.03, 0.04, 0.03]}>
                  <sphereGeometry args={[0.025, 12, 12]} />
                  <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
              </group>
            ))}
          </group>
          <Oboci oboRef={oboci} y={0.19} z={0.45} roztec={0.2} delka={0.1} tloustka={0.018} barva={SVETLO} zare={SVETLO} />
          <Tvaricka pozice={[-0.35, -0.12, 0.45]} r={0.07} barva="#ff7aa8" />
          <Tvaricka pozice={[0.35, -0.12, 0.45]} r={0.07} barva="#ff7aa8" />
          <group ref={pusa} position={[0, -0.15, 0.45]} scale={[1, 0.2, 1]}>
            <mesh rotation={[0, 0, Math.PI / 2]} scale={[1.6, 1, 0.3]}>
              <capsuleGeometry args={[0.045, 0.12, 6, 16]} />
              <meshBasicMaterial color={SVETLO} toneMapped={false} />
            </mesh>
          </group>
          {/* uši a anténa */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.61, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.16, 0.16, 0.1, 32]} />
                <Mat barva={MODRA} lesk={0.7} glazura={1} />
              </mesh>
              <mesh position={[0, s * 0.055, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.02, 24]} />
                <meshBasicMaterial color={SVETLO} toneMapped={false} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.28, 12]} />
            <Mat barva={TMAVY} />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <sphereGeometry args={[0.09, 24, 24]} />
            <meshPhysicalMaterial ref={anteny} color="#ffd84f" emissive="#ffb020" emissiveIntensity={1} clearcoat={1} />
          </mesh>
        </group>
      </group>
    </>
  );
}
