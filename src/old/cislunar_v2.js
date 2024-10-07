let circleTrig = math
  .range(0, 360, 12, false)
  ._data.map((s) => (s * Math.PI) / 180)
  .map((s) => [Math.sin(s), Math.cos(s)]);

let mainWindow = {
  startTime: new Date(2023, 9, 1),
  scenarioLength: 2.4622806759970263e1 / 2,
  scenarioTime: 0,
  scenarioTimeDesired: 0,
  moonGravity: true,
  showMoonPhase: false,
  placeTrajectory: false,
  placeTrajectoryData: {
    position: undefined,
    velocity: undefined,
  },
  moonFrame: true,
  animationSpeed: 0,
  tubeManN: 25,
  plotManN: 50,
  planeCrossings: 0,
  colors: {
    primaryBody: '#224466',
    secondaryBody: '#666666',
    secondaryBodyShadow: '#222222',
    primaryBodyShadow: '#112233',
    tertiaryBody: 'yellow',
    sun: 'yellow',
    rPrimary: 6371,
    rSecondary: 1738,
    rTertiary: 695700,
  },
  mousePosition: undefined,
  mouseDown: false,
  epsilon: 1e-8,
  timeUnit: 382981,
  dt: 1000,
  manifoldLimit: undefined,
  eigEpsilon: 100,
  eigPropTime: 50,
  zBoundaryLevel: 0,
  plot: undefined,
  lagrangePoints: [
    [0.83691513, 0, 0],
    [1.15568217, 0, 0],
    [-1.00506265, 0, 0],
    [0.48784941, 0.8660254, 0],
    [0.48784941, -0.8660254, 0],
  ],
  primaryBody: 'Earth',
  secondaryBody: 'Moon',
  tertiaryBody: 'Sun',
  lengthUnit: 389703,
  mu: 0.012150585609624039,
  jacobiConstant: 0,
  zAxis: false,
  view: {
    el: 90,
    az: 0,
    center: [0, 0, 0],
    centerSat: undefined,
    zoom: 1.5,
    desired: {
      el: 90,
      az: 0,
      center: [0, 0, 0],
      zoom: 1.5,
    },
  },
  physicalConstants: {
    deg2rad: (2 * Math.PI) / 180,
    rEarth: 6371,
    rMoon: 1738,
    rSun: 695700,
    muEarth: 398600.4418,
    muMoon: 4904.8695,
    muSun: 130508553596.53285,
    a: 3.0542e-6,
    massEarth: 5.972168e24,
    massMoon: 7.342e22,
  },
  state: [0.8, 0, 0, 0, 0, 0],
  stateHistory: [undefined, undefined, undefined],
  satellites: [
    {
      state: [0.8, 0, 0, 0, 0, 0],
      stateHistory: undefined,
      color: '#6666dd',
      manifolds: [],
      name: 'Sat #1',
    },
  ],
  analystSats: [
    // {
    //     state: [0.8,0,0,0,0,0],
    //     stateHistory: undefined
    // }
  ],
  referenceOrbits: [],
  displayedPoints: [],
  displayedLines: [],
  moonHistory: undefined,
  cnvs: document.querySelector('canvas'),
};
let dt = 3600;
let timeFunction = false;
function animationLoop() {
  try {
    if (timeFunction) console.time();
    drawScene();

    mainWindow.view.center = math.add(
      mainWindow.view.center,
      math
        .subtract(mainWindow.view.desired.center, mainWindow.view.center)
        .map((s) => s * 0.2)
    );
    mainWindow.view.zoom +=
      (mainWindow.view.desired.zoom - mainWindow.view.zoom) * 0.2;
    mainWindow.view.el +=
      (mainWindow.view.desired.el - mainWindow.view.el) * 0.5;
    mainWindow.view.az +=
      (mainWindow.view.desired.az - mainWindow.view.az) * 0.5;
    mainWindow.scenarioTime +=
      (mainWindow.scenarioTimeDesired - mainWindow.scenarioTime) * 0.5;
    mainWindow.scenarioTimeDesired += (mainWindow.animationSpeed / 60) * 86400;
    if (mainWindow.scenarioTime / 86400 > mainWindow.scenarioLength) {
      mainWindow.scenarioTime = mainWindow.scenarioLength * 84600;
    }
    if (timeFunction) console.timeEnd();
    window.requestAnimationFrame(animationLoop);
  } catch (error) {
    console.log(error);
    mainWindow.scenarioTime = 0;
    // animationLoop()
  }
}
openOrbitDiv();
openDraggableDiv();
animationLoop();

function calculateTertiaryObjectLocation() {
  if (mainWindow.primaryBody === 'Earth') {
    let sunPos = astro.sunEciFromTime(
      new Date(mainWindow.startTime - -1000 * mainWindow.scenarioTime)
    );
    sunPos = eci2synodicUnitless(
      [...sunPos, 0, 0, 0],
      new Date(mainWindow.startTime - -1000 * mainWindow.scenarioTime)
    ).slice(0, 3);
    return sunPos;
  } else {
    let moonPos = astro.moonEciFromTime(
      new Date(mainWindow.startTime - -1000 * mainWindow.scenarioTime)
    );
    moonPos = eci2solarUnitless(
      [...moonPos, 0, 0, 0],
      new Date(mainWindow.startTime - -1000 * mainWindow.scenarioTime)
    ).slice(0, 3);
    return moonPos;
  }
}

function crtbpAcceleration(state = [1, 1, 1, 0, 0, 0]) {
  let mu = mainWindow.mu;
  let x = state[0],
    y = state[1],
    z = state[2],
    dx = state[3],
    dy = state[4],
    dz = state[5];
  let y2 = y ** 2,
    z2 = z ** 2;
  let r1 = ((x + mu) ** 2 + y2 + z2) ** 0.5;
  let r2 = ((x + mu - 1) ** 2 + y2 + z2) ** 0.5;
  let r1cube = r1 ** 3,
    r2cube = r2 ** 3;
  let moonGravity = mainWindow.moonGravity ? 1 : 0;
  return [
    ...state.slice(3),
    (-(1 - mu) * (x + mu)) / r1cube -
      (moonGravity * mu * (x - 1 + mu)) / r2cube +
      2 * dy +
      x,
    (-(1 - mu) * y) / r1cube - (moonGravity * mu * y) / r2cube - 2 * dx + y,
    (-(1 - mu) * z) / r1cube - (moonGravity * mu * z) / r2cube,
  ];
}
function bcrfbpAcceleration(state = [1, 1, 1, 0, 0, 0], options = {}) {
  let { sunAngle = 0 } = options;
  let mu = mainWindow.mu;
  let x = state[0],
    y = state[1],
    z = state[2],
    dx = state[3],
    dy = state[4];
  let y2 = y ** 2,
    z2 = z ** 2;
  let r1 = ((x + mu) ** 2 + y2 + z2) ** 0.5;
  let r2 = ((x + mu - 1) ** 2 + y2 + z2) ** 0.5;
  let r1cube = r1 ** 3,
    r2cube = r2 ** 3;
  let ms =
      (mainWindow.physicalConstants.muSun * (1 - mu)) /
      mainWindow.physicalConstants.muEarth,
    as = 149_600_000 / mainWindow.lengthUnit;

  let sunPos = [as * Math.cos(sunAngle), as * Math.sin(sunAngle), 0];
  let rs3 = ((sunPos[0] - x) ** 2 + (sunPos[1] - y) ** 2 + z2) ** 0.5;
  let rscube = rs3 ** 3;

  return [
    ...state.slice(3),
    (-(1 - mu) * (x + mu)) / r1cube -
      (mu * (x - 1 + mu)) / r2cube +
      2 * dy +
      x -
      (ms * (x - sunPos[0])) / rscube -
      (ms * sunPos[0]) / rscube,
    (-(1 - mu) * y) / r1cube -
      (mu * y) / r2cube -
      2 * dx +
      y -
      (ms * (y - sunPos[1])) / rscube -
      (ms * sunPos[1]) / rscube,
    (-(1 - mu) * z) / r1cube - (mu * z) / r2cube - (ms * z) / rscube,
  ];
}

function rkf45(
  state = [mainWindow.lagrangePoints[0][0], 0, 0, 0, 0, 0],
  h = 0.01,
  epsilon = 1e-3
) {
  let k1 = math.dotMultiply(h, crtbpAcceleration(state));
  let k2 = math.dotMultiply(
    h,
    crtbpAcceleration(math.add(state, math.dotMultiply(2 / 9, k1)))
  );
  let k3 = math.dotMultiply(
    h,
    crtbpAcceleration(
      math.add(state, math.dotMultiply(1 / 12, k1), math.dotMultiply(1 / 4, k2))
    )
  );
  let k4 = math.dotMultiply(
    h,
    crtbpAcceleration(
      math.add(
        state,
        math.dotMultiply(69 / 128, k1),
        math.dotMultiply(-243 / 128, k2),
        math.dotMultiply(135 / 64, k3)
      )
    )
  );
  let k5 = math.dotMultiply(
    h,
    crtbpAcceleration(
      math.add(
        state,
        math.dotMultiply(-17 / 12, k1),
        math.dotMultiply(27 / 4, k2),
        math.dotMultiply(-27 / 5, k3),
        math.dotMultiply(16 / 15, k4)
      )
    )
  );
  let k6 = math.dotMultiply(
    h,
    crtbpAcceleration(
      math.add(
        state,
        math.dotMultiply(65 / 432, k1),
        math.dotMultiply(-5 / 16, k2),
        math.dotMultiply(13 / 16, k3),
        math.dotMultiply(4 / 27, k4),
        math.dotMultiply(5 / 144, k5)
      )
    )
  );
  let y = math.add(
    state,
    math.dotMultiply(47 / 450, k1),
    math.dotMultiply(12 / 25, k3),
    math.dotMultiply(32 / 225, k4),
    math.dotMultiply(1 / 30, k5),
    math.dotMultiply(6 / 25, k6)
  );

  let te = math.norm(
    math.add(
      math.dotMultiply(-1 / 150, k1),
      math.dotMultiply(3 / 100, k3),
      math.dotMultiply(-16 / 75, k4),
      math.dotMultiply(-1 / 20, k5),
      math.dotMultiply(6 / 25, k6)
    )
  );
  let hnew = 0.9 * h * (epsilon / te) ** 0.2;
  if (te > epsilon) {
    y = state;
    h = 0;
  }
  return { y, hnew, dt: h, te };
}

function rkf45BiCirc(
  state = [mainWindow.lagrangePoints[0][0], 0, 0, 0, 0, 0],
  h = 0.01,
  epsilon = 1e-3,
  sunAngle
) {
  let k1 = math.dotMultiply(h, bcrfbpAcceleration(state, { sunAngle }));
  let k2 = math.dotMultiply(
    h,
    bcrfbpAcceleration(math.add(state, math.dotMultiply(2 / 9, k1)), {
      sunAngle,
    })
  );
  let k3 = math.dotMultiply(
    h,
    bcrfbpAcceleration(
      math.add(
        state,
        math.dotMultiply(1 / 12, k1),
        math.dotMultiply(1 / 4, k2)
      ),
      { sunAngle }
    )
  );
  let k4 = math.dotMultiply(
    h,
    bcrfbpAcceleration(
      math.add(
        state,
        math.dotMultiply(69 / 128, k1),
        math.dotMultiply(-243 / 128, k2),
        math.dotMultiply(135 / 64, k3)
      ),
      { sunAngle }
    )
  );
  let k5 = math.dotMultiply(
    h,
    bcrfbpAcceleration(
      math.add(
        state,
        math.dotMultiply(-17 / 12, k1),
        math.dotMultiply(27 / 4, k2),
        math.dotMultiply(-27 / 5, k3),
        math.dotMultiply(16 / 15, k4)
      ),
      { sunAngle }
    )
  );
  let k6 = math.dotMultiply(
    h,
    bcrfbpAcceleration(
      math.add(
        state,
        math.dotMultiply(65 / 432, k1),
        math.dotMultiply(-5 / 16, k2),
        math.dotMultiply(13 / 16, k3),
        math.dotMultiply(4 / 27, k4),
        math.dotMultiply(5 / 144, k5)
      ),
      { sunAngle }
    )
  );
  let y = math.add(
    state,
    math.dotMultiply(47 / 450, k1),
    math.dotMultiply(12 / 25, k3),
    math.dotMultiply(32 / 225, k4),
    math.dotMultiply(1 / 30, k5),
    math.dotMultiply(6 / 25, k6)
  );

  let te = math.norm(
    math.add(
      math.dotMultiply(-1 / 150, k1),
      math.dotMultiply(3 / 100, k3),
      math.dotMultiply(-16 / 75, k4),
      math.dotMultiply(-1 / 20, k5),
      math.dotMultiply(6 / 25, k6)
    )
  );
  let hnew = 0.9 * h * (epsilon / te) ** 0.2;
  if (te > epsilon) {
    y = state;
    h = 0;
  }
  return { y, hnew, dt: h, te };
}

function calculateStateHistory(
  state = mainWindow.satellites[0].state,
  length = mainWindow.scenarioLength,
  error = mainWindow.epsilon
) {
  let t = 0,
    dt = math.sign(length) * mainWindow.dt,
    history = [];
  dt /= mainWindow.timeUnit;
  length *= 86400 / mainWindow.timeUnit;
  let initSunAngle = 0;
  // length = 2000/tu
  while (math.abs(t) <= math.abs(length)) {
    history.push({
      t,
      state: state.slice(),
    });
    let proppedState = rkf45BiCirc(state, dt, error, initSunAngle + t);
    // console.log(proppedState,state, crtbpAcceleration(state), bcrfbpAcceleration(state,{sunAngle: initSunAngle+t}))
    // console.log(proppedState.te, dt);
    dt = proppedState.hnew;
    state = proppedState.y;
    t += proppedState.dt;
  }
  let proppedState = rkf45BiCirc(
    state,
    length - t,
    error,
    initSunAngle + length
  );

  history.push({
    t: length,
    state: proppedState.y,
  });
  // console.log(history.length);
  return history;
}

function calculateStateHistoryToValue(
  state = mainWindow.state,
  length = mainWindow.scenarioLength,
  error = mainWindow.epsilon,
  value = {}
) {
  let {
    xLimit = false,
    tolerance = 1e-6,
    returnHistory = true,
    objFunction = false,
    objFunctionValue,
  } = value;
  let t = 0,
    dt = math.sign(length) * mainWindow.dt,
    history = [];
  let functionCrosses = 1;
  dt /= mainWindow.timeUnit;
  length *= 86400 / mainWindow.timeUnit;
  let stateOld = state.slice();
  let initObjValue;
  // length = 2000/tu
  while (math.abs(t) <= math.abs(length)) {
    history.push({
      t,
      state: state.slice(),
    });
    let proppedState = rkf45(state, dt, error);

    dt = proppedState.hnew;
    state = proppedState.y;
    t += proppedState.dt;
    if (math.abs(dt) < 0.00018) {
      return history;
    }
    if (objFunction !== false) {
      let oldValue = objFunction(stateOld) - objFunctionValue;
      let newValue = objFunction(state) - objFunctionValue;
      if (oldValue * newValue < 0) {
        // console.log(state, stateOld);
        if (functionCrosses < 1) {
          stateOld = state.slice();
          functionCrosses++;
          continue;
        }
        let tol = 1000,
          limit = 100,
          lim = 0;
        while (tol > tolerance && lim < limit) {
          dt /= -2;
          oldValue = newValue;
          while (oldValue * newValue > 0) {
            state = rkf45(state, dt, error).y;
            t += dt;
            newValue = objFunction(state) - objFunctionValue;
          }
          tol = math.abs(objFunction(state) - objFunctionValue);
          // console.log(tol, lim, limit, objFunctionValue, newValue);
          lim++;
        }
        history.push({
          t,
          state,
        });
        // console.log(newValue, math.norm(math.subtract(state.slice(0,3),[-mainWindow.mu, 0, 0]))*mainWindow.lengthUnit);
        return history;
      }
    }
    if (mainWindow.killFunction !== undefined) {
      let oldValue = mainWindow.killFunction(stateOld);
      let newValue = mainWindow.killFunction(state);
      if (oldValue * newValue < 0) {
        // Kill prop
        return [];
      }
    }
  }
  // console.log('no solution');
  if (objFunction !== false) return [];
  let proppedState = rkf45(state, length - t, error);
  history.push({
    t: length,
    state: proppedState.y,
  });
  // console.log(history.length);
  return history;
}

function updateCnvsSize() {
  mainWindow.cnvs.width = window.innerWidth;
  mainWindow.cnvs.height = window.innerHeight;
}

function getCurrentState(history, time) {
  let currentTime = time / mainWindow.timeUnit;
  let states = history.filter((s) => s.t <= currentTime);
  // console.log(states.length);
  states = states[states.length - 1];
  // console.log(states.state, currentTime-states.t, 100);
  return rkf45(states.state, currentTime - states.t, 100).y;
}

function recalcTraj(s) {
  mainWindow.satellites.forEach((sat, ii) => {
    if (s === undefined) {
      sat.stateHistory = undefined;
    } else {
      if (s === ii) {
        sat.stateHistory = undefined;
      }
    }
  });
}

