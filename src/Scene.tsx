import { ContactShadows, Environment, Lightformer, OrbitControls, Sparkles } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { Character } from './characters';
import type { Mood } from './characters/shared';

export function Scene({ character, speaking, mood }: { character: Character; speaking: boolean; mood: Mood }) {
  const { Component } = character;
  const [light, dark] = character.background;
  return (
    <Canvas
      shadows="soft"
      camera={{ position: [0, 1.45, 5.8], fov: 36 }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping }}
    >
      {/* soft light from everywhere, a key light with shadows, a back light and colored accents */}
      <ambientLight intensity={0.25} />
      <hemisphereLight args={['#fffaf2', dark, 0.9]} />
      <directionalLight
        position={[2.5, 5, 4]}
        intensity={2.1}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={6}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={3}
        shadow-camera-bottom={-1.5}
        shadow-camera-near={1}
        shadow-camera-far={15}
      />
      <directionalLight position={[-3, 3, -4]} intensity={2.4} color="#ffffff" />
      <directionalLight position={[3, 1, -3]} intensity={1.2} color={light} />
      <directionalLight position={[-4, 1.5, 3]} intensity={0.5} color={light} />
      {/* reflections for glossy eyes, metal and varnish (generated locally, nothing is downloaded) */}
      <Environment key={character.id} resolution={128} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[6, 2, 1]} />
        <Lightformer form="circle" intensity={2} position={[-4, 2, 2]} scale={2} />
        <Lightformer form="rect" intensity={1.5} color={dark} position={[4, 1, 0]} rotation-y={-Math.PI / 2} scale={[5, 3, 1]} />
        <Lightformer form="rect" intensity={1} color={light} position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
      </Environment>

      <Sparkles count={36} scale={[5, 3.2, 2.5]} position={[0, 1.6, -1.2]} size={4} speed={0.25} opacity={0.7} color="#ffffff" />

      <group position={[0, -0.3, 0]}>
        <Component key={character.id} speaking={speaking} mood={mood} />
        <ContactShadows position={[0, 0.003, 0]} opacity={0.45} scale={2.6} blur={2} far={1.5} resolution={512} color="#2a1a10" />
      </group>
      <OrbitControls
        target={[0, 1.0, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.9}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
      />
    </Canvas>
  );
}
