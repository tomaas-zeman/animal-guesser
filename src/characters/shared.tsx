// Shared parts and animations for all characters.
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { EXPRESSIONS, isTense, isSad, isCheerful, type Mood } from './emotions';

export type { Mood } from './emotions';

export interface CharacterProps {
  speaking: boolean;
  mood: Mood;
}

const lerp = THREE.MathUtils.lerp;
const FULL_TURN = Math.PI * 2;

/**
 * Body animation: breathing, bouncing, head rotation by mood, blinking,
 * eye gaze, eyebrows and mouth movement. The expression for each mood is in `EXPRESSIONS`.
 * Returns refs that the character attaches to its parts.
 */
export function useAnimace({ speaking, mood }: CharacterProps) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Object3D>(null);
  const smile = useRef<THREE.Object3D>(null);
  const eyebrows = useRef<THREE.Group>(null);
  const nextBlink = useRef(2);
  const blinkUntil = useRef(0);
  const gaze = useRef({ x: 0, y: 0, next: 1 });
  // when the mood last changed, for one-off movements (pirouette, startle)
  const change = useRef<{ mood: Mood | null; t: number }>({ mood: null, t: 0 });

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const k = Math.min(1, dt * 6);
    const v = EXPRESSIONS[mood];
    if (change.current.mood !== mood) change.current = { mood, t };
    const sinceChange = t - change.current.t;

    if (body.current) {
      // when joyful it jumps and squashes a bit on landing, otherwise it just breathes
      const jumping = v.jump > 0;
      const jumpSpeed = mood === 'celebration' ? 7 : 6;
      const jump = jumping ? Math.abs(Math.sin(t * jumpSpeed)) : 0;
      // startle: a short hop
      const startle = mood === 'surprise' && sinceChange < 0.4 ? Math.sin((sinceChange / 0.4) * Math.PI) * 0.18 : 0;
      const y = jumping ? jump * v.jump : startle + Math.sin(t * 2) * 0.03;
      body.current.position.y = lerp(body.current.position.y, y, jumping || startle ? 1 : k);
      const squash = jumping ? Math.pow(1 - jump, 6) * 0.14 : 0;
      // a sad character breathes slower and deeper (a sigh)
      const breath = isSad(mood) ? Math.sin(t * 1.3) * 0.028 : Math.sin(t * 2.2) * 0.018;
      const sy = 1 + breath - squash + (jumping ? jump * 0.05 : 0);
      const sxz = 1 - breath * 0.6 + squash * 0.7;
      body.current.scale.set(lerp(body.current.scale.x, sxz, 0.5), lerp(body.current.scale.y, sy, 0.5), lerp(body.current.scale.z, sxz, 0.5));

      if (mood === 'celebration' && sinceChange < 1.1) {
        // for a celebration it spins around once
        const f = sinceChange / 1.1;
        body.current.rotation.y = (f * f * (3 - 2 * f)) * FULL_TURN;
      } else {
        if (body.current.rotation.y > Math.PI) body.current.rotation.y -= FULL_TURN;
        const rotY = jumping ? Math.sin(t * 3) * 0.5 : Math.sin(t * 0.7) * 0.12;
        body.current.rotation.y = lerp(body.current.rotation.y, rotY, k);
      }
      body.current.rotation.x = lerp(body.current.rotation.x, v.lean, k);
      const sway = mood === 'thinking' ? Math.sin(t * 1.4) * 0.05 : Math.sin(t * 1.1) * 0.02;
      body.current.rotation.z = lerp(body.current.rotation.z, sway, k);
    }

    if (head.current) {
      let x = Math.sin(t * 1.3) * 0.04;
      let z = Math.sin(t * 0.9) * 0.05;
      if (v.head) {
        [x, z] = v.head;
        if (mood === 'thinking') x += Math.sin(t * 1.5) * 0.05;
        if (mood === 'curiosity') z += Math.sin(t * 1.2) * 0.04;
      } else if (isCheerful(mood)) {
        // joyful nodding
        x = Math.sin(t * 6) * 0.08;
      }
      if (v.tremble) z += Math.sin(t * 8) * v.tremble;
      if (speaking && !isSad(mood)) x += Math.sin(t * 7) * 0.05;
      head.current.rotation.x = lerp(head.current.rotation.x, x, k);
      head.current.rotation.z = lerp(head.current.rotation.z, z, k);
    }

    if (eyes.current) {
      if (t > nextBlink.current) {
        blinkUntil.current = t + 0.13;
        // when tense it blinks more often, when amazed hardly at all
        const gap = isTense(mood) ? 1 + Math.random() * 1.5 : mood === 'surprise' ? 4 : 2 + Math.random() * 3;
        nextBlink.current = t + gap;
      }
      const blinking = t < blinkUntil.current;
      eyes.current.scale.y = lerp(eyes.current.scale.y, blinking ? 0.1 : v.eyes, blinking ? 1 : k);

      // the eyes look around now and then, when thinking they look up and to the side
      const p = gaze.current;
      if (t > p.next) {
        const toCamera = Math.random() < 0.5;
        p.x = toCamera ? 0 : (Math.random() - 0.5) * 0.5;
        p.y = toCamera ? 0 : (Math.random() - 0.5) * 0.3;
        p.next = t + 1 + Math.random() * 2.5;
      }
      const [px, py] = v.gaze ?? [p.x, p.y];
      eyes.current.traverse((o) => {
        const r = o.userData.gaze as number | undefined;
        if (r === undefined) return;
        o.position.x = lerp(o.position.x, px * r * 0.45, Math.min(1, dt * 12));
        o.position.y = lerp(o.position.y, py * r * 0.45, Math.min(1, dt * 12));
      });
    }

    if (eyebrows.current) {
      const bob = 0.02 + Math.abs(Math.sin(t * 3)) * 0.02;
      const [l, r] = v.eyebrows ?? (speaking ? [[bob, 0], [bob, 0]] : [[0, 0], [0, 0]]);
      eyebrows.current.children.forEach((o, i) => {
        const [lift, rotation] = i === 0 ? l : r;
        const base = (o.userData.y as number) ?? 0;
        o.position.y = lerp(o.position.y, base + lift, k);
        o.rotation.z = lerp(o.rotation.z, (i === 0 ? 1 : -1) * rotation + (o.userData.rz ?? 0), k);
      });
    }

    const hasSmile = Boolean(smile.current);
    if (mouth.current) {
      // a character without a smile has its mouth always slightly open
      const atRest = hasSmile ? v.mouth : Math.max(v.mouth, v.smile < 0 ? 0.12 : 0.2);
      // a sad one speaks with a smaller mouth, a cheerful one with a bigger one
      const range = isSad(mood) ? 0.55 : isCheerful(mood) ? 1.1 : 0.75;
      const target = speaking ? 0.25 + range * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 4.7)) : atRest;
      mouth.current.scale.y = lerp(mouth.current.scale.y, target, Math.min(1, dt * 18));
      if (hasSmile) mouth.current.visible = mouth.current.scale.y > 0.06;
    }
    if (smile.current) {
      // a closed mouth is a smile, with sadness it flips, with thinking it straightens
      smile.current.scale.y = lerp(smile.current.scale.y, v.smile, k);
      smile.current.visible = !mouth.current || mouth.current.scale.y < 0.3;
    }
  });

  return { body, head, eyes, mouth, smile, eyebrows };
}

