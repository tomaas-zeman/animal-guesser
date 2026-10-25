import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Ball, Mat, Eyebrows, Eye, Pedestal, Mouth, useAnimace, type CharacterProps } from './shared';
import { isTense, isSad, isCheerful } from './emotions';

const YELLOW = '#ffd21f';
const BELLY = '#ffe88a';
const BROWN = '#6b3e1e';
const EYEBROWS = '#7a4a22';
const EAR = '#ffc9a8';
const RED = '#e8402a';
const DUNGAREES = '#3d6fb6';
const RUBBER_BOOTS = '#2f6b3a';
const CAP = '#d7372f';
const HAY = '#e2b84a';
const WOOD = '#9a6a3a';

/** A piece of a sphere, e.g. the bib of dungarees, which fits exactly on the belly. Angles are like in THREE.SphereGeometry. */
function Cutout({
  r,
  phi,
  theta,
  color,
  shine,
}: {
  r: number;
  phi: [number, number];
  theta: [number, number];
  color: string;
  shine?: number;
}) {
  return (
    <mesh castShadow>
      <sphereGeometry args={[r, 48, 32, phi[0], phi[1], theta[0], theta[1]]} />
      <Mat color={color} shine={shine} />
    </mesh>
  );
}

/** A big ear like a fennec's, pinkish on the inside. It rotates at the root, so it can be wiggled. */
function Ear({ ear, side }: { ear: React.RefObject<THREE.Group | null>; side: -1 | 1 }) {
  return (
    <group position={[side * 0.26, 0.26, -0.05]}>
      <group ref={ear} rotation={[0, 0, side * -0.5]}>
        <mesh position={[0, 0.33, 0]} scale={[1, 1, 0.4]} castShadow>
          <coneGeometry args={[0.23, 0.7, 32]} />
          <Mat color={YELLOW} shine={0.3} />
        </mesh>
        <mesh position={[0, 0.3, 0.05]} scale={[1, 1, 0.22]}>
          <coneGeometry args={[0.16, 0.55, 32]} />
          <Mat color={EAR} shine={0.2} />
        </mesh>
      </group>
    </group>
  );
}

/** A pitchfork stuck in the ground, a farmhand is not a farmhand without one. */
function Pitchfork() {
  const metal = <meshPhysicalMaterial color="#9aa2ab" metalness={0.85} roughness={0.35} />;
  return (
    <group position={[0.78, 0, -0.2]} rotation={[0.08, 0, -0.16]}>
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.022, 1.05, 12]} />
        <Mat color={WOOD} shine={0.25} />
      </mesh>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.24, 0.03, 0.03]} />
        {metal}
      </mesh>
      {[-0.105, -0.035, 0.035, 0.105].map((x) => (
        <mesh key={x} position={[x, 0.13, 0]} castShadow>
          <cylinderGeometry args={[0.009, 0.004, 0.24, 8]} />
          {metal}
        </mesh>
      ))}
    </group>
  );
}

/** A bale of hay to sit on after work. */
function Bundle() {
  return (
    <group position={[-0.68, 0.19, 0.12]} rotation={[0, 0.5, Math.PI / 2]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.38, 32]} />
        <Mat color={HAY} shine={0.1} />
      </mesh>
      {[-0.1, 0.1].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.192, 0.008, 8, 40]} />
          <Mat color="#b5482a" />
        </mesh>
      ))}
    </group>
  );
}