function get3dLinePoints(
  points = [
    [100, 200, 100],
    [300, 400, 200],
    [900, 500, -100],
  ],
  options = {}
) {
  let { closed = false, color = '#ff00000', size = 2.5 } = options;
  let outPoints = [];
  for (let index = 0; index < points.length; index++) {
    if (index < points.length - 1) {
      outPoints.push({
        color,
        position: [
          points[index],
          points[index + 1],
          (points[index][2] + points[index + 1][2]) / 2,
        ],
        size,
      });
    } else if (closed) {
      outPoints.push({
        color,
        position: [
          points[index],
          points[0],
          (points[index][2] + points[0][2]) / 2,
        ],
        size,
      });
    }
  }
  return outPoints;
}
function drawScene() {
  updateCnvsSize();
  let rotEci = math.identity([3]);
  if (!mainWindow.moonFrame) {
    rotEci = astro.rot(
      -mainWindow.scenarioTime / mainWindow.timeUnit,
      3,
      false
    );
  }
  let center = mainWindow.view.center;
  if (!mainWindow.moonFrame) {
    mainWindow.view.desired.center = [-mainWindow.mu, 0, 0];
  } else if (mainWindow.view.centerSat !== undefined) {
    let currentCenter = getCurrentState(
      mainWindow.satellites[mainWindow.view.centerSat].stateHistory,
      mainWindow.scenarioTime
    );
    mainWindow.view.desired.center = currentCenter.slice(0, 3);
  }
  let points = [];

  let f3d = 8;
  let rot3dInert = math.multiply(
    astro.rot(90 - mainWindow.view.el, 1),
    astro.rot(-mainWindow.view.az, 3)
  );
  let rot3d = math.multiply(
    astro.rot(90 - mainWindow.view.el, 1),
    astro.rot(-mainWindow.view.az, 3),
    rotEci
  );
  // console.log(astro.rot(mainWindow.scenarioTime/mainWindow.timeUnit*360,3));

  // console.log(sunPos);
  let screenDistance = mainWindow.view.zoom;

  let viewDistance = screenDistance / 2;
  let viewPosition = [0, 0, screenDistance * 3];
  viewPosition = viewPosition;
  // console.log(viewPosition);
  let width =
    window.innerHeight < window.innerWidth
      ? (screenDistance * window.innerWidth) / window.innerHeight
      : screenDistance;
  let height = (width * window.innerHeight) / window.innerWidth;

  let cnvs = mainWindow.cnvs;
  let ctx = cnvs.getContext('2d');
  // Reset Scene
  ctx.fillStyle = '#111122';
  ctx.fillRect(0, 0, cnvs.width, cnvs.height);

  // Calculate Sun Position
  let sunPos = calculateTertiaryObjectLocation();
  try {
    let selects = [...document.querySelectorAll('.pointing-select')].map(
      (s) => {
        return {
          sat: Number(s.getAttribute('sat')),
          value: Number(s.value),
          el: s,
          displays:
            s.parentElement.parentElement.querySelectorAll('.data-display'),
        };
      }
    );
    selects.forEach((s) => {
      if (s.value === -1) {
        s.el.parentElement.parentElement.querySelector(
          '.pointing-display'
        ).style.display = 'none';
        return;
      } else {
        s.el.parentElement.parentElement.querySelector(
          '.pointing-display'
        ).style.display = '';
      }
      let origin = getCurrentState(
        mainWindow.satellites[s.sat].stateHistory,
        mainWindow.scenarioTime
      );
      let target = getCurrentState(
        mainWindow.satellites[s.value].stateHistory,
        mainWindow.scenarioTime
      );
      let relativePosition = math.subtract(target, origin).slice(0, 3);
      let relativeEarth = math.subtract(
        [-mainWindow.mu, 0, 0],
        origin.slice(0, 3)
      );
      let relativeMoon = math.subtract(
        [1 - mainWindow.mu, 0, 0],
        origin.slice(0, 3)
      );
      let relativeSun = math.subtract(sunPos, origin.slice(0, 3));
      let moonAngle =
        (Math.acos(
          math.dot(relativeMoon, relativePosition) /
            math.norm(relativeMoon) /
            math.norm(relativePosition)
        ) *
          180) /
        Math.PI;
      let earthAngle =
        (Math.acos(
          math.dot(relativeEarth, relativePosition) /
            math.norm(relativeEarth) /
            math.norm(relativePosition)
        ) *
          180) /
        Math.PI;
      let sunAngle =
        (Math.acos(
          math.dot(relativeSun, relativePosition) /
            math.norm(relativeSun) /
            math.norm(relativePosition)
        ) *
          180) /
        Math.PI;
      let range = math.norm(relativePosition);
      let moonIllumination = astro.moonPhaseFromAngle(
        origin.slice(0, 3),
        [1 - mainWindow.mu, 0, 0],
        sunPos
      );
      let earthIllumination = astro.moonPhaseFromAngle(
        origin.slice(0, 3),
        [-mainWindow.mu, 0, 0],
        sunPos
      );
      s.displays[0].innerText =
        (mainWindow.lengthUnit * range).toFixed(2) + ' km';
      s.displays[1].innerText = (earthIllumination * 100).toFixed(1) + '%';
      s.displays[2].innerText = earthAngle.toFixed(2) + ' deg';
      s.displays[3].innerText = sunAngle.toFixed(2) + ' deg';
      s.displays[4].innerText = (moonIllumination * 100).toFixed(1) + '%';
      s.displays[5].innerText = moonAngle.toFixed(2) + ' deg';
      range += 0.05;
      let color = 'rgba(255,255,255,0.25) ',
        halfAngle = 2;
      let sensorCenter = origin.slice(0, 3);
      let sensorVector;
      sensorVector = math.subtract(target.slice(0, 3), sensorCenter);
      sensorVector = math.dotDivide(sensorVector, math.norm(sensorVector));

      let sensorRotMatrix = findRotationMatrix([0, 1, 0], sensorVector);
      let linePoints = [];
      let outerCircleRange = range * Math.cos((halfAngle * Math.PI) / 180);
      let sensorRadius = range * Math.sin((halfAngle * Math.PI) / 180);
      let circleCenter = [0, 1, 0].map((s) => s * outerCircleRange);
      // draw concentric cirles to sensor's range
      let circlePoints1 = circleTrig.map((ang, ii) => {
        let ricCirclePoint = [sensorRadius * ang[0], 0, sensorRadius * ang[1]];
        let point = math.add(circleCenter, ricCirclePoint);
        if (ii % 3 === 0) linePoints.push(point);
        return math.multiply(
          rot3d,
          math.subtract(
            math.add(sensorCenter, math.multiply(sensorRotMatrix, point)),
            center
          )
        );
      });
      let circlePoints2 = circleTrig.map((ang) => {
        let ricCirclePoint = [sensorRadius * ang[0], 0, sensorRadius * ang[1]];
        let point = math.add(
          circleCenter,
          math.subtract(
            ricCirclePoint.map((s) => s * 0.333),
            [0, outerCircleRange * 0.6667, 0]
          )
        );
        return math.multiply(
          rot3d,
          math.subtract(
            math.add(sensorCenter, math.multiply(sensorRotMatrix, point)),
            center
          )
        );
      });
      let circlePoints3 = circleTrig.map((ang) => {
        let ricCirclePoint = [sensorRadius * ang[0], 0, sensorRadius * ang[1]];
        let point = math.add(
          circleCenter,
          math.subtract(
            ricCirclePoint.map((s) => s * 0.666),
            [0, outerCircleRange * 0.333, 0]
          )
        );
        return math.multiply(
          rot3d,
          math.subtract(
            math.add(sensorCenter, math.multiply(sensorRotMatrix, point)),
            center
          )
        );
      });
      let circlePoints4 = circleTrig.map((ang) => {
        let sensorSphereRadius = range * Math.sin((halfAngle * Math.PI) / 270);
        let outerSphereCircleRange =
          range * Math.cos((halfAngle * Math.PI) / 270);
        // console.log(sensorSphereRadius, outerSphereCircleRange, outerCircleRange);
        let ricCirclePoint = [
          sensorSphereRadius * ang[0],
          0,
          sensorSphereRadius * ang[1],
        ];
        let point = math.add(
          circleCenter,
          math.add(ricCirclePoint, [
            0,
            outerSphereCircleRange - outerCircleRange,
            0,
          ])
        );
        return math.multiply(
          rot3d,
          math.subtract(
            math.add(sensorCenter, math.multiply(sensorRotMatrix, point)),
            center
          )
        );
      });
      let circlePoints5 = circleTrig.map((ang) => {
        let sensorSphereRadius = range * Math.sin((halfAngle * Math.PI) / 540);
        let outerSphereCircleRange =
          range * Math.cos((halfAngle * Math.PI) / 540);
        // console.log(sensorSphereRadius, outerSphereCircleRange, outerCircleRange);
        let ricCirclePoint = [
          sensorSphereRadius * ang[0],
          0,
          sensorSphereRadius * ang[1],
        ];
        let point = math.add(
          circleCenter,
          math.add(ricCirclePoint, [
            0,
            outerSphereCircleRange - outerCircleRange,
            0,
          ])
        );
        return math.multiply(
          rot3d,
          math.subtract(
            math.add(sensorCenter, math.multiply(sensorRotMatrix, point)),
            center
          )
        );
      });
      points.push(
        ...get3dLinePoints(circlePoints1, { color, closed: true, size: 1.25 })
      );
      points.push(
        ...get3dLinePoints(circlePoints2, { color, closed: true, size: 1.25 })
      );
      points.push(
        ...get3dLinePoints(circlePoints3, { color, closed: true, size: 1.25 })
      );
      points.push(
        ...get3dLinePoints(circlePoints4, { color, closed: true, size: 1.25 })
      );
      points.push(
        ...get3dLinePoints(circlePoints5, { color, closed: true, size: 1.25 })
      );
      // Draw line to outermost circle to further define sensor volume
      let outerSphericalLines = math.range(0, 16, true)._data.map((iter) => {
        let angle =
          ((-halfAngle + (2 * halfAngle * iter) / 16) * Math.PI) / 180;
        return [Math.sin(angle) * range, Math.cos(angle) * range, 0];
      });
      linePoints.forEach((pointIn, ii) => {
        let angle = (math.atan2(pointIn[2], pointIn[0]) * 180) / Math.PI;
        let outerSphereLinesRotMatrix = astro.rot(angle, 2);
        let pointForLines = math
          .range(0, 10, true)
          ._data.map((s) => pointIn.map((p) => (s * p) / 10))
          .map((point) =>
            math.multiply(
              rot3d,
              math.subtract(
                math.add(sensorCenter, math.multiply(sensorRotMatrix, point)),
                center
              )
            )
          );
        points.push(...get3dLinePoints(pointForLines, { color, size: 1.25 }));
        if (ii > linePoints.length / 2) return;
        let outerSpherePoints = outerSphericalLines.map((point) =>
          math.multiply(
            rot3d,
            math.subtract(
              math.add(
                sensorCenter,
                math.multiply(
                  sensorRotMatrix,
                  math.multiply(outerSphereLinesRotMatrix, point)
                )
              ),
              center
            )
          )
        );
        points.push(
          ...get3dLinePoints(outerSpherePoints, { color, size: 1.25 })
        );
      });
      // Draw spherical lines to define end of sensor volume
    });
  } catch (error) {
    console.log(error);
  }
  // console.log(mainWindow.placeTrajectory);
  if (mainWindow.placeTrajectory === 'position') {
    let mousePosition = mainWindow.mousePosition;
    let posCrtb = [
      ((mousePosition[0] - cnvs.width / 2) * width) / (cnvs.width / 2),
      ((-mousePosition[1] + cnvs.height / 2) * height) / (cnvs.height / 2),
      0,
    ];
    mainWindow.placeTrajectoryData.position = math.add(
      posCrtb,
      mainWindow.view.center
    );
    posCrtb = math.multiply(rot3d, posCrtb);
    points.push({
      color: 'yellow',
      position: posCrtb,
      size: 10,
    });
  } else if (mainWindow.placeTrajectory === 'velocity') {
    let mousePosition = mainWindow.mousePosition;
    let posCrtb = [
      ((mousePosition[0] - cnvs.width / 2) * width) / (cnvs.width / 2),
      ((-mousePosition[1] + cnvs.height / 2) * height) / (cnvs.height / 2),
      0,
    ];
    let stateCr = mainWindow.placeTrajectoryData.position;

    let mu = mainWindow.mu;
    let r1 =
      ((stateCr[0] + mu) ** 2 + stateCr[1] ** 2 + stateCr[2] ** 2) ** 0.5;
    let r2 =
      ((stateCr[0] + mu - 1) ** 2 + stateCr[1] ** 2 + stateCr[2] ** 2) ** 0.5;
    let desiredVel =
      (-(
        mainWindow.jacobiConstant -
        stateCr.slice(0, 3).reduce((a, b) => a + b ** 2, 0) -
        (2 * (1 - mu)) / r1 -
        (2 * mu) / r2
      )) ** 0.5;
    let deltaPosition = math.subtract(
      math.add(posCrtb, mainWindow.view.center),
      mainWindow.placeTrajectoryData.position
    );
    deltaPosition = deltaPosition.map(
      (s) => (s * desiredVel) / math.norm(deltaPosition)
    );
    mainWindow.analystSats = [
      {
        state: [...mainWindow.placeTrajectoryData.position, ...deltaPosition],
        stateHistory: undefined,
        color: 'yellow',
      },
    ];
  }
  let sunRadius =
    (mainWindow.colors.rTertiary / mainWindow.lengthUnit / width / 2) *
    window.innerWidth;

  sunPos = math.multiply(rot3d, math.subtract(sunPos, center));
  points.push({
    color: mainWindow.colors.tertiaryBody,
    position: sunPos,
    size: sunRadius * 2,
    text: mainWindow.tertiaryBody,
  });

  ctx.strokeStyle = 'gray';
  if (mainWindow.manifoldLimit !== undefined) {
    let centerManinfold = mainWindow.manifoldLimit.point1;
    let corners = [
      math.add(
        centerManinfold,
        mainWindow.manifoldLimit.line[0] === 'x' ? [0, 0.5, 0.5] : [0.5, 0, 0.5]
      ),
      math.add(
        centerManinfold,
        mainWindow.manifoldLimit.line[0] === 'x'
          ? [0, -0.5, 0.5]
          : [-0.5, 0, 0.5]
      ),
      math.add(
        centerManinfold,
        mainWindow.manifoldLimit.line[0] === 'x'
          ? [0, -0.5, -0.5]
          : [-0.5, 0, -0.5]
      ),
      math.add(
        centerManinfold,
        mainWindow.manifoldLimit.line[0] === 'x'
          ? [0, 0.5, -0.5]
          : [0.5, 0, -0.5]
      ),
    ];
    points.push(
      ...get3dLinePoints(
        corners.map((s) => math.multiply(rot3d, math.subtract(s, center))),
        {
          color: '#CCCCCC',
          size: 0.5,
          closed: true,
        }
      )
    );
  }

  let moonPosition = [1 - mainWindow.mu, 0, 0];
  moonPosition = math.multiply(rot3d, math.subtract(moonPosition, center));
  let moonRadius =
    (mainWindow.colors.rSecondary / mainWindow.lengthUnit / width / 2) *
    window.innerWidth;

  let earthPosition = [-mainWindow.mu, 0, 0];
  earthPosition = math.multiply(rot3d, math.subtract(earthPosition, center));
  let earthRadius =
    (mainWindow.colors.rPrimary / mainWindow.lengthUnit / width / 2) *
    window.innerWidth;

  if (true) {
    let relMoonSun = math.subtract(sunPos, moonPosition);
    relMoonSun = math.atan2(relMoonSun[1], relMoonSun[0]);
    // console.log(relMoonSun*180/Math.PI, relMoonSun);
    let moonIllum = astro.moonPhaseFromAngle(
      viewPosition,
      moonPosition,
      sunPos
    );
    // mainWindow.drawMoonPhase = false
    points.push(
      {
        color:
          moonIllum > 0.5
            ? mainWindow.colors.secondaryBodyShadow
            : mainWindow.colors.secondaryBody,
        position: moonPosition,
        size: moonRadius * 2,
        text: mainWindow.secondaryBody,
        textColor: mainWindow.colors.secondaryBody,
      },
      {
        color:
          moonIllum > 0.5
            ? mainWindow.colors.secondaryBody
            : mainWindow.colors.secondaryBodyShadow,
        position: moonPosition,
        size: moonRadius * 2,
        b: moonRadius,
        shape: 'ellipse',
        start: 0,
        end: Math.PI,
        angle:
          moonIllum > 0.5
            ? relMoonSun - Math.PI / 2 + Math.PI
            : relMoonSun - Math.PI / 2,
      },
      {
        color:
          moonIllum > 0.5
            ? mainWindow.colors.secondaryBody
            : mainWindow.colors.secondaryBodyShadow,
        position: moonPosition,
        size: moonRadius * 2,
        shape: 'ellipse',
        angle: relMoonSun,
        b:
          (((moonIllum > 0.5 ? moonIllum : 1 - moonIllum) - 0.5) / 0.5) *
          moonRadius,
      }
    );
  }
  if (true) {
    let relEarthSun = math.subtract(sunPos, earthPosition);
    relEarthSun = math.atan2(relEarthSun[1], relEarthSun[0]);
    // console.log(relMoonSun*180/Math.PI, relMoonSun);
    let earthIllum = astro.moonPhaseFromAngle(
      viewPosition,
      earthPosition,
      sunPos
    );
    // mainWindow.drawMoonPhase = false
    points.push(
      {
        color:
          earthIllum > 0.5
            ? mainWindow.colors.primaryBodyShadow
            : mainWindow.colors.primaryBody,
        position: earthPosition,
        size: earthRadius * 2,
        text: mainWindow.primaryBody,
        textColor: mainWindow.colors.primaryBody,
      },
      {
        color:
          earthIllum > 0.5
            ? mainWindow.colors.primaryBody
            : mainWindow.colors.primaryBodyShadow,
        position: earthPosition,
        size: earthRadius * 2,
        b: earthRadius,
        shape: 'ellipse',
        start: 0,
        end: Math.PI,
        angle:
          earthIllum > 0.5
            ? relEarthSun - Math.PI / 2 + Math.PI
            : relEarthSun - Math.PI / 2,
      },
      {
        color:
          earthIllum > 0.5
            ? mainWindow.colors.primaryBody
            : mainWindow.colors.primaryBodyShadow,
        position: earthPosition,
        size: earthRadius * 2,
        shape: 'ellipse',
        angle: relEarthSun,
        b:
          (((earthIllum > 0.5 ? earthIllum : 1 - earthIllum) - 0.5) / 0.5) *
          earthRadius,
      }
    );
  }
  let currentTime = astro.toStkDateFormat(
    new Date(mainWindow.startTime - -1000 * mainWindow.scenarioTime)
  );
  document.querySelector('#time-display').innerText = currentTime;

  mainWindow.lagrangePoints.forEach((point, ii) => {
    let pointRot = math.multiply(rot3d, math.subtract(point, center));
    points.push({
      color: '#ff8888',
      position: pointRot,
      size: 8,
      text: 'L' + (ii + 1),
      shape: 'cross',
    });
  });

  let stableManifoldBoxes = [
    ...document.querySelectorAll('.stable-manifold-box'),
  ].map((s) => s.checked);
  let unstableManifoldBoxes = [
    ...document.querySelectorAll('.unstable-manifold-box'),
  ].map((s) => s.checked);
  mainWindow.satellites.forEach((sat, ii) => {
    if (sat.stateHistory === undefined) {
      sat.stateHistory = calculateStateHistory(
        sat.state,
        mainWindow.scenarioLength
      );
    }
    // console.log(get3dLinePoints(sat.stateHistory.map((state, ii) => {
    //     console.log(state);
    //     return pointRot = math.multiply(rot3d, math.subtract(state.state.slice(0,3),center))
    // })));
    // return
    points.push(
      ...get3dLinePoints(
        sat.stateHistory.map((state, ii) => {
          return (pointRot = math.multiply(
            rot3d,
            math.subtract(state.state.slice(0, 3), center)
          ));
        }),
        {
          color: sat.color,
        }
      )
    );
    sat.manifolds.forEach((man) => {
      points.push(
        ...get3dLinePoints(
          man.map((state, ii) => {
            return (pointRot = math.multiply(
              rot3d,
              math.subtract(state.state.slice(0, 3), center)
            ));
          }),
          { size: 1, color: sat.color }
        )
      );
    });
    if (!mainWindow.moonFrame) {
      if (sat.inertialHistory === undefined) {
        sat.inertialHistory = sat.stateHistory.map((h) => {
          let rot = astro.rot((-h.t * 180) / Math.PI, 3);
          return {
            t: h.t,
            state: math.multiply(
              rot,
              math.subtract(h.state.slice(0, 3), [-mainWindow.mu, 0, 0])
            ),
          };
        });
      }
      points.push(
        ...get3dLinePoints(
          sat.inertialHistory.map((state, ii) => {
            return (pointRot = math.multiply(
              rot3dInert,
              state.state.slice(0, 3)
            ));
          }),
          {
            color: sat.color,
            size: 1,
          }
        )
      );
    }
    let currentSatPosition = getCurrentState(
      sat.stateHistory,
      mainWindow.scenarioTime
    );
    if (unstableManifoldBoxes[ii]) {
      points.push(
        ...get3dLinePoints(
          findStateEigenvectors(currentSatPosition, 1, false, false).map(
            (state, ii) => {
              return (pointRot = math.multiply(
                rot3d,
                math.subtract(state.state.slice(0, 3), center)
              ));
            }
          ),
          {
            color: 'rgb(200,100,100)',
          }
        )
      );
      points.push(
        ...get3dLinePoints(
          findStateEigenvectors(currentSatPosition, -1, false, false).map(
            (state, ii) => {
              return (pointRot = math.multiply(
                rot3d,
                math.subtract(state.state.slice(0, 3), center)
              ));
            }
          ),
          {
            color: 'rgb(200,100,100)',
          }
        )
      );
    }
    if (stableManifoldBoxes[ii]) {
      points.push(
        ...get3dLinePoints(
          findStateEigenvectors(currentSatPosition, 1, true, false).map(
            (state, ii) => {
              return (pointRot = math.multiply(
                rot3d,
                math.subtract(state.state.slice(0, 3), center)
              ));
            }
          ),
          {
            color: 'rgb(100,200,100)',
          }
        )
      );
      points.push(
        ...get3dLinePoints(
          findStateEigenvectors(currentSatPosition, -1, true, false).map(
            (state, ii) => {
              return (pointRot = math.multiply(
                rot3d,
                math.subtract(state.state.slice(0, 3), center)
              ));
            }
          ),
          {
            color: 'rgb(100,200,100)',
          }
        )
      );
    }
    // Draw sat current position
    // findStateEigenvectors(currentSatPosition, 1)

    // console.log(mainWindow.lengthUnit*math.norm([currentSatPosition[0]+mainWindow.mu, currentSatPosition[1], currentSatPosition[2]]))
    currentSatPosition = math.multiply(
      rot3d,
      math.subtract(currentSatPosition.slice(0, 3), center)
    );
    currentSatPosition[2] += (0.1 * viewDistance) / 6;
    points.push({
      position: currentSatPosition,
      size: 10,
      color: sat.color,
      text: sat.name,
    });
  });
  mainWindow.analystSats.forEach((sat, ii) => {
    if (sat.stateHistory === undefined) {
      sat.stateHistory = calculateStateHistory(
        sat.state,
        mainWindow.scenarioLength
      );
    }
    points.push(
      ...get3dLinePoints(
        sat.stateHistory.map((state, ii) => {
          return (pointRot = math.multiply(
            rot3d,
            math.subtract(state.state.slice(0, 3), center)
          ));
        }),
        {
          color: sat.color,
          size: 1,
        }
      )
    );

    if (!mainWindow.moonFrame) {
      if (sat.inertialHistory === undefined) {
        sat.inertialHistory = sat.stateHistory.map((h) => {
          let rot = astro.rot((-h.t * 180) / Math.PI, 3);
          return {
            t: h.t,
            state: math.multiply(
              rot,
              math.subtract(h.state.slice(0, 3), [-mainWindow.mu, 0, 0])
            ),
          };
        });
      }
      points.push(
        ...get3dLinePoints(
          sat.inertialHistory.map((state, ii) => {
            return (pointRot = math.multiply(
              rot3dInert,
              state.state.slice(0, 3)
            ));
          }),
          {
            color: sat.color,
            size: 1,
          }
        )
      );
    }
    let currentSatPosition = getCurrentState(
      sat.stateHistory,
      mainWindow.scenarioTime
    );
    // Draw sat current position
    currentSatPosition = math.multiply(
      rot3d,
      math.subtract(currentSatPosition.slice(0, 3), center)
    );
    currentSatPosition[2] += (0.1 * viewDistance) / 6;
    points.push({
      position: currentSatPosition,
      size: 10,
      color: sat.color,
    });
  });

  mainWindow.displayedLines.forEach((line) => {
    ctx.strokeStyle = line.color;
    points.push(
      ...get3dLinePoints(
        line.line.map((state, ii) => {
          return math.multiply(rot3d, math.subtract(state.slice(0, 3), center));
        }),
        {
          color: '#AA5555',
        }
      )
    );
  });
  points = points.sort((a, b) => a.position[2] - b.position[2]);
  ctx.textAlign = 'center';
  points.forEach((p) => {
    if (p.position[0].length !== undefined) {
      if (p.position[0].length > 3) {
        // Solid fill
        // console.log('solid', p.position[0]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = mainWindow.colors.foregroundColor;
        ctx.lineWidth = 0.25;
        let zIndexes = p.position[0].map(
          (pos) => (viewDistance * f3d - pos[2]) / viewDistance / f3d
        );
        if (zIndexes.filter((s) => s < 0.25).length > 0) return;
        ctx.beginPath();
        p.position[0].forEach((pos, iI) => {
          let posPix = mainWindow.convertToPixels(pos).ri;
          let zRatio = zIndexes[iI];
          posPix = [
            posPix.x - mainWindow.cnvs.width / 2,
            posPix.y - mainWindow.cnvs.height / 2,
          ].map((s) => s / zRatio);
          posPix = {
            x: posPix[0] + mainWindow.cnvs.width / 2,
            y: posPix[1] + mainWindow.cnvs.height / 2,
          };
          if (iI === 0) ctx.moveTo(posPix.x, posPix.y);
          else ctx.lineTo(posPix.x, posPix.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        return;
      }
      // Line
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      // Convert to pixels using same equation as RI
      let pos1 = {
        x: cnvs.width / 2 + (p.position[0][0] * (cnvs.width / 2)) / width,
        y: cnvs.height / 2 - (p.position[0][1] * (cnvs.height / 2)) / height,
      };
      let pos2 = {
        x: cnvs.width / 2 + (p.position[1][0] * (cnvs.width / 2)) / width,
        y: cnvs.height / 2 - (p.position[1][1] * (cnvs.height / 2)) / height,
      };
      let zRatio1 =
        (viewDistance * f3d - p.position[0][2]) / viewDistance / f3d;
      let zRatio2 =
        (viewDistance * f3d - p.position[1][2]) / viewDistance / f3d;
      if (zRatio1 < 0.25 && zRatio2 < 0.25) return;
      else if (zRatio1 < 0.25) {
        zRatio1 = zRatio2;
      } else if (zRatio2 < 0.25) {
        zRatio2 = zRatio1;
      }
      pos1 = [
        pos1.x - mainWindow.cnvs.width / 2,
        pos1.y - mainWindow.cnvs.height / 2,
      ].map((s) => s / zRatio1);
      pos1 = {
        x: pos1[0] + mainWindow.cnvs.width / 2,
        y: pos1[1] + mainWindow.cnvs.height / 2,
      };
      pos2 = [
        pos2.x - mainWindow.cnvs.width / 2,
        pos2.y - mainWindow.cnvs.height / 2,
      ].map((s) => s / zRatio2);
      pos2 = {
        x: pos2[0] + mainWindow.cnvs.width / 2,
        y: pos2[1] + mainWindow.cnvs.height / 2,
      };
      ctx.beginPath();
      ctx.moveTo(pos1.x, pos1.y);
      ctx.lineTo(pos2.x, pos2.y);
      ctx.stroke();
      return;
    }
    // let pos = {
    //     x: -(p.position[1] - mainWindow.plotCenter) * mainWindow.cnvs.width  / mainWindow.plotWidth + mainWindow.cnvs.width * mainWindow.frameCenter.ri.x,
    //     y: mainWindow.cnvs.height * mainWindow.frameCenter.ri.y - p.position[0] * mainWindow.cnvs.height / mainWindow.plotHeight
    // }
    let pos = {
      x: cnvs.width / 2 + (p.position[0] * (cnvs.width / 2)) / width,
      y: cnvs.height / 2 - (p.position[1] * (cnvs.height / 2)) / height,
    };
    let zRatio = (viewDistance * f3d - p.position[2]) / viewDistance / f3d;

    pos = [
      pos.x - mainWindow.cnvs.width / 2,
      pos.y - mainWindow.cnvs.height / 2,
    ].map((s) => s / zRatio);
    pos = {
      x: pos[0] + mainWindow.cnvs.width / 2,
      y: pos[1] + mainWindow.cnvs.height / 2,
    };
    if (zRatio < 0.25) return;
    let size = p.size / zRatio;
    // console.log(size);
    let textSize = size === 0 ? 20 / zRatio : size;
    let shape = p.shape || 'circle';
    let start = p.start || 0;
    let end = p.end || 2 * Math.PI;
    let bSize = (p.b || 2) / zRatio;
    ctx.fillStyle = p.color;
    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size / 2, start, end);
        ctx.fill();
        break;

      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, bSize, size / 2, -p.angle, start, end);
        ctx.fill();
        break;
      case 'cross':
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(pos.x - 6, pos.y);
        ctx.lineTo(pos.x + 6, pos.y);
        ctx.moveTo(pos.x, pos.y - 6);
        ctx.lineTo(pos.x, pos.y + 6);
        ctx.stroke();
      default:
        break;
    }
    if (p.text !== undefined) {
      let textColor = p.textColor || p.color;
      ctx.font = `bold ${textSize * 1.5}px serif`;
      ctx.fillStyle = textColor;
      ctx.globalAlpha = p.alpha;
      ctx.fillText(p.text, pos.x, pos.y + size * 2);
    }
    ctx.globalAlpha = 1;
  });
}

