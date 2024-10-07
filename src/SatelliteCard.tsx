import { useState } from 'react';
import { earth_moon_orbits } from './assets/lagrangeOrbits';

type SatelliteCardProps = {
  onStateChange: (state: number[]) => void;
};

const SatelliteCard = (props: SatelliteCardProps) => {
  const [open, setOpen] = useState(false);
  const [selectedOrbit, setSelectedOrbit] = useState<string>(
    'array_l1_halo_northern'
  );
  const [selectedOrbitIndex, setSelectedOrbitIndex] = useState(0);

  return (
    <div
      style={{
        position: 'fixed',
        width: '20vw',
        height: 'auto',
        left: '0px',
        bottom: '0px',
        zIndex: 100,
        background: '#1e1e1e',
        color: 'white',
        border: '1px solid white',
      }}
      className="noselect"
    >
      <div
        style={{
          width: '100%',
          padding: '3px',
          display: 'flex',
          cursor: 'pointer',
          justifyContent: 'space-around',
        }}
        onClick={() => setOpen((cur) => !cur)}
      >
        <div>Satellite #1</div>
      </div>
      {open && (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div>
              <select
                value={selectedOrbit}
                onChange={(event) => {
                  setSelectedOrbit(event.target.value);
                  props.onStateChange(
                    
                  //@ts-expect-error
                    earth_moon_orbits[event.target.value][selectedOrbitIndex]
                  );
                }}
              >
                {Object.keys(earth_moon_orbits).map((key) => {
                  return (
                    <option value={key}>
                      {key.toUpperCase().split('_').slice(1).join(' ')}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div>
            <input
              type="range"
              style={{ width: '90%', marginLeft: '5%' }}
              min={0}
              value={selectedOrbitIndex}
              //@ts-expect-error
              max={earth_moon_orbits[selectedOrbit].length}
              onChange={(event) => {
                setSelectedOrbitIndex(Number(event.target.value));
                props.onStateChange(
                    
                //@ts-expect-error
                  earth_moon_orbits[selectedOrbit][event.target.value]
                );
              }}
              step={1}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SatelliteCard;
