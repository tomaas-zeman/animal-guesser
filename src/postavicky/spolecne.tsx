// Společné díly a animace pro všechny postavičky.
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';

export type Nalada = 'klid' | 'premysli' | 'tipuje' | 'radost' | 'smutek';

export interface PostavickaProps {
  mluvi: boolean;
  nalada: Nalada;
}

const lerp = THREE.MathUtils.lerp;

/**
 * Animace těla: pohupování, natáčení hlavy podle nálady, mrkání a pohyb pusy.
 * Vrací refy, které postavička připojí na své části.
 */
export function useAnimace({ mluvi, nalada }: PostavickaProps) {
  const telo = useRef<THREE.Group>(null);
  const hlava = useRef<THREE.Group>(null);
  const oci = useRef<THREE.Group>(null);
  const pusa = useRef<THREE.Object3D>(null);
  const dalsiMrknuti = useRef(2);
  const mrkaniDo = useRef(0);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const k = Math.min(1, dt * 6);

    if (telo.current) {
      const radost = nalada === 'radost';
      const y = radost ? Math.abs(Math.sin(t * 6)) * 0.45 : Math.sin(t * 2) * 0.04;
      telo.current.position.y = lerp(telo.current.position.y, y, radost ? 1 : k);
      const rotY = radost ? Math.sin(t * 3) * 0.5 : Math.sin(t * 0.7) * 0.12;
      telo.current.rotation.y = lerp(telo.current.rotation.y, rotY, k);
      const sklon = nalada === 'tipuje' ? 0.12 : nalada === 'smutek' ? 0.1 : 0;
      telo.current.rotation.x = lerp(telo.current.rotation.x, sklon, k);
    }

    if (hlava.current) {
      let x = Math.sin(t * 1.3) * 0.04;
      let z = Math.sin(t * 0.9) * 0.05;
      if (nalada === 'premysli') {
        x = -0.25 + Math.sin(t * 1.5) * 0.05;
        z = 0.22;
      } else if (nalada === 'tipuje') {
        x = 0.1;
        z = Math.sin(t * 8) * 0.06;
      } else if (nalada === 'smutek') {
        x = 0.4;
        z = -0.1;
      } else if (mluvi) {
        x += Math.sin(t * 7) * 0.05;
      }
      hlava.current.rotation.x = lerp(hlava.current.rotation.x, x, k);
      hlava.current.rotation.z = lerp(hlava.current.rotation.z, z, k);
    }

    if (oci.current) {
      if (t > dalsiMrknuti.current) {
        mrkaniDo.current = t + 0.13;
        dalsiMrknuti.current = t + 2 + Math.random() * 3;
      }
      const mrka = t < mrkaniDo.current;
      const cil = mrka ? 0.1 : nalada === 'radost' ? 0.6 : nalada === 'tipuje' ? 1.15 : 1;
      oci.current.scale.y = lerp(oci.current.scale.y, cil, mrka ? 1 : k);
    }

    if (pusa.current) {
      const cil = mluvi
        ? 0.25 + 0.75 * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 4.7))
        : nalada === 'radost'
          ? 0.9
          : nalada === 'smutek'
            ? 0.12
            : 0.2;
      pusa.current.scale.y = lerp(pusa.current.scale.y, cil, Math.min(1, dt * 18));
    }
  });

  return { telo, hlava, oci, pusa };
}

export function Mat({ barva, lesk = 0.35, zare }: { barva: string; lesk?: number; zare?: string }) {
  return (
    <meshStandardMaterial
      color={barva}
      roughness={1 - lesk}
      metalness={0}
      emissive={zare ?? '#000000'}
      emissiveIntensity={zare ? 1.2 : 0}
    />
  );
}

/** Kreslené oko: bělmo, zornička a odlesk. */
export function Oko({
  pozice,
  r = 0.13,
  duhovka = '#2b1d0e',
  belmo = '#ffffff',
}: {
  pozice: [number, number, number];
  r?: number;
  duhovka?: string;
  belmo?: string;
}) {
  return (
    <group position={pozice}>
      <mesh>
        <sphereGeometry args={[r, 24, 24]} />
        <Mat barva={belmo} lesk={0.6} />
      </mesh>
      <mesh position={[0, 0, r * 0.62]}>
        <sphereGeometry args={[r * 0.55, 20, 20]} />
        <Mat barva={duhovka} lesk={0.8} />
      </mesh>
      <mesh position={[r * 0.2, r * 0.25, r * 1.05]}>
        <sphereGeometry args={[r * 0.16, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/** Pusa, která se při mluvení otvírá (škáluje se v ose y). */
export function Pusa({
  pusaRef,
  pozice,
  sirka = 0.16,
  barva = '#4a1420',
}: {
  pusaRef: React.RefObject<THREE.Object3D | null>;
  pozice: [number, number, number];
  sirka?: number;
  barva?: string;
}) {
  return (
    <mesh ref={pusaRef as React.RefObject<THREE.Mesh>} position={pozice} scale={[1, 0.2, 0.5]}>
      <sphereGeometry args={[sirka, 20, 20]} />
      <Mat barva={barva} lesk={0.5} />
    </mesh>
  );
}

export function Koule({
  r,
  barva,
  children,
  ...props
}: { r: number; barva: string; children?: ReactNode } & ThreeElements['mesh']) {
  return (
    <mesh castShadow {...props}>
      <sphereGeometry args={[r, 32, 32]} />
      <Mat barva={barva} />
      {children}
    </mesh>
  );
}