function switchMoonGravity() {
  mainWindow.moonGravity = !mainWindow.moonGravity;
  mainWindow.satellites.forEach((sat) => {
    sat.stateHistory = undefined;
  });
}

function switchMoonState() {
  mainWindow.moonGravity = !mainWindow.moonGravity;
  mainWindow.stateHistory[0] = undefined;
}

function placeCirlcularOrbitEarth(r = 42164, ang = 0, mod = 1) {
  let earthMu = 398600.4418;
  let v = (earthMu / r) ** 0.5 * mod;
  let position = [
    r * Math.cos((ang * Math.PI) / 180),
    r * Math.sin((ang * Math.PI) / 180),
    0,
  ].map((s) => s / mainWindow.lengthUnit);
  position = math.add(position, [-mainWindow.mu, 0, 0]);
  velocity = [
    -v * Math.sin((ang * Math.PI) / 180),
    v * Math.cos((ang * Math.PI) / 180),
    0,
  ].map((s) => (s * mainWindow.timeUnit) / mainWindow.lengthUnit);
  velocity = math.subtract(velocity, math.cross([0, 0, 1], position));
  let state = [...position, ...velocity];
  mainWindow.analystSats = [
    {
      state,
      color: 'yellow',
      stateHistory: undefined,
    },
  ];
}

function placeCirlcularOrbitMoon(r = 8000, ang = 0) {
  let v = (mainWindow.mu / r) ** 0.5;
  let position = [
    r * Math.cos((ang * Math.PI) / 180),
    r * Math.sin((ang * Math.PI) / 180),
    0,
  ].map((s) => s / mainWindow.lengthUnit);
  position = math.add(position, [1 - mainWindow.mu, 0, 0]);
  velocity = [
    -v * Math.sin((ang * Math.PI) / 180),
    v * Math.cos((ang * Math.PI) / 180),
    0,
  ];
  velocity = math.subtract(velocity, math.cross([0, 0, 1], position));
  let state = [...position, ...velocity];
  mainWindow.state = state;
  mainWindow.stateHistory[0] = undefined;
}

function synodicUnitless2eci(time = 0, sat = 0) {
  let date = new Date(mainWindow.startTime - -1000 * time);
  // console.log(date);
  let moonEci = astro.moonEciFromTime(date);
  let moonEciDel = astro.moonEciFromTime(new Date(date - -1));
  let moonVel = math.subtract(moonEciDel, moonEci).map((s) => s / 0.001);

  let moonX = moonEci.map((s) => s / math.norm(moonEci));
  let moonZ = math.cross(moonEci, moonVel);
  moonZ = moonZ.map((s) => s / math.norm(moonZ));
  let moonY = math.cross(moonZ, moonX);
  let r = math.transpose([moonX, moonY, moonZ]);
  let position = mainWindow.satellites[sat].state.slice(0, 3);
  let velocity = mainWindow.satellites[sat].state.slice(3);
  velocity = math.add(velocity, math.cross([0, 0, 1], position));
  position = math.subtract(position, [-mainWindow.mu, 0, 0]);
  let stateInertial = [
    ...position.map((s) => s * mainWindow.lengthUnit),
    ...velocity.map((s) => (s * mainWindow.lengthUnit) / mainWindow.timeUnit),
  ];

  stateInertial = [
    ...math.multiply(r, stateInertial.slice(0, 3)),
    ...math.multiply(r, stateInertial.slice(3)),
  ];
  return stateInertial;
}

function synodicStateUnitless2eci(state = [1, 0, 0, 0, 0, 0], time = 0) {
  let date = new Date(mainWindow.startTime - -1000 * time);
  // console.log(date);
  let moonEci = astro.moonEciFromTime(date);
  let moonEciDel = astro.moonEciFromTime(new Date(date - -1));
  let moonVel = math.subtract(moonEciDel, moonEci).map((s) => s / 0.001);

  let moonX = moonEci.map((s) => s / math.norm(moonEci));
  let moonZ = math.cross(moonEci, moonVel);
  moonZ = moonZ.map((s) => s / math.norm(moonZ));
  let moonY = math.cross(moonZ, moonX);
  let r = math.transpose([moonX, moonY, moonZ]);
  let position = state.slice(0, 3);
  let velocity = state.slice(3);
  velocity = math.add(velocity, math.cross([0, 0, 1], position));
  position = math.subtract(position, [-mainWindow.mu, 0, 0]);
  let stateInertial = [
    ...position.map((s) => s * mainWindow.lengthUnit),
    ...velocity.map((s) => (s * mainWindow.lengthUnit) / mainWindow.timeUnit),
  ];

  stateInertial = [
    ...math.multiply(r, stateInertial.slice(0, 3)),
    ...math.multiply(r, stateInertial.slice(3)),
  ];
  return stateInertial;
}

