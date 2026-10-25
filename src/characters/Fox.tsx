import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Ball, Mat, Eyebrows, Eye, Pedestal, Mouth, Style, Cheek, useAnimace, type CharacterProps } from './shared';
import { isTense, isSad, isCheerful } from './emotions';

const ORANGE = '#f07a2a';
const WHITE = '#fff6ea';
const DARK = '#4a2a1c';
const PINK = '#ffc2b4';

export function Fox(props: CharacterProps) {
  const { body, head, eyes, mouth, smile, eyebrows } = useAnimace(props);
  const tail = useRef<THREE.Group>(null);
  const ears = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (tail.current) {
      // the tail wags with joy, nervously when tense, almost still when sad
      const speed = isCheerful(props.mood) ? 14 : isTense(props.mood) ? 7 : isSad(props.mood) ? 1.2 : 3;
      tail.current.rotation.y = Math.sin(t * speed) * 0.35;
      tail.current.rotation.z = Math.sin(t * speed * 0.5) * 0.08;
    }
    if (ears.current) {
      // the ears twitch now and then, droop when sad, perk up from curiosity and amazement
      const twitch = Math.sin(t * 9) * Math.max(0, Math.sin(t * 0.8) - 0.9) * 2;
      ears.current.children.forEach((u, i) => {
        const s = i === 0 ? -1 : 1;
        const down =
          props.mood === 'sadness' ? 0.5 : props.mood === 'disappointment' ? 0.3 : props.mood === 'curiosity' || props.mood === 'surprise' ? -0.15 : 0;
        u.rotation.z = THREE.MathUtils.lerp(u.rotation.z, -s * (0.32 + down) + s * twitch * 0.4, 0.15);
      });
    }
  });

  return (
    <Style fur>
      <Pedestal color="#8fd16a" rim="#6a9e4c">
        {/* little flowers and a mushroom in the grass */}
        {[
          [-0.75, 0.35, '#ffffff'],
          [0.7, 0.45, '#ffd84f'],
          [0.45, -0.6, '#ff9ccf'],
        ].map(([x, z, b]) => (
          <group key={`${x}`} position={[x as number, 0, z as number]}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Ball
                key={i}
                r={0.045}
                color={b as string}
                position={[Math.cos((i / 5) * Math.PI * 2) * 0.05, 0.03, Math.sin((i / 5) * Math.PI * 2) * 0.05]}
                scale={[1, 0.4, 1]}
              />
            ))}
            <Ball r={0.035} color="#ffb43a" position={[0, 0.045, 0]} />
          </group>
        ))}
        <group position={[-0.62, 0, -0.55]}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.16, 16]} />
            <Mat color="#fff3dc" />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <sphereGeometry args={[0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Mat color="#e5483b" shine={0.6} />
          </mesh>
          {[
            [0.05, 0.25, 0.06],
            [-0.06, 0.24, 0.04],
            [0, 0.27, -0.06],
          ].map(([x, y, z]) => (
            <Ball key={`${x}${z}`} r={0.022} color="#ffffff" position={[x, y, z]} />
          ))}
        </group>
      </Pedestal>

      <group ref={body}>
        {/* body */}
        <Ball r={0.5} color={ORANGE} position={[0, 0.6, 0]} scale={[1, 1.12, 0.95]} />
        <Ball r={0.36} color={WHITE} position={[0, 0.55, 0.22]} scale={[1, 1.2, 0.8]} />
        {/* paws */}
        {[-0.22, 0.22].map((x) => (
          <Ball key={x} r={0.15} color={DARK} position={[x, 0.1, 0.2]} scale={[1, 0.65, 1.3]} />
        ))}
        {[-1, 1].map((s) => (
          <Ball key={s} r={0.13} color={DARK} position={[s * 0.36, 0.62, 0.3]} scale={[0.9, 1.2, 0.9]} rotation={[0, 0, s * 0.3]} />
        ))}
        {/* fluffy tail */}
        <group ref={tail} position={[0, 0.35, -0.42]}>
          <Ball r={0.22} color={ORANGE} position={[0.12, 0.05, -0.15]} />
          <Ball r={0.3} color={ORANGE} position={[0.3, 0.32, -0.3]} />
          <Ball r={0.27} color={ORANGE} position={[0.42, 0.65, -0.3]} />
          <Ball r={0.2} color={WHITE} position={[0.46, 0.9, -0.24]} />
        </group>
        {/* head */}
        <group ref={head} position={[0, 1.45, 0]}>
          <Ball r={0.6} color={ORANGE} scale={[1.14, 0.96, 0.98]} />
          {/* white cheek fluff */}
          {[-1, 1].map((s) => (
            <Ball key={s} r={0.22} color={WHITE} position={[s * 0.27, -0.25, 0.3]} scale={[1.1, 0.72, 0.8]} />
          ))}
          {/* short round muzzle */}
          <Ball r={0.2} color={WHITE} position={[0, -0.16, 0.48]} scale={[1.15, 0.85, 1]} />
          <Ball r={0.07} color="#1a1010" position={[0, -0.08, 0.67]} scale={[1.35, 1, 1]} shine={0.85} glaze={1} />
          {/* ears */}
          <group ref={ears}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.38, 0.46, -0.05]} rotation={[0, 0, -s * 0.32]} scale={1.15}>
                <mesh castShadow>
                  <coneGeometry args={[0.22, 0.52, 32]} />
                  <Mat color={ORANGE} />
                </mesh>
                <mesh position={[0, -0.03, 0.09]} scale={[1, 1, 0.45]}>
                  <coneGeometry args={[0.14, 0.36, 24]} />
                  <Mat color={PINK} />
                </mesh>
                <mesh position={[0, 0.155, 0]}>
                  <coneGeometry args={[0.1, 0.215, 32]} />
                  <Mat color={DARK} />
                </mesh>
              </group>
            ))}
          </group>
          <group ref={eyes} position={[0, 0.06, 0.48]}>
            <Eye position={[-0.25, 0, 0]} r={0.15} iris="#7a4a1c" />
            <Eye position={[0.25, 0, 0]} r={0.15} iris="#7a4a1c" />
          </group>
          <Eyebrows browRef={eyebrows} y={0.27} z={0.5} spacing={0.25} color={DARK} lean={0.15} />
          <Cheek position={[-0.42, -0.13, 0.4]} />
          <Cheek position={[0.42, -0.13, 0.4]} />
          <Mouth mouthRef={mouth} smileRef={smile} position={[0, -0.25, 0.63]} width={0.08} rotation={-0.3} />
        </group>
      </group>
    </Style>
  );
}
