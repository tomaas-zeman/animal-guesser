import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { Postavicka } from './postavicky';
import type { Nalada } from './postavicky/spolecne';

export function Scena({ postavicka, mluvi, nalada }: { postavicka: Postavicka; mluvi: boolean; nalada: Nalada }) {
  const { Komponenta } = postavicka;
  return (
    <Canvas shadows camera={{ position: [0, 1.6, 5], fov: 38 }} dpr={[1, 2]}>
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#ffffff', postavicka.pozadi[1], 0.8]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -2]} intensity={0.5} />
      <group position={[0, -0.25, 0]}>
        <Komponenta key={postavicka.id} mluvi={mluvi} nalada={nalada} />
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={5} blur={2.4} far={3} />
      </group>
      <OrbitControls
        target={[0, 1.05, 0]}
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
