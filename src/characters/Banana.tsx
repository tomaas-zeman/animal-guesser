import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Mat, Eyebrows, Eye, Pedestal, Mouth, Cheek, useAnimace, type CharacterProps } from './shared';
import { isTense, isSad, isCheerful } from './emotions';

const YELLOW = '#ffd83a';
const BROWN = '#5a3a1a';
const FRECKLES = '#9a6424';
const STALK = '#8a9a3a';
const RED = '#e0245e';

/** Half of the banana's thickness in the middle. */
const R = 0.36;
/** The banana's axis from bottom to top, bent into a C. It starts at the joint around which the whole banana tilts. */
const AXIS = new THREE.CatmullRomCurve3(
  [
    [0.12, -0.04],
    [-0.06, 0.3],
    [-0.14, 0.7],
    [-0.1, 1.1],
    [0.06, 1.42],
    [0.3, 1.62],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
);
const FORWARD = new THREE.Vector3(0, 0, 1);

/** Thickness along the banana: widest in the middle, narrowing toward the ends. */
const radius = (u: number) => R * Math.max(0.14, Math.pow(Math.sin(Math.PI * u), 0.55));

/** A point on the peel: u along the banana (0 at the bottom, 1 at the top), angle around the axis (π/2 is the front, where the face is). */
function onPeel(u: number, angle: number, offset = 0) {
  const center = AXIS.getPointAt(u);
  const tangent = AXIS.getTangentAt(u);
  const side = new THREE.Vector3().crossVectors(FORWARD, tangent).normalize();
  // five ridges like a real banana, a flat patch in the middle of the face
  const r = radius(u) * (1 + 0.045 * Math.cos(5 * (angle - Math.PI / 2) + Math.PI)) + offset;
  const direction = side.multiplyScalar(Math.cos(angle)).addScaledVector(FORWARD, Math.sin(angle));
  return { point: center.addScaledVector(direction, r), direction };
}

function peel(length = 72, around = 48) {
  const position: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= length; i++) {
    for (let j = 0; j <= around; j++) {
      const { point } = onPeel(i / length, (j / around) * Math.PI * 2);
      position.push(point.x, point.y, point.z);
    }
  }
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < around; j++) {
      const a = i * (around + 1) + j;
      const b = a + around + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Rotation around the z axis so that a thing stands perpendicular to the banana at position u. */
const tiltAt = (u: number) => {
  const t = AXIS.getTangentAt(u);
  return Math.atan2(-t.x, t.y);
};

/** A brown freckle that every properly ripe banana has. */
function Freckle({ u, angle, r = 0.035 }: { u: number; angle: number; r?: number }) {
  const { point, direction } = onPeel(u, angle, -0.004);
  const q = new THREE.Quaternion().setFromUnitVectors(FORWARD, direction);
  return (
    <mesh position={point} quaternion={q} scale={[1, 0.8, 0.25]}>
      <sphereGeometry args={[r, 16, 12]} />
      <Mat color={FRECKLES} shine={0.3} />
    </mesh>
  );
}

/** A thin little arm with a white glove, rotating at the shoulder. */
function Arm({ arm, side }: { arm: React.RefObject<THREE.Group | null>; side: -1 | 1 }) {
  const { point } = onPeel(0.4, side === -1 ? 0 : Math.PI, -0.03);
  return (
    <group position={point}>
      <group ref={arm} rotation={[0, 0, side * 0.45]}>
        <mesh position={[0, -0.17, 0]} castShadow>
          <capsuleGeometry args={[0.028, 0.3, 6, 12]} />
          <Mat color={BROWN} />
        </mesh>
        <Ball r={0.075} color="#ffffff" position={[0, -0.36, 0.01]} scale={[1, 1.05, 0.85]} shine={0.4} />
        <Ball r={0.032} color="#ffffff" position={[side * -0.06, -0.33, 0.03]} shine={0.4} />
      </group>
    </group>
  );
}

/** A retro microphone on a stand, the banana is a comedian after all. */
function Mikrofon() {
  const chrom = <meshPhysicalMaterial color="#c9ced6" metalness={0.9} roughness={0.25} clearcoat={1} />;
  return (
    <group position={[-0.8, 0, 0.12]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 32]} />
        {chrom}
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.92, 12]} />
        {chrom}
      </mesh>
      <group position={[0, 0.96, 0.02]} rotation={[0.5, 0, 0]}>
        <mesh position={[0, -0.07, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.022, 0.16, 16]} />
          <Mat color="#2b2b33" shine={0.6} />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.065, 24, 20]} />
          <meshPhysicalMaterial color="#8d939c" metalness={0.7} roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
}