/** Material style for the whole character: fur is soft and velvety. */
const MaterialStyle = createContext({ fur: false });

export function Style({ fur, children }: { fur: boolean; children: ReactNode }) {
  return <MaterialStyle.Provider value={{ fur }}>{children}</MaterialStyle.Provider>;
}

export function Mat({
  color,
  shine = 0.35,
  glow,
  metal = 0,
  glaze = 0,
  transparency,
}: {
  color: string;
  shine?: number;
  glow?: string;
  metal?: number;
  /** a glossy layer on top, like varnish or wet skin */
  glaze?: number;
  transparency?: number;
}) {
  const { fur } = useContext(MaterialStyle);
  const highlight = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.55), [color]);
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={1 - shine}
      metalness={metal}
      emissive={glow ?? '#000000'}
      emissiveIntensity={glow ? 1.4 : 0}
      sheen={fur && !glow ? 1 : 0}
      sheenColor={highlight}
      sheenRoughness={0.45}
      clearcoat={glaze}
      clearcoatRoughness={0.15}
      transparent={transparency !== undefined}
      opacity={transparency ?? 1}
    />
  );
}

/** A cartoon eye: sclera, colored iris, a big pupil and two highlights. */
export function Eye({
  position,
  r = 0.13,
  iris = '#2b1d0e',
  sclera = '#ffffff',
}: {
  position: [number, number, number];
  r?: number;
  iris?: string;
  sclera?: string;
}) {
  return (
    <group position={position}>
      <mesh scale={[1, 1, 0.75]}>
        <sphereGeometry args={[r, 32, 32]} />
        <meshPhysicalMaterial color={sclera} roughness={0.3} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      {/* the pupil moves, the animation shifts it according to userData.gaze */}
      <group userData={{ gaze: r }}>
        <mesh position={[0, 0, r * 0.52]} scale={[1, 1, 0.45]}>
          <sphereGeometry args={[r * 0.68, 32, 24]} />
          <meshPhysicalMaterial color={iris} roughness={0.35} clearcoat={1} clearcoatRoughness={0.05} />
        </mesh>
        <mesh position={[0, 0, r * 0.62]} scale={[1, 1, 0.4]}>
          <sphereGeometry args={[r * 0.45, 24, 20]} />
          <meshPhysicalMaterial color="#0b0710" roughness={0.2} clearcoat={1} clearcoatRoughness={0.02} />
        </mesh>
        <mesh position={[-r * 0.22, r * 0.26, r * 0.82]}>
          <sphereGeometry args={[r * 0.2, 16, 16]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <mesh position={[r * 0.24, -r * 0.2, r * 0.8]}>
          <sphereGeometry args={[r * 0.09, 12, 12]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Eyebrows above the eyes, rotating with the mood. The left one is first. */
export function Eyebrows({
  browRef,
  y,
  z,
  spacing,
  length = 0.12,
  thickness = 0.022,
  color = '#3a2418',
  lean = 0,
  glow,
}: {
  browRef: React.RefObject<THREE.Group | null>;
  y: number;
  z: number;
  spacing: number;
  length?: number;
  thickness?: number;
  color?: string;
  /** base rotation of the outer ends downward */
  lean?: number;
  glow?: string;
}) {
  return (
    <group ref={browRef}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * spacing, y, z]} rotation={[0, 0, s * -lean + Math.PI / 2]} userData={{ y, rz: s * -lean + Math.PI / 2 }}>
          <capsuleGeometry args={[thickness, length, 6, 12]} />
          <Mat color={color} glow={glow} />
        </mesh>
      ))}
    </group>
  );
}