export function Vojtachu(props: CharacterProps) {
  const { body, head, eyes, mouth, smile, eyebrows } = useAnimace(props);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftEar = useRef<THREE.Group>(null);
  const rightEar = useRef<THREE.Group>(null);
  const stalk = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const n = props.mood;
  // the cheeks spark when it is happy, it is a pokémon after all
  const sparkles = isCheerful(n) ? '#ff6a3a' : undefined;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // [lift sideways, raise forward] for the left and right arm
    let l: [number, number] = [0.35 + Math.sin(t * 1.4) * 0.04, 0];
    let p: [number, number] = [0.35 + Math.sin(t * 1.4 + 1) * 0.04, 0];
    if (isCheerful(n)) {
      // fists above the head like after winning a tug of war
      l = [2.6 + Math.sin(t * 8) * 0.25, 0];
      p = [2.6 + Math.sin(t * 8 + Math.PI) * 0.25, 0];
    } else if (n === 'surprise') {
      l = [1.5, -0.3];
      p = [1.5, -0.3];
    } else if (isSad(n)) {
      l = [0.08, 0.15];
      p = [0.08, 0.15];
    } else if (n === 'offended') {
      // arms crossed on the chest, an offended farmer
      l = [0.15, -1.45];
      p = [0.25, -1.35];
    } else if (n === 'thinking') {
      // scratching under the cap
      l = [0.3, 0];
      p = [2.7 + Math.sin(t * 6) * 0.08, -0.5];
    } else if (isTense(n)) {
      // nervously rubbing its hands
      l = [0.2 + Math.sin(t * 10) * 0.04, -0.85];
      p = [0.2 - Math.sin(t * 10) * 0.04, -0.85];
    } else if (props.speaking) {
      // waving its arms like explaining something to a neighbor over the fence
      l = [0.5 + Math.sin(t * 4) * 0.35, -0.25];
      p = [0.8 + Math.sin(t * 3.3 + 1) * 0.5, -0.45];
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
    // ears: they perk up when amazed, droop when sad, twitch while speaking
    const openness = n === 'surprise' ? 0.25 : isSad(n) ? 1.0 : n === 'offended' ? 0.75 : 0.5;
    const twitch = props.speaking ? Math.sin(t * 9) * 0.06 : Math.max(0, Math.sin(t * 0.9) - 0.97) * 3;
    for (const [ear, s] of [
      [leftEar.current, -1],
      [rightEar.current, 1],
    ] as const) {
      if (!ear) continue;
      ear.rotation.z = THREE.MathUtils.lerp(ear.rotation.z, s * -(openness + twitch), 0.15);
    }
    if (stalk.current) {
      // holds a straw in the corner of its mouth: it bobs, is chewed when thinking, twitches with the mouth when speaking
      const openness = mouth.current ? mouth.current.scale.y : 0;
      const chewing = n === 'thinking' ? Math.sin(t * 6) * 0.2 : Math.sin(t * 1.5) * 0.06;
      stalk.current.rotation.z = 1.1 + chewing - openness * 0.15;
      stalk.current.position.y = -0.1 - openness * 0.015;
    }
    if (tail.current) {
      const wag = isCheerful(n) ? Math.sin(t * 12) * 0.35 : Math.sin(t * 1.8) * 0.08;
      tail.current.rotation.z = THREE.MathUtils.lerp(tail.current.rotation.z, wag, 0.2);
    }
  });

  return (
    <>
      {/* a piece of field: grass, a hay bale and a pitchfork */}
      <Pedestal color="#8cc152" rim="#7a5230" shine={0.15}>
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.0, 64]} />
          <Mat color="#8cc152" shine={0.15} />
        </mesh>
        <Bundle />
        <Pitchfork />
        {[
          [-0.4, 0.62],
          [0.45, 0.6],
          [-0.82, -0.3],
          [0.25, -0.75],
          [0.82, 0.35],
        ].map(([x, z]) => (
          <group key={`${x}`} position={[x, 0, z]}>
            {[-1, 0, 1].map((i) => (
              <mesh key={i} position={[i * 0.025, 0.05, 0]} rotation={[0, 0, i * -0.3]}>
                <coneGeometry args={[0.018, 0.12, 6]} />
                <Mat color="#5f9e3a" />
              </mesh>
            ))}
          </group>
        ))}
        {/* scattered hay stalks */}
        {[
          [-0.3, 0.45, 0.4],
          [0.15, 0.7, -0.6],
          [-0.55, 0.5, 1.4],
          [0.55, 0.15, 2.2],
        ].map(([x, z, r]) => (
          <mesh key={`${x}`} position={[x, 0.006, z]} rotation={[Math.PI / 2, 0, r]}>
            <cylinderGeometry args={[0.006, 0.006, 0.22, 6]} />
            <Mat color={HAY} />
          </mesh>
        ))}
      </Pedestal>

      <group ref={body} position={[0, 0.02, 0]}>
        {/* rubber boots */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.2, 0, 0.04]}>
            <mesh position={[0, 0.13, 0]} castShadow>
              <cylinderGeometry args={[0.095, 0.1, 0.24, 24]} />
              <Mat color={RUBBER_BOOTS} shine={0.6} glaze={0.6} />
            </mesh>
            <Ball r={0.1} color={RUBBER_BOOTS} position={[0, 0.045, 0.07]} scale={[1, 0.5, 1.4]} glaze={0.6} shine={0.6} />
            <mesh position={[0, 0.248, 0]}>
              <torusGeometry args={[0.095, 0.014, 8, 24]} />
              <Mat color={RUBBER_BOOTS} shine={0.6} />
            </mesh>
          </group>
        ))}

        {/* a lightning-bolt tail with a brown root */}
        <group ref={tail} position={[0.18, 0.4, -0.4]} rotation={[0, 0.3, 0]}>
          <mesh position={[0.08, 0.06, 0]} rotation={[0, 0, -0.9]} castShadow>
            <boxGeometry args={[0.07, 0.2, 0.05]} />
            <Mat color={BROWN} />
          </mesh>
          <mesh position={[0.18, 0.2, 0]} rotation={[0, 0, 0.5]} castShadow>
            <boxGeometry args={[0.1, 0.26, 0.05]} />
            <Mat color={YELLOW} />
          </mesh>
          <mesh position={[0.3, 0.38, 0]} rotation={[0, 0, -0.9]} castShadow>
            <boxGeometry args={[0.14, 0.32, 0.05]} />
            <Mat color={YELLOW} />
          </mesh>
        </group>

        {/* a chubby body in dungarees with a bib and suspenders */}
        <group position={[0, 0.55, 0]} scale={[1.05, 0.95, 0.95]}>
          <Ball r={0.5} color={YELLOW} shine={0.3} />
          <Cutout r={0.506} phi={[0, Math.PI * 2]} theta={[Math.PI * 0.55, Math.PI * 0.45]} color={DUNGAREES} shine={0.2} />
          <Cutout r={0.507} phi={[Math.PI / 2 - 0.42, 0.84]} theta={[Math.PI * 0.33, Math.PI * 0.24]} color={DUNGAREES} shine={0.2} />
          {[-1, 1].map((s) => (
            <Cutout key={s} r={0.507} phi={[Math.PI / 2 + s * 0.36 - 0.05, 0.1]} theta={[Math.PI * 0.08, Math.PI * 0.27]} color={DUNGAREES} shine={0.2} />
          ))}
          {/* buttons on the suspenders */}
          {[-1, 1].map((s) => (
            <Ball key={s} r={0.028} color="#d9c25a" position={[s * 0.16, 0.13, 0.47]} shine={0.8} />
          ))}
        </group>

        {/* arms */}
        {(
          [
            [leftArm, -1],
            [rightArm, 1],
          ] as const
        ).map(([arm, s]) => (
          <group key={s} position={[s * 0.44, 0.74, 0.02]}>
            <group ref={arm} rotation={[0, 0, s * 0.35]}>
              <mesh position={[0, -0.14, 0]} castShadow>
                <capsuleGeometry args={[0.075, 0.18, 8, 16]} />
                <Mat color={YELLOW} shine={0.3} />
              </mesh>
              <Ball r={0.09} color={YELLOW} position={[0, -0.3, 0.01]} shine={0.3} />
            </group>
          </group>
        ))}

        {/* the head turns around the neck */}
        <group ref={head} position={[0, 0.98, 0.02]}>
          <group position={[0, 0.38, 0]}>
            <Ball r={0.48} color={YELLOW} scale={[1.05, 0.96, 1]} shine={0.3} />
            <Ear ear={leftEar} side={-1} />
            <Ear ear={rightEar} side={1} />

            <group ref={eyes} position={[0, 0.07, 0.4]}>
              <Eye position={[-0.16, 0, 0]} r={0.1} iris="#3a2412" />
              <Eye position={[0.16, 0, 0]} r={0.1} iris="#3a2412" />
            </group>
            {/* bushy eyebrows */}
            <Eyebrows browRef={eyebrows} y={0.2} z={0.41} spacing={0.16} length={0.1} thickness={0.036} color={EYEBROWS} lean={-0.2} />

            {/* electric cheeks */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.31, -0.08, 0.35]} rotation={[0, s * 0.72, 0]} scale={[1, 1, 0.35]}>
                <sphereGeometry args={[0.085, 24, 16]} />
                <Mat color={RED} shine={0.4} glow={sparkles} />
              </mesh>
            ))}

            {/* nose */}
            <Ball r={0.045} color={BROWN} position={[0, -0.01, 0.475]} scale={[1.2, 0.9, 1]} shine={0.6} />

            <Mouth mouthRef={mouth} smileRef={smile} position={[0, -0.16, 0.44]} width={0.12} color="#6a2418" rotation={-0.4} />

            {/* a blade of grass in the corner of the mouth */}
            {/* the corner of the closed mouth (smile); it points outward to the side and forward, its start hidden in the mouth */}
            <group ref={stalk} position={[0.07, -0.1, 0.45]} rotation={[-0.5, 0, 1.1]}>
              <mesh position={[0, -0.11, 0]} castShadow>
                <cylinderGeometry args={[0.008, 0.012, 0.26, 8]} />
                <Mat color="#d9b84a" shine={0.3} />
              </mesh>
              <mesh position={[0, -0.255, 0]} rotation={[0, 0, Math.PI]}>
                <coneGeometry args={[0.012, 0.05, 8]} />
                <Mat color="#c9a640" shine={0.3} />
              </mesh>
            </group>

            {/* cap */}
            <group position={[0, 0.3, 0.02]} rotation={[-0.12, 0, 0]}>
              <mesh castShadow scale={[1.04, 0.62, 1.04]}>
                <sphereGeometry args={[0.33, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Mat color={CAP} shine={0.25} />
              </mesh>
              <mesh position={[0, 0.0, 0.2]} rotation={[0.4, 0, 0]} scale={[1, 1, 1.3]} castShadow>
                <cylinderGeometry args={[0.28, 0.28, 0.03, 32, 1, false, -Math.PI / 2, Math.PI]} />
                <Mat color={CAP} shine={0.25} />
              </mesh>
              <Ball r={0.03} color={CAP} position={[0, 0.205, 0]} shine={0.25} />
              {/* white badge at the front */}
              <mesh position={[0, 0.08, 0.315]} rotation={[-0.25, 0, 0]} scale={[1, 0.7, 0.2]}>
                <sphereGeometry args={[0.08, 20, 16]} />
                <Mat color="#ffffff" shine={0.3} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}