/** A banana peel on the stage, so there is something to slip on. */
function Peel() {
  return (
    <group position={[0.68, 0.015, 0.42]} rotation={[0, 0.7, 0]}>
      {[0, 1, 2, 3].map((i) => {
        const u = (i / 4) * Math.PI * 2 + 0.3;
        return (
          <Ball
            key={i}
            r={0.07}
            color={YELLOW}
            position={[Math.cos(u) * 0.09, 0.012, Math.sin(u) * 0.09]}
            rotation={[0, -u, 0]}
            scale={[1.9, 0.22, 0.75]}
            glaze={0.3}
          />
        );
      })}
      <Ball r={0.05} color={YELLOW} position={[0, 0.03, 0]} scale={[1, 0.8, 1]} />
      <Ball r={0.022} color={BROWN} position={[0, 0.07, 0]} />
    </group>
  );
}

export function Banana(props: CharacterProps) {
  const { body, head, eyes, mouth, smile, eyebrows } = useAnimace(props);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const bowTie = useRef<THREE.Group>(null);

  const shape = useMemo(() => peel(), []);
  const top = useMemo(() => ({ point: AXIS.getPointAt(1), tilt: tiltAt(1) }), []);
  const bottom = useMemo(() => AXIS.getPointAt(0), []);
  const face = useMemo(() => ({ point: AXIS.getPointAt(0.5), tilt: tiltAt(0.5) }), []);
  const neck = useMemo(() => ({ point: onPeel(0.31, Math.PI / 2, 0.01).point, tilt: tiltAt(0.31) }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const n = props.mood;
    // [lift sideways, raise forward] for the left and right arm
    let l: [number, number] = [0.45 + Math.sin(t * 1.6) * 0.05, 0];
    let p: [number, number] = [0.45 + Math.sin(t * 1.6 + 1) * 0.05, 0];
    if (isCheerful(n)) {
      // arms above the head, waving like at the end of a show
      l = [2.5 + Math.sin(t * 9) * 0.3, 0];
      p = [2.5 + Math.sin(t * 9 + Math.PI) * 0.3, 0];
    } else if (n === 'surprise') {
      l = [1.35, -0.2];
      p = [1.35, -0.2];
    } else if (isSad(n)) {
      l = [0.12, 0.1];
      p = [0.12, 0.1];
    } else if (n === 'thinking') {
      // scratching the chin with one hand
      l = [0.35, 0];
      p = [0.55, -1.25 + Math.sin(t * 3) * 0.06];
    } else if (isTense(n)) {
      // little hands clasped in front, rubbing them tensely
      l = [0.25 + Math.sin(t * 10) * 0.04, -0.7];
      p = [0.25 - Math.sin(t * 10) * 0.04, -0.7];
    } else if (props.speaking) {
      // gesturing like a joke teller
      l = [0.6 + Math.sin(t * 4.5) * 0.35, -0.3];
      p = [0.9 + Math.sin(t * 3.7 + 1) * 0.45, -0.4];
    }
    const k = 0.14;
    for (const [arm, [z, x], s] of [
      [leftArm.current, l, -1],
      [rightArm.current, p, 1],
    ] as const) {
      if (!arm) continue;
      arm.rotation.z = THREE.MathUtils.lerp(arm.rotation.z, s * z, k);
      arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x, x, k);
    }
    if (bowTie.current) {
      // the bow tie spins when laughing, otherwise it just bobs
      const target = isCheerful(n) ? Math.sin(t * 12) * 0.35 : Math.sin(t * 2) * 0.05;
      bowTie.current.rotation.z = THREE.MathUtils.lerp(bowTie.current.rotation.z, neck.tilt + target, 0.2);
    }
  });

  return (
    <>
      {/* a small wooden stage with a spotlight */}
      <Pedestal color="#d99a5b" rim="#a8673a" shine={0.35}>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
          <mesh key={x} position={[x, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.012, Math.sqrt(1.05 ** 2 - x * x) * 2]} />
            <meshBasicMaterial color="#a8673a" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        ))}
        <mesh position={[0, 0.004, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.62, 48]} />
          <meshBasicMaterial color="#fff3c0" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <Mikrofon />
        <Peel />
      </Pedestal>

      <group ref={body} position={[0, 0.02, 0]}>
        {/* little legs in red sneakers */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.08 + 0.1, 0, 0]}>
            <mesh position={[0, 0.22, 0]} castShadow>
              <capsuleGeometry args={[0.03, 0.26, 6, 12]} />
              <Mat color={BROWN} />
            </mesh>
            <Ball r={0.1} color={RED} position={[s * 0.02, 0.06, 0.05]} scale={[0.9, 0.62, 1.4]} glaze={0.5} />
            <Ball r={0.1} color="#ffffff" position={[s * 0.02, 0.025, 0.05]} scale={[0.95, 0.25, 1.45]} />
          </group>
        ))}

        {/* the whole banana tilts, nods and bends around the little legs */}
        <group ref={head} position={[0, 0.36, 0]}>
          <mesh geometry={shape} castShadow>
            <Mat color={YELLOW} shine={0.45} glaze={0.35} />
          </mesh>
          {/* a stalk at the top and a dark tip at the bottom */}
          <group position={top.point} rotation={[0, 0, top.tilt]}>
            <mesh position={[0, 0.07, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.06, 0.16, 16]} />
              <Mat color={STALK} shine={0.3} />
            </mesh>
            <mesh position={[0, 0.155, 0]}>
              <cylinderGeometry args={[0.05, 0.045, 0.03, 16]} />
              <Mat color={BROWN} shine={0.2} />
            </mesh>
          </group>
          <Ball r={0.06} color={BROWN} position={bottom} scale={[1, 0.7, 1]} />

          {[
            [0.22, 0.4],
            [0.7, 0.15],
            [0.64, 2.7],
            [0.33, 2.95],
            [0.82, 1.05, 0.025],
            [0.5, 4.2],
            [0.28, 5.1],
            [0.75, 4.8],
            [0.16, 2.0, 0.025],
          ].map(([u, angle, r]) => (
            <Freckle key={`${u}-${angle}`} u={u} angle={angle} r={r} />
          ))}

          {/* the face sits on the banana's front flat patch */}
          <group position={face.point} rotation={[0, 0, face.tilt]}>
            <group ref={eyes} position={[0, 0.14, R - 0.05]}>
              <Eye position={[-0.13, 0, 0]} r={0.12} iris="#5a3a1a" />
              <Eye position={[0.13, 0, 0]} r={0.12} iris="#5a3a1a" />
            </group>
            <Eyebrows browRef={eyebrows} y={0.32} z={R - 0.04} spacing={0.14} length={0.09} thickness={0.02} color={BROWN} lean={0.15} />
            <Cheek position={[-0.22, -0.07, R - 0.08]} r={0.07} />
            <Cheek position={[0.22, -0.07, R - 0.08]} r={0.07} />
            <Mouth mouthRef={mouth} smileRef={smile} position={[0, -0.1, R - 0.01]} width={0.13} color="#6a2a1a" />
          </group>

          {/* a bow tie, as a proper comedian wears */}
          <group ref={bowTie} position={neck.point} rotation={[0, 0, neck.tilt]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.075, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]} scale={[1, 1, 0.45]} castShadow>
                <coneGeometry args={[0.065, 0.14, 24]} />
                <Mat color={RED} shine={0.55} glaze={0.4} />
              </mesh>
            ))}
            <Ball r={0.035} color={RED} scale={[1, 1, 0.7]} shine={0.55} />
            {[
              [-0.09, 0.025],
              [-0.07, -0.03],
              [0.08, 0.03],
              [0.1, -0.02],
            ].map(([x, y]) => (
              <mesh key={`${x}`} position={[x, y, 0.03]}>
                <sphereGeometry args={[0.009, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            ))}
          </group>

          <Arm arm={leftArm} side={-1} />
          <Arm arm={rightArm} side={1} />
        </group>
      </group>
    </>
  );
}