function open2Dgraph(
  x = math.range(0, 25, 0.1)._data,
  y = math.range(0, 25, 0.1)._data.map((s) => s ** 2),
  options = {}
) {
  let {
    times,
    yLimits,
    xLimits,
    lines = [],
    rect = [],
    colors,
    xlabel = 'X Axis',
    ylabel = 'Y Axis',
    title = '2D Plot',
    cnvsIn,
    implementButton = true,
  } = options;
  let cnvs;
  colors = colors || ['#881111', '#118811', '#111188'];
  if (cnvsIn === undefined) {
    let graphDiv = document.createElement('div');
    graphDiv.style.position = 'fixed';
    graphDiv.style.zIndex = 50;
    graphDiv.style.left = '20vw';
    graphDiv.style.top = '20vh';
    graphDiv.style.width = '60vw';
    graphDiv.style.height = '60vh';
    graphDiv.style.border = '2px solid white';
    graphDiv.style.backgroundColor = '#5555cc';
    graphDiv.innerHTML = `
            <canvas style="width: 100%; height: 100%;" id="graph-canvas"></canvas>
        `;
    document.body.append(graphDiv);
    let closeDiv = document.createElement('div');
    closeDiv.style.position = 'absolute';
    closeDiv.style.zIndex = 60;
    closeDiv.style.right = '1%';
    closeDiv.style.top = '1%';
    closeDiv.innerText = 'X';
    closeDiv.style.cursor = 'pointer';
    graphDiv.append(closeDiv);
    let opacityDiv = document.createElement('div');
    opacityDiv.style.position = 'absolute';
    opacityDiv.style.zIndex = 60;
    opacityDiv.style.right = '3%';
    opacityDiv.style.top = '1%';
    opacityDiv.innerText = 'O';
    opacityDiv.style.cursor = 'pointer';
    graphDiv.append(opacityDiv);
    opacityDiv.addEventListener('pointerenter', (el) => {
      // console.log(el);
      el.target.parentElement.style.opacity = 0.1;
    });
    opacityDiv.addEventListener('pointerleave', (el) => {
      el.target.parentElement.style.opacity = 1;
    });
    if (implementButton) {
      let implementDiv = document.createElement('button');
      implementDiv.style.position = 'absolute';
      implementDiv.style.zIndex = 60;
      implementDiv.style.right = '1%';
      implementDiv.style.bottom = '1%';
      implementDiv.innerText = 'Implement Intersection';
      implementDiv.style.cursor = 'pointer';
      graphDiv.append(implementDiv);

      implementDiv.onclick = implementPlotState;
      let addPointsDiv = document.createElement('button');
      addPointsDiv.style.position = 'absolute';
      addPointsDiv.style.zIndex = 60;
      addPointsDiv.style.right = '1%';
      addPointsDiv.style.bottom = '5%';
      addPointsDiv.innerText = 'Add Points';
      addPointsDiv.style.cursor = 'pointer';
      graphDiv.append(addPointsDiv);

      addPointsDiv.onclick = addMorePoints;
    }
    cnvs = document.querySelector('#graph-canvas');
    closeDiv.onclick = function (el) {
      console.log(el.target);
      el.target.parentElement.remove();
      mainWindow.plot = undefined;
    };
    cnvs.addEventListener('pointerdown', (event) => {
      if (event.ctrlKey) {
        mainWindow.plot.rectStart = [event.offsetX, event.offsetY];
        return;
      }
      mainWindow.plot.pointerdownstart = [event.offsetX, event.offsetY];
      mainWindow.plot.pointerdown = [event.offsetX, event.offsetY];
    });
    cnvs.addEventListener('pointermove', (event) => {
      if (mainWindow.plot.rectStart) {
        let rect = [...mainWindow.plot.rectStart, event.offsetX, event.offsetY];
        let xPixel = [
          mainWindow.plot.cnvs.width * 0.1,
          mainWindow.plot.cnvs.width * 0.9,
        ];
        let yPixel = [
          mainWindow.plot.cnvs.height * 0.1,
          mainWindow.plot.cnvs.height - mainWindow.plot.cnvs.width * 0.1,
        ];
        rect = [
          (rect[0] - xPixel[0]) /
            ((xPixel[1] - xPixel[0]) /
              (mainWindow.plot.x[1] - mainWindow.plot.x[0])) +
            mainWindow.plot.x[0],
          (yPixel[1] - rect[1]) /
            ((yPixel[1] - yPixel[0]) /
              (mainWindow.plot.y[1] - mainWindow.plot.y[0])) +
            mainWindow.plot.y[0],
          (rect[2] - xPixel[0]) /
            ((xPixel[1] - xPixel[0]) /
              (mainWindow.plot.x[1] - mainWindow.plot.x[0])) +
            mainWindow.plot.x[0],
          (yPixel[1] - rect[3]) /
            ((yPixel[1] - yPixel[0]) /
              (mainWindow.plot.y[1] - mainWindow.plot.y[0])) +
            mainWindow.plot.y[0],
        ];
        open2Dgraph(mainWindow.plot.points[0], mainWindow.plot.points[1], {
          cnvsIn: mainWindow.plot.cnvs,
          xLimits: mainWindow.plot.x,
          yLimits: mainWindow.plot.y,
          rect: [rect],
          colors: mainWindow.plot.points[2],
          xlabel: mainWindow.plot.xlabel,
          ylabel: mainWindow.plot.ylabel,
          title: mainWindow.plot.title,
          times: mainWindow.plot.points[3],
        });
        return;
      } else if (mainWindow.plot.pointerdown === undefined) return;
      let position = [event.offsetX, event.offsetY];
      let delta = math.subtract(position, mainWindow.plot.pointerdown);
      mainWindow.plot.pointerdown = [event.offsetX, event.offsetY];
      // console.log(mainWindow.plot.pointerdown);
      delta[0] =
        (delta[0] * [mainWindow.plot.x[1] - mainWindow.plot.x[0]]) /
        event.target.width /
        mainWindow.plot.pixelWidth;
      delta[1] =
        (delta[1] * [mainWindow.plot.y[1] - mainWindow.plot.y[0]]) /
        event.target.height /
        mainWindow.plot.pixelHeight;
      let x = mainWindow.plot.x.map((s) => s - delta[0]);
      let y = mainWindow.plot.y.map((s) => s + delta[1]);
      open2Dgraph(mainWindow.plot.points[0], mainWindow.plot.points[1], {
        cnvsIn: mainWindow.plot.cnvs,
        xLimits: x,
        yLimits: y,
        colors: mainWindow.plot.points[2],
        xlabel: mainWindow.plot.xlabel,
        ylabel: mainWindow.plot.ylabel,
        title: mainWindow.plot.title,
      });
    });
    cnvs.addEventListener('pointerup', (event) => {
      // If not moved, assume selecting point
      if (
        math.norm(
          math.subtract(
            [event.offsetX, event.offsetY],
            mainWindow.plot.pointerdownstart
          )
        ) < 1
      ) {
        let xPixel = [
          mainWindow.plot.cnvs.width * 0.1,
          mainWindow.plot.cnvs.width * 0.9,
        ];
        let yPixel = [
          mainWindow.plot.cnvs.height * 0.1,
          mainWindow.plot.cnvs.height - mainWindow.plot.cnvs.width * 0.1,
        ];
        let point = [
          (event.offsetX - xPixel[0]) /
            ((xPixel[1] - xPixel[0]) /
              (mainWindow.plot.x[1] - mainWindow.plot.x[0])) +
            mainWindow.plot.x[0],
          (yPixel[1] - event.offsetY) /
            ((yPixel[1] - yPixel[0]) /
              (mainWindow.plot.y[1] - mainWindow.plot.y[0])) +
            mainWindow.plot.y[0],
        ];

        state = [1 - mainWindow.mu, point[1], 0, undefined, point[0], 0];
        let mu = mainWindow.mu;
        let r1 = ((state[0] + mu) ** 2 + state[1] ** 2 + state[2] ** 2) ** 0.5;
        let r2 =
          ((state[0] + mu - 1) ** 2 + state[1] ** 2 + state[2] ** 2) ** 0.5;
        let xd =
          mainWindow.jacobiConstant -
          state.slice(0, 3).reduce((a, b) => a + b ** 2, 0) -
          (2 * (1 - mu)) / r1 -
          (2 * mu) / r2 +
          state[4] ** 2 +
          state[5] ** 2;
        xd = (-xd) ** 0.5;
        state[3] = xd;
        mainWindow.plot.state = state;
      }
      mainWindow.plot.pointerdown = undefined;
      mainWindow.plot.rectStart = undefined;
    });
    cnvs.addEventListener('pointerleave', (event) => {
      mainWindow.plot.pointerdown = undefined;
      mainWindow.plot.pointerdownstart = undefined;
      mainWindow.plot.rectStart = undefined;
    });
  } else {
    cnvs = cnvsIn;
  }
  let ctx = cnvs.getContext('2d');
  // console.log(xLimits, yLimits);
  cnvs.width = cnvs.clientWidth;
  cnvs.height = cnvs.clientHeight;
  let graphLimits = {
    xPixel: [cnvs.width * 0.1, cnvs.width * 0.9],
    yPixel: [cnvs.height * 0.1, cnvs.height - cnvs.width * 0.1],
    x: xLimits === undefined ? [0, 5] : xLimits,
    y: yLimits === undefined ? [0, 5] : yLimits,
  };
  if (cnvsIn === undefined) {
    mainWindow.plot = {
      x: graphLimits.x,
      y: graphLimits.y,
      points: [x, y, colors, times],
      pixelWidth: 0.8,
      pixelHeight:
        (-cnvs.height * 0.1 + cnvs.height - cnvs.width * 0.1) / cnvs.height,
      cnvs,
      xlabel,
      ylabel,
      title,
    };
  } else {
    (mainWindow.plot.x = graphLimits.x), (mainWindow.plot.y = graphLimits.y);
  }
  // Draw X and Y Axis
  ctx.clearRect(0, 0, cnvs.width, cnvs.height);
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cnvs.width * 0.1, cnvs.height * 0.1);
  ctx.lineTo(cnvs.width * 0.1, cnvs.height - cnvs.width * 0.1);
  ctx.lineTo(cnvs.width * 0.9, cnvs.height - cnvs.width * 0.1);
  ctx.stroke();
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.font = 'bold +' + cnvs.height / 20 + 'px serif';
  ctx.fillText(xlabel, cnvs.width / 2, cnvs.height);

  ctx.save();
  ctx.translate(0, cnvs.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(ylabel, 0, 0);
  ctx.restore();
  ctx.font = 'bold +' + cnvs.height / 15 + 'px serif';
  ctx.textBaseline = 'top';
  ctx.fillText(title, cnvs.width / 2, 4);
  for (let group = 0; group < x.length; group++) {
    for (let point = 0; point < x[group].length; point++) {
      ctx.fillStyle = colors[group];
      // console.log(colors);
      let graphedPoint = [x[group][point], y[group][point]];
      let pixel = {
        x:
          ((graphedPoint[0] - graphLimits.x[0]) *
            (graphLimits.xPixel[1] - graphLimits.xPixel[0])) /
            (graphLimits.x[1] - graphLimits.x[0]) +
          graphLimits.xPixel[0],
        y:
          graphLimits.yPixel[1] -
          ((graphedPoint[1] - graphLimits.y[0]) *
            (graphLimits.yPixel[1] - graphLimits.yPixel[0])) /
            (graphLimits.y[1] - graphLimits.y[0]),
      };
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  if (rect.length > 0) {
    lines = [];
    let rectLine = rect[0];
    let points = x.map((s) => []);
    for (let group = 0; group < x.length; group++) {
      for (let point = 0; point < x[group].length; point++) {
        let pointXY = [x[group][point], y[group][point]];
        if (
          pointInRectangle(pointXY, rectLine.slice(0, 2), rectLine.slice(2))
        ) {
          points[group].push([pointXY, times[group][point]]);
        }
      }
    }
    for (let group = 0; group < points.length; group++) {
      for (let point = 0; point < points[group].length; point++) {
        let pointXY = points[group][point];

        ctx.fillStyle = 'white';
        let pixel = {
          x:
            ((pointXY[0] - graphLimits.x[0]) *
              (graphLimits.xPixel[1] - graphLimits.xPixel[0])) /
              (graphLimits.x[1] - graphLimits.x[0]) +
            graphLimits.xPixel[0],
          y:
            graphLimits.yPixel[1] -
            ((pointXY[1] - graphLimits.y[0]) *
              (graphLimits.yPixel[1] - graphLimits.yPixel[0])) /
              (graphLimits.y[1] - graphLimits.y[0]),
        };
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
      if (points[group].length > 0) {
        let poly = polyFit(
          points[group].map((s) => s[0][0]),
          points[group].map((s) => s[0][1])
        );
        lines.push(poly);
      }
    }
    mainWindow.plot.chosenPoints = points;
    if (lines.length > 1) {
      let xIntercept = intersectionOfPolynomials(
        lines[0],
        lines[1],
        (rect[0][0] + rect[0][2]) / 2
      );
      if (xIntercept !== false) {
        let yIntercept = answerPolynomial(lines[0], xIntercept);
        state = [1 - mainWindow.mu, yIntercept, 0, undefined, xIntercept, 0];
        let mu = mainWindow.mu;
        let r1 = ((state[0] + mu) ** 2 + state[1] ** 2 + state[2] ** 2) ** 0.5;
        let r2 =
          ((state[0] + mu - 1) ** 2 + state[1] ** 2 + state[2] ** 2) ** 0.5;
        let xd =
          mainWindow.jacobiConstant -
          state.slice(0, 3).reduce((a, b) => a + b ** 2, 0) -
          (2 * (1 - mu)) / r1 -
          (2 * mu) / r2 +
          state[4] ** 2 +
          state[5] ** 2;
        xd = (-xd) ** 0.5;
        state[3] = xd;
        mainWindow.plot.state = state;
      }
    }
  }
  ctx.strokeStyle = 'white';
  rect.forEach((r) => {
    let pixel1 = {
      x:
        ((r[0] - graphLimits.x[0]) *
          (graphLimits.xPixel[1] - graphLimits.xPixel[0])) /
          (graphLimits.x[1] - graphLimits.x[0]) +
        graphLimits.xPixel[0],
      y:
        graphLimits.yPixel[1] -
        ((r[1] - graphLimits.y[0]) *
          (graphLimits.yPixel[1] - graphLimits.yPixel[0])) /
          (graphLimits.y[1] - graphLimits.y[0]),
    };
    let pixel2 = {
      x:
        ((r[2] - graphLimits.x[0]) *
          (graphLimits.xPixel[1] - graphLimits.xPixel[0])) /
          (graphLimits.x[1] - graphLimits.x[0]) +
        graphLimits.xPixel[0],
      y:
        graphLimits.yPixel[1] -
        ((r[3] - graphLimits.y[0]) *
          (graphLimits.yPixel[1] - graphLimits.yPixel[0])) /
          (graphLimits.y[1] - graphLimits.y[0]),
    };
    ctx.strokeRect(
      pixel1.x,
      pixel1.y,
      pixel2.x - pixel1.x,
      pixel2.y - pixel1.y
    );
  });
  let xPoints = math.range(
    graphLimits.x[0],
    graphLimits.x[1],
    (graphLimits.x[1] - graphLimits.x[0]) / 50
  )._data;
  lines.forEach((line) => {
    let yPoints = xPoints.map((s) => answerPolynomial(line, s));
    ctx.beginPath();
    for (let index = 0; index < xPoints.length; index++) {
      let pixel = {
        x:
          ((xPoints[index] - graphLimits.x[0]) *
            (graphLimits.xPixel[1] - graphLimits.xPixel[0])) /
            (graphLimits.x[1] - graphLimits.x[0]) +
          graphLimits.xPixel[0],
        y:
          graphLimits.yPixel[1] -
          ((yPoints[index] - graphLimits.y[0]) *
            (graphLimits.yPixel[1] - graphLimits.yPixel[0])) /
            (graphLimits.y[1] - graphLimits.y[0]),
      };
      if (index === 0) ctx.moveTo(pixel.x, pixel.y);
      else ctx.lineTo(pixel.x, pixel.y);
    }
    ctx.stroke();
  });
}

function createAccessChart(options = {}) {
  let {
    yLimits,
    xLimits,
    lines = [],
    rect = [],
    colors,
    xlabel = '',
    ylabel = 'Sensors',
    title = '2D Plot',
    cnvsIn,
    implementButton = true,
  } = options;
  let cnvs;
  colors = colors || ['#881111', '#118811', '#111188'];
  if (cnvsIn === undefined) {
    let graphDiv = document.createElement('div');
    graphDiv.style.position = 'fixed';
    graphDiv.style.zIndex = 50;
    graphDiv.style.left = '20vw';
    graphDiv.style.top = '20vh';
    graphDiv.style.width = '60vw';
    graphDiv.style.height = '60vh';
    graphDiv.style.border = '2px solid white';
    graphDiv.style.backgroundColor = '#5555cc';
    graphDiv.innerHTML = `
            <canvas style="width: 100%; height: 100%;" id="graph-canvas"></canvas>
        `;
    document.body.append(graphDiv);
    let closeDiv = document.createElement('div');
    closeDiv.style.position = 'absolute';
    closeDiv.style.zIndex = 60;
    closeDiv.style.right = '1%';
    closeDiv.style.top = '1%';
    closeDiv.innerText = 'X';
    closeDiv.style.cursor = 'pointer';
    graphDiv.append(closeDiv);
    let opacityDiv = document.createElement('div');
    opacityDiv.style.position = 'absolute';
    opacityDiv.style.zIndex = 60;
    opacityDiv.style.right = '3%';
    opacityDiv.style.top = '1%';
    opacityDiv.innerText = 'O';
    opacityDiv.style.cursor = 'pointer';
    graphDiv.append(opacityDiv);
    opacityDiv.addEventListener('pointerenter', (el) => {
      // console.log(el);
      el.target.parentElement.style.opacity = 0.1;
    });
    opacityDiv.addEventListener('pointerleave', (el) => {
      el.target.parentElement.style.opacity = 1;
    });
    if (implementButton) {
      let implementDiv = document.createElement('button');
      implementDiv.style.position = 'absolute';
      implementDiv.style.zIndex = 60;
      implementDiv.style.right = '1%';
      implementDiv.style.bottom = '1%';
      implementDiv.innerText = 'Implement Intersection';
      implementDiv.style.cursor = 'pointer';
      graphDiv.append(implementDiv);

      implementDiv.onclick = implementPlotState;
    }
    cnvs = document.querySelector('#graph-canvas');
    closeDiv.onclick = function (el) {
      console.log(el.target);
      el.target.parentElement.remove();
      mainWindow.plot = undefined;
    };
  } else {
    cnvs = cnvsIn;
  }
  let ctx = cnvs.getContext('2d');
  // console.log(xLimits, yLimits);
  cnvs.width = cnvs.clientWidth;
  cnvs.height = cnvs.clientHeight;
  let graphLimits = {
    xPixel: [cnvs.width * 0.2, cnvs.width * 0.9],
    yPixel: [cnvs.height * 0.1, cnvs.height * 0.9],
    x: xLimits === undefined ? [0, 5] : xLimits,
    y: yLimits === undefined ? [0, 5] : yLimits,
  };
  // Draw X and Y Axis
  ctx.clearRect(0, 0, cnvs.width, cnvs.height);
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(graphLimits.xPixel[0], graphLimits.yPixel[0]);
  ctx.lineTo(graphLimits.xPixel[0], graphLimits.yPixel[1]);
  ctx.stroke();
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.font = 'bold +' + cnvs.height / 20 + 'px serif';
  ctx.fillText(xlabel, cnvs.width / 2, cnvs.height);

  ctx.save();
  ctx.translate(0, cnvs.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(ylabel, 0, 0);
  ctx.restore();
  ctx.font = 'bold +' + cnvs.height / 15 + 'px serif';
  ctx.textBaseline = 'top';
  let timeDelta = math.floor(mainWindow.scenarioLength / 5) + 1;
  let times = math
    .range(0, mainWindow.scenarioLength, timeDelta, true)
    ._data.map((s) => {
      let date = new Date(mainWindow.startTime - -1000 * s * 86400);
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    });
  let lastDate = new Date(
    new Date(times[times.length - 1]) - -1000 * 86400 * timeDelta
  );
  times.push(
    `${lastDate.getMonth() + 1}/${lastDate.getDate()}/${lastDate.getFullYear()}`
  );
  console.log(times);
  ctx.textAlign = 'center';
  let pixelDelta =
    (new Date(times[times.length - 1]) - new Date(times[0])) / 86400000;
  pixelDelta = (graphLimits.xPixel[1] - graphLimits.xPixel[0]) / pixelDelta;
  let datePositions = times.map((t) => {
    let d = new Date(t);
    return (
      ((d - new Date(times[0])) * pixelDelta) / 86400000 + graphLimits.xPixel[0]
    );
  });
  ctx.fillStyle = 'white';
  ctx.font = `bold ${(graphLimits.xPixel[1] - graphLimits.xPixel[0]) / 50}px serif`;
  for (let index = 0; index < datePositions.length; index++) {
    ctx.fillText(times[index], datePositions[index], graphLimits.yPixel[1] + 2);
  }
}

function implementPlotState() {
  let state = propagateCrtbp(mainWindow.plot.state, -10);
  addSatellite(state, { color: '#dd66dd' });
}

function addMorePoints() {
  let objFunction;
  if (mainWindow.manifoldLimit !== undefined) {
    let variable = mainWindow.manifoldLimit.line[0];
    switch (variable) {
      case 'x':
        objFunction = (state) => {
          return (
            state[1] * mainWindow.manifoldLimit.line[1] +
            mainWindow.manifoldLimit.line[2] -
            state[0]
          );
        };
        if (
          mainWindow.manifoldLimit.line[2] > mainWindow.lagrangePoints[0][0]
        ) {
          // Add kill function over the earth
          mainWindow.killFunction = (state) => {
            return state[1] * 0 + -mainWindow.mu - state[0];
          };
        }
        break;
      case 'y':
        objFunction = (state) => {
          return (
            state[0] * mainWindow.manifoldLimit.line[1] +
            mainWindow.manifoldLimit.line[2] -
            state[1]
          );
        };
        break;

      default:
        objFunction = false;
        break;
    }
  }
  let points = mainWindow.plot.chosenPoints;
  let avet1 =
    points[0].map((s) => s[1]).reduce((a, b) => a + b, 0) / points[0].length;
  let stdt1 =
    (points[0].map((s) => s[1]).reduce((a, b) => a + (b - avet1) ** 2, 0) /
      points[0].length) **
    0.5;
  let avet2 =
    points[1].map((s) => s[1]).reduce((a, b) => a + b, 0) / points[1].length;
  let stdt2 =
    (points[1].map((s) => s[1]).reduce((a, b) => a + (b - avet2) ** 2, 0) /
      points[1].length) **
    0.5;
  let times1 = math.range(avet1 - stdt1, avet1 + stdt1, stdt1 / 10)._data;
  let times2 = math.range(avet2 - stdt2, avet2 + stdt2, stdt2 / 10)._data;
  console.log(
    points[0].map((s) => s[1]),
    points[1].map((s) => s[1]),
    avet1,
    avet2,
    stdt1,
    stdt2
  );
  times1.forEach((time) => {
    console.log(time);
    let state = getCurrentState(mainWindow.satellites[0].stateHistory, time);

    let manifoldState = findStateEigenvectors(state, 1, false, objFunction, 0);
    if (manifoldState.length !== 0) {
      manifoldState = manifoldState[manifoldState.length - 1].state;
      // mainWindow.plot.points[0][0].push([[manifoldState[manifoldState.length-1].state[1], manifoldState[manifoldState.length-1].state[4]], '#881111']);
      mainWindow.plot.points[0][0].push(manifoldState[4]);
      mainWindow.plot.points[1][0].push(manifoldState[1]);
      mainWindow.plot.points[3][0].push(time);
    }
    manifoldState = findStateEigenvectors(state, -1, false, objFunction, 0);
    if (manifoldState.length !== 0) {
      manifoldState = manifoldState[manifoldState.length - 1].state;
      // mainWindow.plot.points[0][0].push([[manifoldState[manifoldState.length-1].state[1], manifoldState[manifoldState.length-1].state[4]], '#881111']);
      mainWindow.plot.points[0][0].push(manifoldState[4]);
      mainWindow.plot.points[1][0].push(manifoldState[1]);
      mainWindow.plot.points[3][0].push(time);
    }
    // mainWindow.satellites[sat].manifolds.push(findStateEigenvectors(state, dir, stable))
  });

  times2.forEach((time) => {
    let state = getCurrentState(mainWindow.satellites[1].stateHistory, time);

    let manifoldState = findStateEigenvectors(state, 1, true, objFunction, 0);
    if (manifoldState.length !== 0) {
      manifoldState = manifoldState[manifoldState.length - 1].state;
      mainWindow.plot.points[0][1].push(manifoldState[4]);
      mainWindow.plot.points[1][1].push(manifoldState[1]);
      mainWindow.plot.points[3][1].push(time);
    }
    manifoldState = findStateEigenvectors(state, -1, true, objFunction, 0);
    if (manifoldState.length !== 0) {
      manifoldState = manifoldState[manifoldState.length - 1].state;
      mainWindow.plot.points[0][1].push(manifoldState[4]);
      mainWindow.plot.points[1][1].push(manifoldState[1]);
      mainWindow.plot.points[3][1].push(time);
    }
  });

  open2Dgraph(mainWindow.plot.points[0], mainWindow.plot.points[1], {
    cnvsIn: mainWindow.plot.cnvs,
    xLimits: mainWindow.plot.x,
    yLimits: mainWindow.plot.y,
    colors: mainWindow.plot.points[2],
    xlabel: mainWindow.plot.xlabel,
    ylabel: mainWindow.plot.ylabel,
    title: mainWindow.plot.title,
    times: mainWindow.plot.points[3],
  });
}

function lagrangePolyCalc(x = [0, 1, 3], y = [1, -2, 4]) {
  if (x.length === 1) {
    return y;
  }
  let answerLength = x.length;
  let answer = math.zeros([answerLength]);
  for (let ii = 0; ii < x.length; ii++) {
    let subAnswer = [],
      subAnswerDen = 1;
    for (let jj = 0; jj < x.length; jj++) {
      if (ii === jj) continue;
      subAnswer.push([1, -x[jj]]);
      subAnswerDen *= x[ii] - x[jj];
    }
    subAnswer = subAnswer.slice(1).reduce((a, b) => {
      return multiplyPolynomial(a, b);
    }, subAnswer[0]);
    answer = math.add(
      answer,
      math.dotMultiply(y[ii] / subAnswerDen, subAnswer)
    );
    // console.log(ii);
  }
  return answer;
}

function multiplyPolynomial(a = [1, 3, 1], b = [0, 2, 1]) {
  let aL = a.length,
    bL = b.length;
  let minLength = aL < bL ? bL : aL;
  while (a.length < minLength) a.unshift(0);
  while (b.length < minLength) b.unshift(0);
  let answerLength = (minLength - 1) * 2 + 1;
  let answer = math.zeros([answerLength]);
  for (let index = 0; index < minLength; index++) {
    let subAnswer = math.zeros([answerLength]);
    let indexAnswer = math.dotMultiply(a[index], b);
    subAnswer.splice(index, minLength, ...indexAnswer);
    answer = math.add(answer, subAnswer);
  }
  while (answer[0] === 0) answer.shift();
  return answer;
}

function answerPolynomial(poly = [1, -1, 2], x = 4) {
  let p = poly.slice();
  return p.reverse().reduce((a, b, ii) => {
    return a + b * x ** ii;
  }, 0);
}

function derivateOfPolynomial(poly = [3, 2, 1]) {
  let ddp = poly.slice();
  ddp.pop();
  ddp = ddp.map((p, ii) => {
    return p * (ddp.length - ii);
  });
  return ddp;
}

function intersectionOfPolynomials(
  poly1 = [1, 2],
  poly2 = [1, 1, 0],
  guess = 1
) {
  let p1Len = poly1.length;
  let p2Len = poly2.length;
  if (p1Len < p2Len) {
    while (poly1.length < poly2.length) {
      poly1.unshift(0);
    }
  } else if (p1Len > p2Len) {
    while (poly2.length < poly1.length) {
      poly2.unshift(0);
    }
  }
  let combined = math.subtract(poly1, poly2);
  let derCombined = derivateOfPolynomial(combined);
  let change = 1000,
    iter = 0;
  while (math.abs(change) > 1e-6) {
    let guessAnswer = answerPolynomial(combined, guess);
    let derGuessAnswer = answerPolynomial(derCombined, guess);
    if (derGuessAnswer === 0) {
      guess += 0.1;
      derGuessAnswer = answerPolynomial(derCombined, guess);
    }
    change = guessAnswer / derGuessAnswer;
    guess -= change;
    iter++;
    if (iter > 20) return false;
  }
  return guess;
}

function pointInRectangle(m = [0, 0], a = [-1, -1], b = [1, 1]) {
  let xAve = (a[0] + b[0]) / 2;
  let yAve = (a[1] + b[1]) / 2;
  let xWidth = math.abs(a[0] - b[0]) / 2;
  let yWidth = math.abs(a[1] - b[1]) / 2;
  // console.log({a,b,xAve, yAve, xWidth, yWidth, x: math.abs(m[0]-xAve), y: math.abs(m[1]-yAve)});
  return math.abs(m[0] - xAve) < xWidth && math.abs(m[1] - yAve) < yWidth;
}

function eci2synodicUnitless(
  state = synodicUnitless2eci(),
  date = mainWindow.startTime
) {
  // console.log(date);
  let moonEci = astro.moonEciFromTime(date);
  let moonEciDel = astro.moonEciFromTime(new Date(date - -1));
  let moonVel = math.subtract(moonEciDel, moonEci).map((s) => s / 0.001);
  let moonX = moonEci.map((s) => s / math.norm(moonEci));
  let moonZ = math.cross(moonEci, moonVel);
  moonZ = moonZ.map((s) => s / math.norm(moonZ));
  let moonY = math.cross(moonZ, moonX);
  let r = [moonX, moonY, moonZ];
  // console.log(r.map(s => math.norm(s)));
  state = [
    ...math.multiply(r, state.slice(0, 3)),
    ...math.multiply(r, state.slice(3)),
  ];
  let position = state.slice(0, 3).map((s) => s / mainWindow.lengthUnit);
  let velocity = state
    .slice(3)
    .map((s) => (s * mainWindow.timeUnit) / mainWindow.lengthUnit);
  position = math.add(position, [-mainWindow.mu, 0, 0]);
  velocity = math.subtract(velocity, math.cross([0, 0, 1], position));
  // let position = mainWindow.satellites[sat].state.slice(0,3)
  // let velocity = mainWindow.satellites[sat].state.slice(3)
  return [...position, ...velocity];
}

function eci2solarUnitless(
  state = synodicUnitless2eci(),
  date = mainWindow.startTime
) {
  // console.log(date);
  let earthEci = astro.sunEciFromTime(date).map((s) => -s);
  let tempLengthUnit = math.norm(earthEci);
  let earthEciDel = astro.sunEciFromTime(new Date(date - -1)).map((s) => -s);
  let earthVel = math.subtract(earthEciDel, earthEci).map((s) => s / 0.001);
  let earthX = earthEci.map((s) => s / tempLengthUnit);
  let earthZ = math.cross(earthEci, earthVel);
  earthZ = earthZ.map((s) => s / math.norm(earthZ));
  let earthY = math.cross(earthZ, earthX);
  let r = [earthX, earthY, earthZ];
  state = math.add(state.slice(0, 3), earthEci);
  // console.log(r.map(s => math.norm(s)));
  state = math.multiply(r, state.slice(0, 3));
  let position = state.slice(0, 3).map((s) => s / tempLengthUnit);
  position = math.add(position, [-mainWindow.mu, 0, 0]);
  // let position = mainWindow.satellites[sat].state.slice(0,3)
  // let velocity = mainWindow.satellites[sat].state.slice(3)
  return position;
}

function placeCoeObject(
  orbit = { a: 26500, e: 0, i: 0, raan: 0, arg: 0, tA: 0 },
  sat = 0
) {
  orbit = astro.coe2J2000(orbit);
  orbit = eci2synodicUnitless(orbit);
  console.log(orbit);
  mainWindow.satellites[0].state = orbit;
  mainWindow.satellites[0].stateHistory = undefined;
  // mainWindow.scenarioLength = orbit[7]*2*mainWindow.timeUnit/86400
  solveJacobiBoundaries(orbit.slice(0, 6));
  // drawScene()
}

function placeNewState(orbit = []) {
  orbit = astro.coe2J2000(orbit);
  orbit = eci2synodicUnitless(orbit);
  console.log(orbit);
  mainWindow.satellites[0].state = orbit;
  mainWindow.satellites[0].stateHistory = undefined;
  // mainWindow.scenarioLength = orbit[7]*2*mainWindow.timeUnit/86400
  solveJacobiBoundaries(orbit.slice(0, 6));
  // drawScene()
}

function placeObject(orbit = l2_halo_southern[1250].join('   '), sat = 0) {
  // console.log(orbit);
  mainWindow.scenarioTime = 0;
  // let orbit = `1147	8.2339081983651485E-1	-1.9017764504099543E-28	9.8941366235910004E-4	-2.3545391932685812E-15	1.2634272983881797E-1	2.2367029429442455E-16	3.1743435193301202E+0	2.7430007981241529E+0	1.2158772936893689E+1	1.1804065333857600E+3`.split('\t').map(s => Number(s))
  orbit = orbit
    .split(/ +/)
    .filter((s) => s.length > 0)
    .map((s) => Number(s));
  mainWindow.satellites[sat].state = orbit.slice(0, 6);
  mainWindow.satellites[sat].stateHistory = undefined;
  mainWindow.satellites[sat].inertialHistory = undefined;
  mainWindow.satellites[sat].period = (orbit[7] * mainWindow.timeUnit) / 86400;
  mainWindow.satellites[sat].manifolds = [];
  mainWindow.scenarioLength = (orbit[7] * 2 * mainWindow.timeUnit) / 86400;
  solveJacobiBoundaries(orbit.slice(0, 6));
  // drawScene()
}
// let c = 1.052
// let ints = setInterval(() => {
//     c += 0.0001
//     console.log(c.toFixed(4));
//     placeObject(c)

// },2000)

function removeContextMenu() {
  document.getElementById('context-menu')?.remove();
}

document.querySelector('canvas').addEventListener('pointerdown', (event) => {
  if (mainWindow.placeTrajectory === 'position') {
    mainWindow.placeTrajectory = 'velocity';
    return;
  } else if (mainWindow.placeTrajectory === 'velocity') {
    mainWindow.placeTrajectory = false;
    return;
  }
  mainWindow.mouseDown = true;

  removeContextMenu();
  mainWindow.mousePosition = [event.clientX, event.clientY];
});
document.querySelector('canvas').addEventListener('pointermove', (event) => {
  mainWindow.mousePosition =
    mainWindow.mousePosition === undefined ? [0, 0] : mainWindow.mousePosition;
  let delta = math.subtract(
    [event.clientX, event.clientY],
    mainWindow.mousePosition
  );
  if (mainWindow.mouseDown) {
    // Do stuff
    // console.log(mainWindow.view.el, mainWindow.view.az);
    mainWindow.view.desired.el += delta[1] / 5;
    mainWindow.view.desired.az += delta[0] / 5;
  }
  mainWindow.mousePosition = [event.clientX, event.clientY];
});
document.querySelector('canvas').addEventListener('pointerup', (event) => {
  mainWindow.mouseDown = false;
});

window.addEventListener('wheel', (event) => {
  if (mainWindow.plot !== undefined) {
    let x = mainWindow.plot.x;
    let delX = x[1] - x[0];
    delX /= event.deltaY > 0 ? 0.9 : 1 / 0.9;
    let meanX = (x[1] + x[0]) / 2;
    let y = mainWindow.plot.y;
    let delY = y[1] - y[0];
    delY /= event.deltaY > 0 ? 0.9 : 1 / 0.9;
    let meanY = (y[1] + y[0]) / 2;
    x = [meanX - delX / 2, meanX + delX / 2];
    y = [meanY - delY / 2, meanY + delY / 2];

    open2Dgraph(mainWindow.plot.points[0], mainWindow.plot.points[1], {
      cnvsIn: mainWindow.plot.cnvs,
      xLimits: x,
      yLimits: y,
      colors: mainWindow.plot.points[2],
      xlabel: mainWindow.plot.xlabel,
      ylabel: mainWindow.plot.ylabel,
      title: mainWindow.plot.title,
    });
    return;
  }
  mainWindow.view.desired.zoom += event.deltaY / 800;
  mainWindow.view.desired.zoom =
    mainWindow.view.desired.zoom < 0.00025
      ? 0.00025
      : mainWindow.view.desired.zoom;
  mainWindow.view.desired.zoom =
    mainWindow.view.desired.zoom > 2 ? 2 : mainWindow.view.desired.zoom;
});

function changeOrbit(el) {
  while (!el.classList.contains('orbit-drag-panel')) {
    el = el.parentElement;
  }
  let sat = el.getAttribute('sat');
  let input = Number(el.querySelector('input').value);
  let select = el.querySelector('select').value;

  let dataLength = math.floor(
    mainWindow.primaryBody === 'Earth'
      ? earth_moon_orbits[select].length * input
      : sun_earth_orbits[select].length * input
  );
  let data =
    mainWindow.primaryBody === 'Earth'
      ? earth_moon_orbits[select][dataLength]
      : sun_earth_orbits[select][dataLength];
  placeObject(data.join('   '), sat);
}

function matchOrbitEnergy(el) {
  while (!el.classList.contains('orbit-drag-panel')) {
    el = el.parentElement;
  }
  let sat = el.getAttribute('sat');
  let select = el.querySelector('select').value;
  let data = earth_moon_orbits[select].map((s) =>
    math.abs(s[6] - mainWindow.jacobiConstant)
  );
  data = data.findIndex((s) => s === math.min(data));
  placeObject(earth_moon_orbits[select][data].join('   '), sat);
}

function setOrbitEnergy(el) {
  while (!el.classList.contains('orbit-drag-panel')) {
    el = el.parentElement;
  }
  let sat = el.getAttribute('sat');
  solveJacobiBoundaries(mainWindow.satellites[sat].state);
}

function openOrbitDiv(sat = 0) {
  let newDiv = document.createElement('div');
  newDiv.setAttribute('sat', mainWindow.satellites.length - 1);
  console.log(newDiv.sat);
  newDiv.style.position = 'fixed';
  newDiv.style.padding = '1vh 0.5vh';
  newDiv.style.zIndex = 100;
  newDiv.style.top = 20 + 80 * mainWindow.satellites.length + 'px';
  newDiv.style.left = 20 + 20 * mainWindow.satellites.length + 'px';
  newDiv.style.width = 'auto';
  newDiv.style.height = 'auto';
  newDiv.style.fontFamily = 'Courier';
  newDiv.style.fontSize = '1.5vh';
  newDiv.style.backgroundColor = 'white';
  newDiv.style.border = '1px solid black';
  newDiv.style.borderRadius = '10px';
  newDiv.style.boxShadow = '5px 5px 7px #575757';
  newDiv.style.touchAction = 'none';
  newDiv.innerHTML = `
    <div id="orbit-drag-div-${sat}header" style="text-align: center; cursor: move;">${mainWindow.satellites[sat].name}</div>
    <div style="text-align: center">
        <div><h3 style="margin: 0px 5px;">Orbit Type</h3></div>
        <select class="orbit-select" oninput="changeOrbit(this)" style="font-size: 1.5vh">
        ${Object.keys(
          mainWindow.primaryBody === 'Earth'
            ? earth_moon_orbits
            : sun_earth_orbits
        )
          .map((key, ii) => {
            return `
                <option value="${key}">${key.toUpperCase()}</option>
            `;
          })
          .join('')}
        </select>
    </div>
    <div>
        <div style="padding: 10px;">
            <button onclick="matchOrbitEnergy(this)">Match Energy</button>
            <button onclick="setOrbitEnergy(this)">Set Energy</button>
        </div>
        <div><input oninput="changeOrbit(this)" type="range" style="width: 95%; height: 10px;" min="0" max="1" value="0.71" step="0.01"/></div>
    </div>
    <div style="text-align: center">
        <div><h3 style="margin: 0px 5px;">Show Manifolds</h3></div>
        <div style="display: flex; justify-content: space-around;">   
            <div>
                <div>Current</div>
                <div>Stable  <input class="stable-manifold-box" type="checkbox"/></div>
                <div>Unstable <input class="unstable-manifold-box" type="checkbox"/></div>
            </div>
            <div>
                <div>Total</div>
                <div><button onclick="showManifold(this)" sat="${sat}" mantype="stable-all" style="font-size: 1em;">Stable</button></div>
                <div><button onclick="showManifold(this)" sat="${sat}" mantype="unstable-all" style="font-size: 1em;">Unstable</button></div>
            </div>
        </div>
    </div>
    <div>
        <div>Pointing: <select class="pointing-select" sat="${sat}">
            <option value="-1">None</option>
            ${math
              .range(0, mainWindow.satellites.length - 1)
              ._data.map((s) => {
                return `
                    <option value="${s}">${mainWindow.satellites[s].name}</option>
                `;
              })
              .join('')}
            </select>
        </div>
        <div class="pointing-display">
            <div style="display: flex; justify-content: space-between;">
                <div>r</div>
                <div class="data-display">10000 km</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div>Earth</div>
                <div class="data-display">10 deg</div>
                <div class="data-display">10 deg</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div>Sun</div>
                <div class="data-display">10 deg</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div>Moon</div>
                <div class="data-display">10 deg</div>
                <div class="data-display">10 deg</div>
            </div>
        </div>
    </div>
    `;
  newDiv.id = 'orbit-drag-div-' + sat;
  newDiv.setAttribute('sat', sat);
  newDiv.classList.add('orbit-drag-panel');
  let exitButton = document.createElement('div');
  exitButton.innerText = 'X';
  exitButton.style.position = 'absolute';
  exitButton.style.top = '1px';
  exitButton.style.right = '3px';
  exitButton.style.cursor = 'pointer';
  exitButton.onclick = (el) => {
    let sat = Number(el.target.parentElement.getAttribute('sat'));
    el.target.parentElement.remove();
    mainWindow.satellites.splice(sat, 1);
  };
  newDiv.append(exitButton);
  let fontSizeButton = document.createElement('div');
  fontSizeButton.innerHTML =
    '<span type="small" style="font-size: 0.5em; margin-right: 15px; cursor: pointer">A</span><span type="big" style="font-size: 1em; cursor: pointer">A</span>';
  fontSizeButton.style.position = 'absolute';
  fontSizeButton.style.top = '1px';
  fontSizeButton.style.left = '3px';
  fontSizeButton.classList.add('font-size-button');
  // If exit button clicked remove data requirement
  document.body.append(newDiv);
  // newDiv.append(exitButton)
  newDiv.append(fontSizeButton);
  let fontButtons = [
    ...newDiv.querySelector('.font-size-button').querySelectorAll('span'),
  ].forEach((sp) => {
    sp.onclick = (el) => {
      let relDiv = el.target.parentElement.parentElement;
      let fontSize = Number(
        relDiv.style.fontSize.slice(0, relDiv.style.fontSize.length - 2)
      );
      fontSize += el.target.getAttribute('type') === 'big' ? 1 : -1;
      fontSize = fontSize < 12 ? 12 : fontSize;
      relDiv.style.fontSize = fontSize + 'px';
    };
  });
  dragElement(newDiv);
}

function showManifold(el) {
  let type = el.getAttribute('mantype').split('-');
  let sat = Number(el.getAttribute('sat'));
  // console.log(sat);
  mainWindow.satellites[sat].manifolds = [];
  let objFunction = false;
  mainWindow.killFunction = undefined;
  if (mainWindow.manifoldLimit !== undefined) {
    let variable = mainWindow.manifoldLimit.line[0];
    switch (variable) {
      case 'x':
        objFunction = (state) => {
          return (
            state[1] * mainWindow.manifoldLimit.line[1] +
            mainWindow.manifoldLimit.line[2] -
            state[0]
          );
        };
        if (
          mainWindow.manifoldLimit.line[2] > mainWindow.lagrangePoints[0][0]
        ) {
          // Add kill function over the earth
          mainWindow.killFunction = (state) => {
            return state[1] * 0 + -mainWindow.mu - state[0];
          };
        }
        break;
      case 'y':
        objFunction = (state) => {
          return (
            state[0] * mainWindow.manifoldLimit.line[1] +
            mainWindow.manifoldLimit.line[2] -
            state[1]
          );
        };
        break;

      default:
        objFunction = false;
        break;
    }
  }
  if (type[1] === 'instant') {
    let curState = getCurrentState(
      mainWindow.satellites[sat].stateHistory,
      mainWindow.scenarioTime
    );
    mainWindow.satellites[sat].manifolds.push(
      findStateEigenvectors(curState, 1, type[0] === 'stable', objFunction, 0)
    );
    mainWindow.satellites[sat].manifolds.push(
      findStateEigenvectors(curState, -1, type[0] === 'stable', objFunction, 0)
    );
    return;
  }
  showTubeManifold(type[0] === 'stable', 1, sat, objFunction, 0);
  showTubeManifold(type[0] === 'stable', -1, sat, objFunction, 0);
}

function setTime(fractionTime = 0) {
  mainWindow.scenarioTimeDesired =
    mainWindow.scenarioLength * 86400 * fractionTime;
}

function openDraggableDiv(innerHTML, id = 'time-drag-div') {
  let newDiv = document.createElement('div');
  newDiv.style.position = 'fixed';
  newDiv.style.padding = '0px 10px 10px 10px';
  newDiv.style.zIndex = 100;
  newDiv.style.top = '80vh';
  newDiv.style.left = '20px';
  newDiv.style.width = 'auto';
  newDiv.style.height = 'auto';
  newDiv.style.fontFamily = 'Courier';
  newDiv.style.fontSize = '20px';
  newDiv.style.backgroundColor = 'white';
  newDiv.style.border = '1px solid black';
  newDiv.style.borderRadius = '10px';
  newDiv.style.boxShadow = '5px 5px 7px #575757';
  newDiv.style.touchAction = 'none';
  newDiv.innerHTML =
    innerHTML ||
    `
        <div style="cursor: move; padding-left: 40px;" id="time-drag-divheader">Time Display</div>
        <div id="time-display">${astro.toStkDateFormat(new Date())}</div>
        <div style="width: 100%"><input oninput="setTime(this.value)" style="width: 100%" type="range" value="0" min="0" max="1" step="0.001"/></div>
    `;
  newDiv.id = id;
  let fontSizeButton = document.createElement('div');
  fontSizeButton.innerHTML =
    '<span type="small" style="font-size: 0.5em; margin-right: 15px; cursor: pointer">A</span><span type="big" style="font-size: 1em; cursor: pointer">A</span>';
  fontSizeButton.style.position = 'absolute';
  fontSizeButton.style.top = '1px';
  fontSizeButton.style.left = '3px';
  fontSizeButton.classList.add('font-size-button');
  // If exit button clicked remove data requirement
  document.body.append(newDiv);
  // newDiv.append(exitButton)
  newDiv.append(fontSizeButton);
  let fontButtons = [
    ...newDiv.querySelector('.font-size-button').querySelectorAll('span'),
  ].forEach((sp) => {
    sp.onclick = (el) => {
      let relDiv = el.target.parentElement.parentElement;
      let fontSize = Number(
        relDiv.style.fontSize.slice(0, relDiv.style.fontSize.length - 2)
      );
      fontSize += el.target.getAttribute('type') === 'big' ? 1 : -1;
      fontSize = fontSize < 12 ? 12 : fontSize;
      relDiv.style.fontSize = fontSize + 'px';
    };
  });
  dragElement(newDiv);
}

function dragElement(elmnt) {
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  // console.log(elmnt.id + "header");
  if (document.getElementById(elmnt.id + 'header')) {
    // console.log('hey');
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + 'header').onpointerdown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onpointerdown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onpointerup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onpointermove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos2 + 'px';
    elmnt.style.left = elmnt.offsetLeft - pos1 + 'px';
    if (Number(elmnt.style.left.slice(0, elmnt.style.left.length - 2)) < 0) {
      elmnt.style.left = '0px';
    }
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    console.log('released');
    document.onpointerup = null;
    document.onpointermove = null;
  }
}

function polyFit(x = [0, 1, 2, 3, 4], y = [2, 3, 4, 5, 6], poly = 4) {
  if (x.length <= poly) {
    poly = x.length - 1;
  }
  let constants = math.zeros(poly + 1)._data;
  for (let ii = 0; ii < 10; ii++) {
    let a = [];
    for (let index = poly; index >= 0; index--) {
      a.push(x.map((s) => s ** index));
    }
    a = math.transpose(a);
    a = math.multiply(
      math.inv(math.multiply(math.transpose(a), a)),
      math.transpose(a)
    );
    let yError = math.subtract(
      y,
      x.map((s) => answerPolynomial(constants, s))
    );
    // console.log(math.squeeze(math.multiply(a, math.transpose([yError]))), constants);
    constants = math.add(
      constants,
      math.squeeze(math.multiply(a, math.transpose([yError])))
    );
  }
  return constants;
}

function createJacobian(state = [0.5, 0, 0, 0, 0, 0]) {
  let x = state[0],
    y = state[1],
    z = state[2];
  let mu = mainWindow.mu;
  let r1 = (x + mu) ** 2 + y ** 2 + z ** 2;
  let r2 = (x + mu - 1) ** 2 + y ** 2 + z ** 2;
  let dxdd_dx =
    (mu - 1) / r1 ** 1.5 -
    (3 * (mu - 1) * (x + mu) ** 2) / r1 ** 2.5 -
    mu / r2 ** 1.5 +
    (3 * mu * (x + mu - 1) ** 2) / r2 ** 2.5 +
    1;
  let dxdd_dy =
    (3 * mu * (x + mu - 1) * y) / r2 ** 2.5 -
    (3 * (mu - 1) * (x + mu) * y) / r1 ** 2.5;
  let dxdd_dz =
    (3 * mu * (x + mu - 1) * z) / r2 ** 2.5 -
    (3 * (mu - 1) * (x + mu) * z) / r1 ** 2.5;

  let dydd_dx =
    (3 * mu * y * (x + mu - 1)) / r2 ** 2.5 -
    (3 * (mu - 1) * y * (x + mu)) / r1 ** 2.5;
  let dydd_dy =
    (mu - 1) / r1 ** 1.5 -
    (3 * (mu - 1) * y ** 2) / r1 ** 2.5 -
    mu / r2 ** 1.5 +
    (3 * mu * y ** 2) / r2 ** 2.5 +
    1;
  let dydd_dz =
    (3 * mu * y * z) / r2 ** 2.5 - (3 * (mu - 1) * y * z) / r1 ** 2.5;

  let dzdd_dx =
    (3 * (1 - mu) * z * (mu + x)) / r1 ** 2.5 +
    (3 * mu * z * (x + mu - 1)) / r2 ** 2.5;
  let dzdd_dy =
    (3 * mu * z * y * (1 - mu)) / r1 ** 2.5 + (3 * mu * z * y) / r2 ** 2.5;
  let dzdd_dz =
    (mu - 1) / r1 ** 1.5 -
    (3 * (mu - 1) * z ** 2) / r1 ** 2.5 -
    mu / r2 ** 1.5 +
    (3 * mu * z ** 2) / r2 ** 2.5;

  return [
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 1],
    [dxdd_dx, dxdd_dy, dxdd_dz, 0, 2, 0],
    [dydd_dx, dydd_dy, dydd_dz, -2, 0, 0],
    [dzdd_dx, dzdd_dy, dzdd_dz, 0, 0, 0],
  ];
}

function powerMethod(
  matrix = [
    [3, -1, 0],
    [-2, 4, -3],
    [0, -1, 1],
  ],
  guess = [1, 1, 1],
  shifted = 3
) {
  // console.log(math.eigs(matrix));
  let a = matrix.map((s) => s.slice());
  if (shifted !== false) {
    a = math.subtract(
      a,
      math.dotMultiply(shifted, math.identity([matrix.length]))
    );
    a = math.inv(a);
  }
  let maxValue,
    v,
    lastMaxValue = 100000,
    count = 0;
  for (let index = 0; index < 5000; index++) {
    v = math.multiply(a, guess);
    lastMaxValue = maxValue + 0;
    maxValue = v.findIndex(
      (s) => Math.abs(s) === math.max(v.map((s) => Math.abs(s)))
    );
    maxValue = v[maxValue];
    v = v.map((s) => s / maxValue);
    guess = v;
    count++;
    if (math.abs(maxValue - lastMaxValue) < 1e-8) {
      break;
    }
  }
  if (shifted !== false) {
    maxValue = 1 / maxValue + shifted;
  }
  return { value: maxValue, vector: v };
}

function propagateCrtbp(
  state = [0.5, 0, 0, 0, 0, 0],
  propTime = -30,
  error = mainWindow.epsilon
) {
  propTime *= 86400 / mainWindow.timeUnit;
  let dt = (Math.sign(propTime) * 3600) / mainWindow.timeUnit,
    t = 0;
  while (math.abs(t) < math.abs(propTime)) {
    let proppedState = rkf45(state, dt, error);
    // console.log(proppedState.te, dt);
    dt = proppedState.hnew;
    state = proppedState.y;
    t += proppedState.dt;
  }
  state = rkf45(state, propTime - t, error);
  return state.y;
}

window.addEventListener('keydown', (event) => {});

function findStateEigenvectors(
  state = [
    mainWindow.lagrangePoints[1][0],
    mainWindow.lagrangePoints[1][1],
    0,
    0,
    0,
    0,
  ],
  dir = 1,
  stable = true,
  objFunction = false,
  objFunctionValue
) {
  let jac = createJacobian(state),
    eig;
  // console.log(jac);
  try {
    eig = powerMethod(jac, [1, 1, 1, 0, 0, 0], stable ? -3 : 3);
    // console.log(eig, calculateEigenvalues(jac))
  } catch (error) {
    console.log(error);
    console.log(error.values, error.vectors);
  }
  // console.log(eig);
  dir = dir * eig.vector[0] > 0 ? 1 : -1;
  let pertEpsilon =
    mainWindow.eigEpsilon /
    (mainWindow.lengthUnit * eig.vector.reduce((a, b) => a + b ** 2, 0));
  // console.log(pertEpsilon);
  let perturbedState = math.add(
    state,
    math.dotMultiply(dir * pertEpsilon, eig.vector)
  );
  // perturbedState = propagateCrtbp(perturbedState, -mainWindow.eigPropTime, 1e-10)
  return calculateStateHistoryToValue(
    perturbedState,
    (stable ? -1 : 1) * mainWindow.eigPropTime,
    mainWindow.epsilon,
    {
      objFunction,
      objFunctionValue,
    }
  ).filter((time, ii) => ii % (objFunction ? 1 : 3) === 0);
  // return calculateStateHistoryToValue(perturbedState, (stable ? -1 : 1) * mainWindow.eigPropTime,1e-9, {xLimit: 1-mainWindow.mu}).filter((time,ii) => ii % 3 === 0)
  // mainWindow.scenarioLength = 90
  // return perturbedState
}

function showTubeManifold(
  stable = true,
  dir = 1,
  sat = 0,
  objFunction = false,
  objValue = false
) {
  // mainWindow.displayedPoints = []
  let state = mainWindow.satellites[sat].state.slice();
  let tf = mainWindow.satellites[sat].period;

  for (let index = 0; index < tf; index += tf / mainWindow.tubeManN) {
    state = propagateCrtbp(state, tf / mainWindow.tubeManN, mainWindow.epsilon);
    // mainWindow.displayedPoints.push(state)
    mainWindow.satellites[sat].manifolds.push(
      findStateEigenvectors(state, dir, stable, objFunction, objValue)
    );
  }
}

function plotManifold(stable = true, dir = 1, sat1 = 0, sat2 = 1) {
  // mainWindow.displayedPoints = []
  let tf1 = mainWindow.satellites[sat1].period;
  let times1 = math.range(0, tf1, tf1 / mainWindow.plotManN);
  let tf2 = mainWindow.satellites[sat2].period;
  let times2 = math.range(0, tf2, tf2 / mainWindow.plotManN);
  let objFunction;
  if (mainWindow.manifoldLimit !== undefined) {
    let variable = mainWindow.manifoldLimit.line[0];
    switch (variable) {
      case 'x':
        objFunction = (state) => {
          return (
            state[1] * mainWindow.manifoldLimit.line[1] +
            mainWindow.manifoldLimit.line[2] -
            state[0]
          );
        };
        if (
          mainWindow.manifoldLimit.line[2] > mainWindow.lagrangePoints[0][0]
        ) {
          // Add kill function over the earth
          mainWindow.killFunction = (state) => {
            return state[1] * 0 + -mainWindow.mu - state[0];
          };
        }
        break;
      case 'y':
        objFunction = (state) => {
          return (
            state[0] * mainWindow.manifoldLimit.line[1] +
            mainWindow.manifoldLimit.line[2] -
            state[1]
          );
        };
        break;

      default:
        objFunction = false;
        break;
    }
  }
  let points1 = [],
    points2 = [],
    timeArray1 = [],
    timeArray2 = [];
  times1.forEach((time) => {
    let state = getCurrentState(
      mainWindow.satellites[sat1].stateHistory,
      time * 86400
    );

    let manifoldState = findStateEigenvectors(
      state,
      dir,
      !stable,
      objFunction,
      0
    );
    if (manifoldState.length !== 0) {
      points1.push([
        [
          manifoldState[manifoldState.length - 1].state[1],
          manifoldState[manifoldState.length - 1].state[4],
        ],
        '#881111',
      ]);
      timeArray1.push(time * 86400);
    }
    manifoldState = findStateEigenvectors(state, -dir, !stable, objFunction, 0);
    if (manifoldState.length !== 0) {
      points1.push([
        [
          manifoldState[manifoldState.length - 1].state[1],
          manifoldState[manifoldState.length - 1].state[4],
        ],
        '#881111',
      ]);
      timeArray1.push(time * 86400);
    }
  });
  times2.forEach((time) => {
    // console.log(time);
    let state = getCurrentState(
      mainWindow.satellites[sat2].stateHistory,
      time * 86400
    );

    let manifoldState = findStateEigenvectors(
      state,
      -dir,
      stable,
      objFunction,
      0
    );
    if (manifoldState.length !== 0) {
      points2.push([
        [
          manifoldState[manifoldState.length - 1].state[1],
          manifoldState[manifoldState.length - 1].state[4],
        ],
        '#114411',
      ]);
      timeArray2.push(time * 86400);
    }
    manifoldState = findStateEigenvectors(state, dir, stable, objFunction, 0);
    if (manifoldState.length !== 0) {
      points2.push([
        [
          manifoldState[manifoldState.length - 1].state[1],
          manifoldState[manifoldState.length - 1].state[4],
        ],
        '#114411',
      ]);
      timeArray2.push(time * 86400);
    }
    // mainWindow.satellites[sat].manifolds.push(findStateEigenvectors(state, dir, stable))
  });
  open2Dgraph(
    [points1.map((s) => s[0][1]), points2.map((s) => s[0][1])],
    [points1.map((s) => s[0][0]), points2.map((s) => s[0][0])],
    {
      yLimits: [-1.5, 2.5],
      xlabel: 'Velocity',
      ylabel: 'Position',
      title: 'Poincaré Map',
      xLimits: [-0.6, 0.6],
      yLimits: [-0.1, 0.1],
      times: [timeArray1, timeArray2],
    }
  );
}

function useRealDynamics() {
  let h = new Propagator({
    atmDrag: false,
  });
  mainWindow.satellites.forEach((sat, satIi) => {
    let state = synodicUnitless2eci(0, satIi);
    console.log(state);
    let stateHistory = h.propToTimeHistory(
      state,
      mainWindow.startTime,
      16 * 86400,
      0.001
    );
    console.log(stateHistory);
    stateHistory = stateHistory.map((state) => {
      return {
        t: (state.date - mainWindow.startTime) / 1000 / mainWindow.timeUnit,
        state: eci2synodicUnitless(state.state, state.date),
      };
    });
    sat.stateHistory = stateHistory;
  });
}

function enterStableManifold(sat = 0, dir = -1) {
  let state = getCurrentState(
    mainWindow.satellites[sat].stateHistory,
    mainWindow.scenarioTime
  );
  let stableHist = findStateEigenvectors(state, dir, true);
  state = stableHist[0].state;
  state = propagateCrtbp(state, -mainWindow.scenarioLength * 2);
  mainWindow.satellites[sat].state = state;
  mainWindow.satellites[sat].manifolds = [];
  mainWindow.satellites[sat].stateHistory = undefined;
  mainWindow.scenarioLength *= 3; //undefined
}

function showInjectionOptions(sat = 0) {
  let state = getCurrentState(
    mainWindow.satellites[sat].stateHistory,
    mainWindow.scenarioTime
  );
  let v = state.slice(3, 6);
  let vMag = math.norm(v);
  v = v.map((s) => s / math.norm(v));
  let burns = math
    .range(-vMag * 2, 0, 0.1, true)
    .map((s) => (s * mainWindow.timeUnit) / mainWindow.lengthUnit);
  console.log(burns);
  mainWindow.satellites[sat].manifolds = [];
  let objFunction = (state) => {
    state = math.subtract(state, [-mainWindow.mu, 0, 0, 0, 0, 0]);
    return math.dot(state.slice(0, 3), state.slice(3));
  };
  burns.forEach((b) => {
    let vBurn = v.map((s) => s * b);
    let vState = math.add(state, [0, 0, 0, ...vBurn]);
    let hist = calculateStateHistoryToValue(vState, -8, 1e-9, {
      objFunction,
      objFunctionValue: 0,
      tol: 1e-6,
    }).filter((time, ii) => ii % 3 === 0);
    mainWindow.satellites[sat].manifolds.push(hist);
  });
}

document.oncontextmenu = startContextClick;

function startContextClick(event) {
  if (event.clientX === undefined) {
    event.clientX = event.touches[0].clientX;
    event.clientY = event.touches[0].clientY;
  }

  let ctxMenu;
  if (document.getElementById('context-menu') === null) {
    ctxMenu = document.createElement('div');
    ctxMenu.style.position = 'fixed';
    ctxMenu.id = 'context-menu';
    ctxMenu.style.zIndex = 101;
    ctxMenu.style.backgroundColor = 'black';
    ctxMenu.style.borderRadius = '15px';
    ctxMenu.style.transform = 'scale(0)';
    ctxMenu.style.fontSize = '1.5em';
    ctxMenu.style.padding = '10px';
    ctxMenu.style.minWidth = '263px';
    document.body.appendChild(ctxMenu);
  }
  ctxMenu = document.getElementById('context-menu');
  ctxMenu.style.top = event.clientY + 'px';
  ctxMenu.style.left = event.clientX + 'px';
  // Check if right clicked on data display
  let eventPath,
    pathIndex = -1;
  try {
    eventPath = event.composedPath();
  } catch (error) {
    eventPath = undefined;
  }
  try {
    if (eventPath === undefined) {
      eventPath = [];
      let el = event.target;
      while (el !== null) {
        eventPath.push(el);
        el = el.parentElement;
      }
    }
    if (eventPath.length > 0) {
      pathIndex = eventPath
        .map((s) => s.classList)
        .filter((s) => s !== undefined)
        .map((s) => s.contains('data-drag-div'))
        .findIndex((s) => s);
    } else throw Error;
  } catch (error) {
    console.error('Error on right click path');
    pathIndex = -1;
  }

  ctxMenu.innerHTML = `
        <div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white;">Set View Center</div>
        <div class="hover-div" onclick="addSatellite()" style="cursor: pointer; color: white;">Insert Satellite</div>
        <div class="hover-div" title="Place analyst sat at a given position with displayed Jacobi Constant derived velocity" onclick="placeTrajectory()" style="cursor: pointer; color: white;">Place Trajectory</div>
        <div class="hover-div" onclick="setManifoldLimit(this)" style="cursor: pointer; color: white;">Define Plane</div>
        <div class="hover-div" onclick="switchFrame()" style="cursor: pointer; color: white;">Show ${mainWindow.moonFrame ? 'Inertial' : 'Synodic'} Frame</div>
        <div class="hover-div" onclick="switchPrimary()" style="cursor: pointer; color: white;">Switch Primary Body</div>
        <div class="hover-div" onclick="setOptions(this)" style="cursor: pointer; color: white;">Set Options</div>

    `;
  placeContextMenu();
  setTimeout(() => (ctxMenu.style.transform = 'scale(1)'), 10);
  return false;
}

function placeTrajectory() {
  if (mainWindow.placeTrajectory === false) {
    mainWindow.placeTrajectory = 'position';
    mainWindow.view.desired.el = 90;
    mainWindow.view.desired.az = 0;
    removeContextMenu();
  } else if (mainWindow.placeTrajectory === 'position') {
    mainWindow.placeTrajectory = 'velocity';
  } else {
    mainWindow.placeTrajectory = false;
  }
}

function placeContextMenu() {
  let ctxMenu = document.getElementById('context-menu');
  if (ctxMenu.offsetHeight + event.clientY > window.innerHeight) {
    ctxMenu.style.top = window.innerHeight - ctxMenu.offsetHeight + 'px';
  }
  if (ctxMenu.offsetWidth + event.clientX > window.innerWidth) {
    ctxMenu.style.left = window.innerWidth - ctxMenu.offsetWidth + 'px';
  }
}

function setManifoldLimit(el) {
  if (el.innerText === 'Define Plane') {
    el.parentElement.innerHTML = `
            <div style="cursor: default; color: white;">Phase Space Center</div>
            <div class="hover-div" onclick="setManifoldLimit(this)" style="cursor: pointer; color: white; padding-left: 20px;">Moon</div>
            <div class="hover-div" onclick="setManifoldLimit(this)" style="cursor: pointer; color: white; padding-left: 20px;">Earth</div>
            <div class="hover-div" onclick="setManifoldLimit(this)" style="cursor: pointer; color: white; padding-left: 20px;">L1</div>
            <div class="hover-div" onclick="setManifoldLimit(this)" style="cursor: pointer; color: white; padding-left: 20px;">L2</div>
            <div class="hover-div" onclick="setManifoldLimit(this)" style="cursor: pointer; color: white; padding-left: 20px;">Delete</div>
        `;
    return;
  } else if (el.innerText === 'X-Z Plane' || el.innerText === 'Y-Z Plane') {
    let coordinates,
      center = el.getAttribute('center').toLowerCase();
    console.log(center);
    switch (center) {
      case 'moon':
        coordinates = [1 - mainWindow.mu, 0, 0];
        break;
      case 'l1':
        coordinates = [
          mainWindow.lagrangePoints[0][0],
          mainWindow.lagrangePoints[0][1],
          mainWindow.lagrangePoints[0][2],
        ];
        break;
      case 'l2':
        coordinates = [
          mainWindow.lagrangePoints[1][0],
          mainWindow.lagrangePoints[1][1],
          mainWindow.lagrangePoints[1][2],
        ];
        break;
      case 'earth':
        coordinates = [-mainWindow.mu, 0, 0];
        break;

      default:
        return;
    }
    mainWindow.manifoldLimit = {
      point1: coordinates,
      point2: [
        el.innerText === 'X-Z Plane' ? coordinates[0] : -1,
        el.innerText === 'X-Z Plane' ? -1 : coordinates[1],
        0,
      ],
      line: [el.innerText === 'X-Z Plane' ? 'x' : 'y', 0, coordinates[0]],
      choose: false,
    };
    removeContextMenu();
  } else if (el.innerText === 'Delete') {
    mainWindow.manifoldLimit = undefined;
    removeContextMenu();
  } else {
    el.parentElement.innerHTML = `
            <div style="cursor: default; color: white;">Phase Space Orientation</div>
            <div class="hover-div" center="${el.innerText}" onclick="setManifoldLimit(this)" style="cursor: pointer; color: white; padding-left: 20px;">X-Z Plane</div>
            <div class="hover-div" center="${el.innerText}" onclick="setManifoldLimit(this)" style="cursor: pointer; color: white; padding-left: 20px;">Y-Z Plane</div>
        `;
    return;
  }
}

function switchFrame() {
  mainWindow.moonFrame = !mainWindow.moonFrame;
  document.getElementById('context-menu')?.remove();
  if (mainWindow.moonFrame) return;
  mainWindow.satellites.forEach((sat) => {
    sat.inertialHistory = undefined;
  });
}

function addSatellite(state, options = {}) {
  let { period = mainWindow.scenarioLength, color = '#6666dd' } = options;
  removeContextMenu();
  let n = mainWindow.satellites.length;
  mainWindow.satellites.push({
    period,
    state,
    stateHistory: undefined,
    manifolds: [],
    color,
    stableManifold: false,
    unstableManifold: false,
    name: 'Sat #' + Math.floor(10000 * Math.random()),
  });
  let selects = [...document.querySelectorAll('.pointing-select')];

  selects.forEach((s) => {
    let opt = document.createElement('option');
    opt.value = n;
    opt.innerText = mainWindow.satellites[n].name;
    s.append(opt);
  });
  openOrbitDiv(n);
  if (state !== undefined) return;
  changeOrbit(document.querySelector('#orbit-drag-div-' + n + 'header'));
}

function setViewCenter(el) {
  if (el.innerText === 'Set View Center') {
    el.parentElement.innerHTML = `
            <div style="cursor: default; color: white;">Set View Center</div>
            <div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white; padding-left: 20px;">${mainWindow.primaryBody}</div>
            <div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white; padding-left: 20px;">${mainWindow.secondaryBody}</div>
            <div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white; padding-left: 20px;">Barycenter</div>
            <div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white; padding-left: 20px;">L1</div>
            <div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white; padding-left: 20px;">L2</div>
            <div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white; padding-left: 20px;">L3</div>
            <div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white; padding-left: 20px;">L4</div>
            <div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white; padding-left: 20px;">L5</div>
            ${mainWindow.satellites
              .map((sat) => {
                return `<div class="hover-div" onclick="setViewCenter(this)" style="cursor: pointer; color: white; padding-left: 20px;">${sat.name}</div>`;
              })
              .join('')}
        `;
    placeContextMenu();
    return;
  }
  mainWindow.view.centerSat = undefined;
  switch (el.innerText) {
    case mainWindow.primaryBody:
      mainWindow.view.desired.center = [-mainWindow.mu, 0, 0];
      break;
    case mainWindow.secondaryBody:
      mainWindow.view.desired.center = [1 - mainWindow.mu, 0, 0];
      break;
    case 'Barycenter':
      mainWindow.view.desired.center = [0, 0, 0];
      break;
    case 'L1':
      mainWindow.view.desired.center = mainWindow.lagrangePoints[0];
      break;
    case 'L2':
      mainWindow.view.desired.center = mainWindow.lagrangePoints[1];
      break;
    case 'L3':
      mainWindow.view.desired.center = mainWindow.lagrangePoints[2];
      break;
    case 'L4':
      mainWindow.view.desired.center = mainWindow.lagrangePoints[3];
      break;
    case 'L5':
      mainWindow.view.desired.center = mainWindow.lagrangePoints[4];
      break;

    default:
      mainWindow.view.centerSat = mainWindow.satellites.findIndex(
        (s) => s.name === el.innerText
      );
  }
  removeContextMenu();
}

function setOptions(el) {
  if (el.innerText === 'Set Options') {
    console.log(el);
    el.parentElement.innerHTML = `
            <div style="cursor: default; color: white;">Options</div>
            <div style="color: white; padding-left: 20px;">Max Prop Error 1e-<input min="1" style="font-size: 1em; width: 3ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" value="${mainWindow.epsilon.toExponential(1).split('-')[1]}"/></div>
            <div style="color: white; padding-left: 20px;">Manifold Prop Time <input min="1" style="font-size: 1em; width: 7ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" value="${mainWindow.eigPropTime.toFixed(1)}"/> days</div>
            <div style="color: white; padding-left: 20px;"># Visible Manifolds <input min="10" style="font-size: 1em; width: 7ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" value="${mainWindow.tubeManN}"/></div>
            <div style="color: white; padding-left: 20px;"># Plot Manifolds <input min="50" style="font-size: 1em; width: 7ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" value="${mainWindow.plotManN}"/></div>
            <div style="color: white; padding-left: 20px;">Animate Speed <input min="0" style="font-size: 1em; width: 7ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" value="${mainWindow.animationSpeed}"/> days/second</div>
            <div class="hover-div" onclick="setOptions(this)" style="cursor: pointer; color: white; padding-left: 20px;">Save</div>
            <div class="hover-div" onclick="plotManifold()" style="cursor: pointer; color: white; padding-left: 20px;">Plot Manifold (not complete)</div>
            <div class="hover-div" onclick="setOptions(this)" style="cursor: pointer; color: white; padding-left: 20px;">Add Analyst Satellite</div>
            <div class="hover-div" onclick="setOptions(this)" style="cursor: pointer; color: white; padding-left: 20px;">Delete Analyst Satellites</div>
        `;
    return;
  } else if (el.innerText === 'Add Analyst Satellite') {
    el.parentElement.innerHTML = `
            <div style="cursor: default; color: white;">Add Analyst Satellite</div>
            <div style="color: white; padding-left: 20px;">X <input style="font-size: 1em; width: 5ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" placeholder="0.5"/> LU</div>
            <div style="color: white; padding-left: 20px;">Y <input style="font-size: 1em; width: 5ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" placeholder="0"/> LU</div>
            <div style="color: white; padding-left: 20px;">Z <input style="font-size: 1em; width: 5ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" placeholder="0"/> LU</div>
            <div style="color: white; padding-left: 20px;">dX <input style="font-size: 1em; width: 5ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" placeholder="0"/> LU/TU</div>
            <div style="color: white; padding-left: 20px;">dY <input style="font-size: 1em; width: 5ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" placeholder="0"/> LU/TU</div>
            <div style="color: white; padding-left: 20px;">dZ <input style="font-size: 1em; width: 5ch; text-align: center; padding: 0; background-color: black; color: white;" type="number" placeholder="0"/> LU/TU</div>
            <div class="hover-div" onclick="setOptions(this)" style="cursor: pointer; color: white; padding-left: 20px;">Add</div>
        `;
    return;
  } else if (el.innerText === 'Add') {
    let state = [...el.parentElement.querySelectorAll('input')]
      .map((s) => (s.value === '' ? s.placeholder : s.value))
      .map((s) => Number(s));
    mainWindow.analystSats.push({
      state,
      color: 'yellow',
      stateHistory: undefined,
    });
    removeContextMenu();
    return;
  } else if (el.innerText === 'Delete Analyst Satellites') {
    mainWindow.analystSats = [];
    return;
  }
  let inputs = [...el.parentElement.querySelectorAll('input')].map((s) =>
    Number(s.value)
  );
  let errorLimit = inputs[0];
  let manPropTime = inputs[1];
  let tubeManN = inputs[2];
  let plotManN = inputs[3];
  let animSpeed = inputs[4];
  if (errorLimit < 3) return;
  if (manPropTime < 1) return;
  if (plotManN < 50) return;
  if (animSpeed < 0) return;
  mainWindow.epsilon = Number('1e-' + errorLimit);
  mainWindow.eigPropTime = Number(manPropTime);
  mainWindow.tubeManN = Number(tubeManN);
  mainWindow.plotManN = Number(plotManN);
  mainWindow.animationSpeed = animSpeed;
  mainWindow.satellites.forEach((sat) => {
    sat.stateHistory = undefined;
  });
  removeContextMenu();
}

function solveJacobiBoundaries(state = mainWindow.state, c) {
  let dfdy = (x, y, z, mu) => {
    return (
      (-2 * (1 - mu) * y) / (z * z + y * y + (x + mu) ** 2) ** 1.5 -
      (2 * mu * y) / (z * z + y * y + (x + mu - 1) ** 2) ** 1.5 +
      2 * y
    );
  };
  let dfdx = (x, y, z, mu) => {
    return (
      (-2 * (1 - mu) * (x + mu)) / (z * z + y * y + (x + mu) ** 2) ** 1.5 -
      (2 * mu * (x + mu - 1)) / (z * z + y * y + (x + mu - 1) ** 2) ** 1.5 +
      2 * x
    );
  };
  let f = (x, y, z, mu, c) => {
    return (
      -c +
      x * x +
      y * y +
      (2 * (1 - mu)) / (z * z + y * y + (x + mu) ** 2) ** 0.5 +
      (2 * mu) / (z * z + y * y + (x + mu - 1) ** 2) ** 0.5
    );
  };
  let outLines = {
    big: [],
    small: [[]],
    smallIndex: 0,
  };
  mainWindow.displayedPoints = [];
  let mu = mainWindow.mu;
  let r1 = ((state[0] + mu) ** 2 + state[1] ** 2 + state[2] ** 2) ** 0.5;
  let r2 = ((state[0] + mu - 1) ** 2 + state[1] ** 2 + state[2] ** 2) ** 0.5;
  c =
    c ||
    -state.slice(3).reduce((a, b) => a + b ** 2, 0) +
      state[0] ** 2 +
      state[1] ** 2 +
      (2 * (1 - mu)) / r1 +
      (2 * mu) / r2;
  mainWindow.jacobiConstant = c;

  // Calculate if boundaries connect at each point
  let boundaryConnections = {
    l1:
      f(mainWindow.lagrangePoints[0][0], 0, mainWindow.zBoundaryLevel, mu, c) <
      0,
    l2:
      f(mainWindow.lagrangePoints[1][0], 0, mainWindow.zBoundaryLevel, mu, c) <
      0,
    l3:
      f(mainWindow.lagrangePoints[2][0], 0, mainWindow.zBoundaryLevel, mu, c) <
      0,
    moon: f(1 - mu, 0, mainWindow.zBoundaryLevel, mu, c) < 0,
  };
  // console.log(boundaryConnections);
  // console.log(boundaryConnections);
  // console.log(mainWindow.lagrangePoints);
  // console.log(boundaryConnections);
  let xPoints = [
    ...math.range(-2.2, mainWindow.lagrangePoints[2][0] * 1.1, 0.005, true)
      ._data,
    ...math.range(
      mainWindow.lagrangePoints[2][0] * 1.1,
      mainWindow.lagrangePoints[2][0] * 0.9,
      0.0025,
      true
    )._data,
    ...math.range(
      mainWindow.lagrangePoints[2][0] * 0.9,
      mainWindow.lagrangePoints[0][0] * 0.9,
      0.005,
      true
    )._data,
    ...math.range(
      mainWindow.lagrangePoints[0][0] * 0.9,
      mainWindow.lagrangePoints[1][0] * 1.11,
      0.0025,
      true
    )._data,
    ...math.range(mainWindow.lagrangePoints[1][0] * 1.11, 2.2, 0.005, true)
      ._data,
  ];
  // console.log(xPoints);
  let startPoints = math.range(0.01, 1.5, 0.125, true)._data;
  xPoints.forEach((x) => {
    let yPoints = startPoints.slice();
    for (let index = 0; index < 20; index++) {
      yPoints = yPoints.map((y, iy) => {
        return (
          y -
          f(x, y, mainWindow.zBoundaryLevel, mu, c) /
            dfdy(x, y, mainWindow.zBoundaryLevel, mu)
        );
      });
    }
    yPoints = yPoints.map((s) => Math.abs(s));
    let maxY = math.max(yPoints);
    let minY = math.min(yPoints);
    // console.log(f(x,maxY,mu,c) , f(x,minY,mu,c) );
    // console.log(x,math.abs(f(x,maxY,mainWindow.zBoundaryLevel,mu,c)), math.abs(f(x,minY,mainWindow.zBoundaryLevel,mu,c)))
    if (
      math.abs(f(x, maxY, mainWindow.zBoundaryLevel, mu, c)) < 1e-10 &&
      math.abs(f(x, minY, mainWindow.zBoundaryLevel, mu, c)) < 1e-10
    ) {
      // Both points are on the zero velocity curve
      outLines.big.push([x, maxY, mainWindow.zBoundaryLevel]);
      if (math.abs(maxY - minY) > 1e-6) {
        // Inner and outer zero-velocity limits
        outLines.small[outLines.smallIndex].push([
          x,
          minY,
          mainWindow.zBoundaryLevel,
        ]);
      } else {
        // console.log('small', outLines.small[outLines.smallIndex].length);
        if (outLines.small[outLines.smallIndex].length > 0) {
          outLines.smallIndex++;
          outLines.small.push([]);
        }
      }
    }
  });
  // Decide how to join lines
  let big = [],
    small = [];
  if (outLines.big.length === 0) {
    mainWindow.displayedLines = [];
    return;
  }
  outLines.small = outLines.small.filter((s) => s.length > 0);
  // console.log(outLines.small.length);
  if (boundaryConnections.l3) {
    big.push([
      ...outLines.big.map((s) => [s[0], -s[1], s[2]]).reverse(),
      ...outLines.big,
    ]);
    small.push([
      ...outLines.small[0].map((s) => [s[0], -s[1], s[2]]).reverse(),
      ...outLines.small[0],
    ]);
    if (boundaryConnections.l2 && !boundaryConnections.l1) {
      console.log(outLines.small);
      if (outLines.small.length > 1) {
        big[0].push(
          ...outLines.small[1].reverse(),
          ...outLines.small[1].reverse().map((s) => [s[0], -s[1], s[2]]),
          big[0][0]
        );
        small[0].push(small[0][0]);
      } else {
        big[0].push(big[0][0]);
      }
    } else if (!boundaryConnections.l2) {
      let connectionPoint = outLines.small[0][outLines.small[0].length - 1];
      big[0].push([connectionPoint[0], connectionPoint[1], connectionPoint[2]]);
      big[0].unshift([
        connectionPoint[0],
        -connectionPoint[1],
        connectionPoint[2],
      ]);
    } else if (boundaryConnections.l1 && boundaryConnections.l2) {
      small[0].push(small[0][0]);
      console.log(outLines.small);
      if (outLines.small.length > 2) {
        for (let index = 1; index < outLines.small.length - 1; index++) {
          small.push([
            ...outLines.small[index].map((s) => [s[0], -s[1], s[2]]).reverse(),
            ...outLines.small[index],
          ]);
          small[small.length - 1].push(small[small.length - 1][0]);
        }
        big[0].push(
          ...outLines.small[outLines.small.length - 1].reverse(),
          ...outLines.small[outLines.small.length - 1]
            .reverse()
            .map((s) => [s[0], -s[1], s[2]]),
          big[0][0]
        );
      } else if (outLines.small.length > 1) {
        small.push([
          ...outLines.small[1].map((s) => [s[0], -s[1], s[2]]).reverse(),
          ...outLines.small[1],
        ]);
        small[small.length - 1].push(small[small.length - 1][0]);
        big[0].push(big[0][0]);
      } else {
        big[0].push(big[0][0]);
      }
    }
  } else {
    if (outLines.small.length > 1) {
      big = [
        [
          ...outLines.big,
          ...outLines.small[1].reverse(),
          ...outLines.small[0].reverse(),
        ],
      ];
    } else {
      big = [[...outLines.big, ...outLines.small[0].reverse()]];
    }
    big[0].push(big[0][0]);
    big.push(big[0].map((s) => [s[0], -s[1], s[2]]));
  }
  mainWindow.displayedLines = [
    ...big.map((s) => {
      return { color: '#aa4444', line: s };
    }),
    ...small.map((s) => {
      return { color: '#aa4444', line: s };
    }),
  ];
}

placeObject(
  '8.0460412304332551e-01   -2.0086159873362003e-27    2.3170224250355804e-33   -1.1551909511823547e-14    3.2296109447800891e-01    1.3354090725058918e-31   3.0946617308708    3.1611928223297814e+00   523.149484122402',
  0
);
// solveJacobiBoundaries(undefined, 3.01214714234023)

function findRotationMatrix(
  v1 = [1, 0, 0],
  v2 = mainWindow.getCurrentSun(mainWindow.scenarioTime + 7200)
) {
  v1 = math.dotDivide(v1, math.norm(v1));
  v2 = math.dotDivide(v2, math.norm(v2));
  let eulerAxis = math.cross(v1, v2);
  if (math.norm(eulerAxis) < 1e-6) {
    // Bandaid for now
    eulerAxis = [1, 0, 0];
  }
  eulerAxis = math.dotDivide(eulerAxis, math.norm(eulerAxis));
  let x = eulerAxis[0],
    y = eulerAxis[1],
    z = eulerAxis[2];
  let eulerAngle = math.acos(math.dot(v1, v2));
  if (eulerAngle < 1e-7) return math.identity([3]);
  let c = math.cos(eulerAngle),
    s = math.sin(eulerAngle);
  return [
    [c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s],
    [y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s],
    [x * z * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)],
  ];
}

function switchPrimary() {
  if (mainWindow.primaryBody === 'Earth') {
    mainWindow.mu = 3.0542e-6;
    let rSun = mainWindow.colors.rTertiary + 0;
    let rEarth = mainWindow.colors.rPrimary + 0;
    let rMoon = mainWindow.colors.rSecondary + 0;
    mainWindow.colors.rPrimary = rSun;
    mainWindow.colors.rSecondary = rEarth;
    mainWindow.colors.rTertiary = rMoon;
    mainWindow.primaryBody = 'Sun';
    mainWindow.secondaryBody = 'Earth';
    mainWindow.tertiaryBody = 'Moon';
    mainWindow.lengthUnit = 149597871;
    mainWindow.timeUnit = 5022635;
    mainWindow.lagrangePoints = [
      [0.98997092, 0, 0],
      [1.01009044, 0, 0],
      [-1.00000127, 0, 0],
      [0.49999695, 0.8660254, 0],
      [0.49999695, -0.8660254, 0],
    ];
    let selectOrbits = [...document.querySelectorAll('.orbit-select')].forEach(
      (sel) => {
        sel.innerHTML = `
            ${Object.keys(
              mainWindow.primaryBody === 'Earth'
                ? earth_moon_orbits
                : sun_earth_orbits
            )
              .map((key, ii) => {
                return `
                    <option value="${key}">${key.toUpperCase()}</label>
                `;
              })
              .join('')}
            `;
      }
    );
    mainWindow.satellites = [];
    let orbitDivs = [...document.querySelectorAll('.orbit-drag-panel')].forEach(
      (pan) => pan.remove()
    );
    mainWindow.colors.primaryBody = 'yellow';
    mainWindow.colors.secondaryBody = '#226622';
    mainWindow.colors.tertiaryBody = '#aaaaaa';
    mainWindow.view.center = [1 - mainWindow.mu, 0, 0];
    mainWindow.view.desired.center = [0, 0, 0];
    mainWindow.view.desired.zoom = 1.5;
    mainWindow.view.zoom = 0.005;
    solveJacobiBoundaries(0, 3.000741329892065);
  } else {
    mainWindow.mu = 1.215058560962404e-2;
    let rSun = mainWindow.colors.rPrimary + 0;
    let rEarth = mainWindow.colors.rSecondary + 0;
    let rMoon = mainWindow.colors.rTertiary + 0;
    mainWindow.colors.rPrimary = rEarth;
    mainWindow.colors.rSecondary = rMoon;
    mainWindow.colors.rTertiary = rSun;
    mainWindow.primaryBody = 'Earth';
    mainWindow.secondaryBody = 'Moon';
    mainWindow.tertiaryBody = 'Sun';
    mainWindow.lengthUnit = 389703;
    mainWindow.timeUnit = 382981;
    mainWindow.lagrangePoints = [
      [0.83691513, 0, 0],
      [1.15568217, 0, 0],
      [-1.00506265, 0, 0],
      [0.48784941, 0.8660254, 0],
      [0.48784941, -0.8660254, 0],
    ];
    let selectOrbits = [...document.querySelectorAll('.orbit-select')].forEach(
      (sel) => {
        sel.innerHTML = `
            ${Object.keys(
              mainWindow.primaryBody === 'Earth'
                ? earth_moon_orbits
                : sun_earth_orbits
            )
              .map((key, ii) => {
                return `
                    <option value="${key}">${key.toUpperCase()}</label>
                `;
              })
              .join('')}
            `;
      }
    );
    mainWindow.colors.primaryBody = '#226622';
    mainWindow.colors.secondaryBody = '#666666';
    mainWindow.colors.tertiaryBody = 'yellow';
    mainWindow.view.center = [-25, 0, 0];
    mainWindow.view.desired.center = [0, 0, 0];
    mainWindow.view.desired.zoom = 1.5;
    mainWindow.view.zoom = 10;
    solveJacobiBoundaries(0, 3.100741329892065);
  }
  removeContextMenu();
}

function qrEigen(
  matrix = [
    [3, -1, 0],
    [-2, 4, -3],
    [0, -1, 1],
  ]
) {
  let a = matrix.map((s) => s.slice());
  let oldEigs;
  let q = qrDecomposition(a);
  a = math.multiply(q.Q, a, math.transpose(q.Q));
  for (let index = 0; index < 10000; index++) {
    let qr = qrDecomposition(a);
    a = math.multiply(qr.R, qr.Q);
    // let eigGuess = math.diag(a)
    // if (oldEigs !== undefined) {
    //     diff = math.subtract(oldEigs, eigGuess).reduce((a,b) => a + b**2,0)
    //     if (diff < 1e-10) {
    //         break
    //     }
    // }

    // oldEigs = eigGuess.slice()
  }
  return math.diag(a);
}

function qrDecomposition(
  matrix = [
    [12, -51, 4],
    [6, 167, -68],
    [-4, 24, -41],
  ]
) {
  let mat = matrix.map((s) => s.slice());
  mat = math.transpose(mat);
  let newMatrix = [];
  for (let index = 0; index < mat.length; index++) {
    if (index === 0) {
      newMatrix.push(mat[index]);
      continue;
    }
    let a = mat[index].slice();
    let subtractVector = math.zeros(a.length)._data;
    for (let ii = 0; ii < index; ii++) {
      subtractVector = math.add(
        subtractVector,
        math.dotMultiply(matrixProjection(a, newMatrix[ii]), newMatrix[ii])
      );
    }
    newMatrix.push(math.subtract(a, subtractVector));
  }
  // newMatrix = math.transpose(newMatrix)
  newMatrix = newMatrix.map((s) => s.map((a) => a / math.norm(s)));
  let Q = math.transpose(newMatrix);
  let R = math.multiply(math.transpose(Q), math.transpose(mat));
  return { Q, R };
}

function matrixProjection(a, b) {
  return math.dot(a, b) / b.reduce((a, b) => a + b ** 2, 0);
}

function calculateEigenvalues(mat) {
  let omegaXX = mat[3][0];
  let omegaXY = mat[3][1];
  let omegaYX = mat[4][0];
  let omegaYY = mat[4][1];
  let a = 1;
  let b = 2 * (2 - (omegaYY + omegaXX) / 2);
  let c = omegaXX * omegaYY - omegaXY * omegaYX;
  let underSqrt = b * b - 4 * a * c;
  let sol1 = (-b + underSqrt ** 0.5) / 2 / a;
  // let sol2 = (-b-underSqrt**0.5)/2/a
  if (sol1 < 0) {
    return false;
  }
  return -(sol1 ** 0.5);
}

function showUncertainty(sat = 0, posStd = 100, velStd = 1) {
  posStd = posStd / mainWindow.lengthUnit;
  velStd = (velStd * mainWindow.timeUnit) / mainWindow.lengthUnit;
  mainWindow.analystSats = [];
  for (let index = 0; index < 50; index++) {
    let position = mainWindow.satellites[sat].state;

    position = [
      position[0] + randn_bm() * posStd,
      position[1] + randn_bm() * posStd,
      position[2] + randn_bm() * posStd,
      position[3] + randn_bm() * velStd,
      position[4] + randn_bm() * velStd,
      position[5] + randn_bm() * velStd,
    ];
    mainWindow.analystSats.push({
      state: position,
      stateHistory: undefined,
      color: 'yellow',
    });
  }
}

function randn_bm() {
  var u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