/** Mouth: closed it is a smile, when speaking it opens (scales along the y axis) and a little tongue is visible. */
export function Mouth({
  mouthRef,
  smileRef,
  position,
  width = 0.16,
  color = '#4a1420',
  tongue = '#ff7a8a',
  rotation = 0,
}: {
  mouthRef: React.RefObject<THREE.Object3D | null>;
  smileRef?: React.RefObject<THREE.Object3D | null>;
  position: [number, number, number];
  width?: number;
  color?: string;
  tongue?: string;
  /** tilting the mouth back so that it sits on a rounded cheek */
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[rotation, 0, 0]}>
      <mesh ref={mouthRef as React.RefObject<THREE.Mesh>} scale={[1, 0.2, 0.45]}>
        <sphereGeometry args={[width, 24, 20]} />
        <Mat color={color} shine={0.5} />
        <mesh position={[0, -width * 0.5, width * 0.15]} scale={[0.7, 0.45, 0.6]}>
          <sphereGeometry args={[width, 20, 16]} />
          <Mat color={tongue} shine={0.6} />
        </mesh>
      </mesh>
      {smileRef && (
        <group ref={smileRef as React.RefObject<THREE.Group>}>
          <mesh position={[0, width * 0.55, width * 0.1]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[width * 0.6, Math.max(0.012, width * 0.11), 10, 32, Math.PI]} />
            <Mat color={color} shine={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** A pink cheek. */
export function Cheek({ position, r = 0.09, color = '#ff8fa3' }: { position: [number, number, number]; r?: number; color?: string }) {
  return (
    <mesh position={position} scale={[1.2, 0.75, 0.35]}>
      <sphereGeometry args={[r, 20, 16]} />
      <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.75} depthWrite={false} />
    </mesh>
  );
}

export function Ball({
  r,
  color,
  shine,
  glaze,
  children,
  ...props
}: { r: number; color: string; shine?: number; glaze?: number; children?: ReactNode } & ThreeElements['mesh']) {
  return (
    <mesh castShadow {...props}>
      <sphereGeometry args={[r, 40, 32]} />
      <Mat color={color} shine={shine} glaze={glaze} />
      {children}
    </mesh>
  );
}

/** A round pedestal the character stands on (its top is at y = 0). */
export function Pedestal({
  color,
  rim,
  r = 1.05,
  height = 0.2,
  shine = 0.2,
  children,
}: {
  color: string;
  rim: string;
  r?: number;
  height?: number;
  shine?: number;
  children?: ReactNode;
}) {
  return (
    <group>
      <mesh position={[0, -height / 2, 0]} receiveShadow>
        <cylinderGeometry args={[r, r * 0.94, height, 64]} />
        <Mat color={rim} shine={shine} />
      </mesh>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[r, 64]} />
        <Mat color={color} shine={shine} />
      </mesh>
      <mesh position={[0, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <torusGeometry args={[r - 0.025, 0.03, 12, 64]} />
        <Mat color={rim} shine={shine} />
      </mesh>
      {children}
    </group>
  );
}
