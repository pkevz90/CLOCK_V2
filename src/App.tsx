import { useState, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import {
  Billboard,
  Line,
  OrbitControls,
  Text
} from '@react-three/drei';
import { Vector3, TextureLoader } from 'three';
import earthImage from './assets/earthmap1k.jpg';
import moonImage from './assets/moonmap1k.jpg';
import {
  calculateStateHistory,
  calculateTertiaryObjectLocation,
  eci2synodicUnitlessRotation,
  getCurrentState,
  solveJacobiBoundaries,
} from './old/cislunar_v3';
import SatelliteCard from './SatelliteCard';
import { multiply, transpose } from 'mathjs';
import { earthEciRotation, rotationMatrixToQuaternion } from './old/astro_vz_new';
const lengthUnit = 389703;
const timeUnit = 382981;
const lagrangePoints = [
  [0.83691513, 0, 0],
  [1.15568217, 0, 0],
  [-1.00506265, 0, 0],
  [0.48784941, 0.8660254, 0],
  [0.48784941, -0.8660254, 0],
];
function App() {
  const [mu] = useState(0.012150585609624039);
  const [startTime] = useState(new Date().getTime());
  const [scenarioLength, setScenarioLength] = useState(20 * 86400);
  const [currentTime, setCurrentTime] = useState(startTime + 4 * 7200000);
  const [body1Radius] = useState(6371 / lengthUnit);
  const [body2Radius] = useState(1737 / lengthUnit);
  const [body3Radius] = useState(695700 / lengthUnit);
  const [cameraFocus, setCameraTarget] = useState([0, 0, 0]);
  const [state, setState] = useState([
    0.8046041230433255, -2.0086159873362003e-27, 2.3170224250355804e-33,
    -1.1551909511823547e-14, 0.3229610944780089, 1.3354090725058918e-31,
  ]);
  const [stateHistory, setStateHistory] = useState<
    {
      t: number;
      state: number[];
    }[]
  >([]);

  const earthRotationQuaternion = rotationMatrixToQuaternion(multiply(earthEciRotation(new Date(currentTime)),transpose(eci2synodicUnitlessRotation(currentTime))))
    
  useEffect(
    () =>
      setStateHistory(
        calculateStateHistory(
          state,
          (20 * 86400) / timeUnit,
          1e-8,
          1000 / timeUnit
        )
      ),
    [state, mu]
  );
  useEffect(
    () =>
      setJacobiBoundaries(
        solveJacobiBoundaries(state, mu, 0).map((boundary) => boundary.line)
      ),
    [state, mu]
  );
  const [jacobiBoundaries, setJacobiBoundaries] = useState<number[][][]>([]);
  const currentSun = calculateTertiaryObjectLocation(currentTime);

  const earthTexture = useLoader(TextureLoader, earthImage);
  const moonTexture = useLoader(TextureLoader, moonImage);
  const currentState =
    stateHistory.length > 0 &&
    getCurrentState(stateHistory, (currentTime - startTime) / 1000 / timeUnit);

  return (
    <div
      style={{ width: '100vw', height: '100vh', backgroundColor: '#1e1e1e' }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          width: '100vw',
          height: '10vh',
          zIndex: 100,
        }}
      >
        <div>
          <input
            type="range"
            style={{ width: '90vw', marginLeft: '5vw', marginTop: '2.5vh' }}
            min={startTime}
            max={startTime + 1000 * scenarioLength}
            value={currentTime}
            onChange={(event) => setCurrentTime(Number(event.target.value))}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            color: 'white',
          }}
        >
          <div>{new Date(currentTime).toISOString()}</div>
        </div>
      </div>
      <SatelliteCard
        onStateChange={(state: number[]) => {
          setScenarioLength(state[7] * timeUnit);
          setState(state.slice(0, 6));
        }}
      />
      <Canvas
        camera={{
          fov: 50,
          position: [0, 1.25, 0],
          near: 0.0001,
        }}
      >
        <OrbitControls
          target={new Vector3(cameraFocus[0], cameraFocus[2], -cameraFocus[1])}
          dampingFactor={0.9}
          enablePan={false}
        />
        <directionalLight
          position={[currentSun[0], currentSun[2], -currentSun[1]]}
          intensity={10}
        />
        <Line 
          points={[
            [-mu, 0, 0],
            [-mu+6371*2/lengthUnit,0,0]
          ]}
          color={'white'}
        />
        <ambientLight intensity={0.2} />
        <mesh
          position={[-mu, 0, 0]}
          onClick={() => setCameraTarget([-mu, 0, 0])}
          quaternion={[
            earthRotationQuaternion[0],
            earthRotationQuaternion[2],
            -earthRotationQuaternion[1],
            earthRotationQuaternion[3]
          ]}
        >
          <sphereGeometry args={[body1Radius, 32, 32]} />
          <meshStandardMaterial map={earthTexture} />
        </mesh>
        <mesh position={[-mu, 0, 0]}>
          <sphereGeometry args={[42164 / lengthUnit, 64, 64]} />
          <meshBasicMaterial color={'white'} transparent opacity={0.025} />
        </mesh>

        <mesh
          position={[1 - mu, 0, 0]}
          onClick={() => setCameraTarget([1 - mu, 0, 0])}
        >
          <sphereGeometry args={[body2Radius * 6, 64, 64]} />
          <meshBasicMaterial color={'white'} transparent opacity={0.0} />
        </mesh>
        <mesh
          position={[1 - mu, 0, 0]}
          onClick={() => setCameraTarget([1 - mu, 0, 0])}
        >
          <sphereGeometry args={[body2Radius, 32, 32]} />
          <meshStandardMaterial map={moonTexture} />
        </mesh>
        <mesh position={[currentSun[0], currentSun[2], -currentSun[1]]}>
          <sphereGeometry args={[body3Radius, 32, 32]} />
          <meshBasicMaterial color={'#ffff88'} />
        </mesh>
        {lagrangePoints.map((point, pointIi) => {
          return (
            <Billboard
              follow
              position={[point[0], point[2], -point[1]]}
              onClick={() => setCameraTarget([point[0], point[1], point[2]])}
            >
              <Text
                color={'#ff9999'}
                outlineColor={'black'}
                fontSize={0.04}
                outlineWidth={0.00025}
              >
                L{pointIi + 1}
              </Text>
            </Billboard>
          );
        })}
        {jacobiBoundaries.map((boundary) => {
          return (
            <Line
              points={boundary.map(
                (point) => new Vector3(point[0], point[2], -point[1])
              )}
              color={'red'}
            />
          );
        })}
        <Line
          points={stateHistory.map(
            (point) =>
              new Vector3(point.state[0], point.state[2], -point.state[1])
          )}
          color={'white'}
        />

        {currentState && (
          <mesh position={[currentState[0], currentState[2], -currentState[1]]}>
            <sphereGeometry args={[1000 / lengthUnit, 32, 32]} />
            <meshBasicMaterial color={'#7f7'} />
          </mesh>
        )}
      </Canvas>
    </div>
  );
}

export default App;
