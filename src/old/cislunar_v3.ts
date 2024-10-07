import {
  add,
  cross,
  dotMultiply,
  max,
  min,
  multiply,
  norm,
  range,
  sign,
  subtract,
  zeros,
} from 'mathjs';
import { moonEciFromTime, sunEciFromTime } from './astro_vz_new';

const mainWindow = {
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

function crtbpAcceleration(state = [1, 1, 1, 0, 0, 0]) {
  let mu = mainWindow.mu;
  let x = state[0],
    y = state[1],
    z = state[2],
    dx = state[3],
    dy = state[4]
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

function multiplyPolynomial(a = [1, 3, 1], b = [0, 2, 1]) {
  let aL = a.length,
    bL = b.length;
  let minLength = aL < bL ? bL : aL;
  while (a.length < minLength) a.unshift(0);
  while (b.length < minLength) b.unshift(0);
  let answerLength = (minLength - 1) * 2 + 1;
  let answer = zeros([answerLength]) as number[];
  for (let index = 0; index < minLength; index++) {
    let subAnswer = zeros([answerLength]) as number[];
    let indexAnswer = dotMultiply(a[index], b);
    subAnswer.splice(index, minLength, ...indexAnswer);
    answer = add(answer, subAnswer) as number[];
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
  let combined = subtract(poly1, poly2);
  let derCombined = derivateOfPolynomial(combined);
  let change = 1000,
    iter = 0;
  while (Math.abs(change) > 1e-6) {
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

function lagrangePolyCalc(x = [0, 1, 3], y = [1, -2, 4]) {
  if (x.length === 1) {
    return y;
  }
  let answerLength = x.length;
  let answer = zeros([answerLength]);
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
    answer = add(answer, dotMultiply(y[ii] / subAnswerDen, subAnswer));
    // console.log(ii);
  }
  return answer;
}

export function solveJacobiBoundaries(state: number[], mu: number, z: number) {
  /**
   *
   * @param state
   * @param y
   * @param z
   * @param mu
   * @returns
   */
  const dfdy = (x: number, y: number, z: number, mu: number) => {
    return (
      (-2 * (1 - mu) * y) / (z * z + y * y + (x + mu) ** 2) ** 1.5 -
      (2 * mu * y) / (z * z + y * y + (x + mu - 1) ** 2) ** 1.5 +
      2 * y
    );
  };
  const f = (x: number, y: number, z: number, mu: number, c: number) => {
    return (
      -c +
      x * x +
      y * y +
      (2 * (1 - mu)) / (z * z + y * y + (x + mu) ** 2) ** 0.5 +
      (2 * mu) / (z * z + y * y + (x + mu - 1) ** 2) ** 0.5
    );
  };
  let outLines: {
    big: number[][];
    small: number[][][];
    smallIndex: number;
  } = {
    big: [],
    small: [[]],
    smallIndex: 0,
  };
  let r1 = ((state[0] + mu) ** 2 + state[1] ** 2 + state[2] ** 2) ** 0.5;
  let r2 = ((state[0] + mu - 1) ** 2 + state[1] ** 2 + state[2] ** 2) ** 0.5;
  const c =
    -state.slice(3).reduce((a, b) => a + b ** 2, 0) +
    state[0] ** 2 +
    state[1] ** 2 +
    (2 * (1 - mu)) / r1 +
    (2 * mu) / r2;

  // Calculate if boundaries connect at each point
  let boundaryConnections = {
    l1: f(mainWindow.lagrangePoints[0][0], 0, z, mu, c) < 0,
    l2: f(mainWindow.lagrangePoints[1][0], 0, z, mu, c) < 0,
    l3: f(mainWindow.lagrangePoints[2][0], 0, z, mu, c) < 0,
    moon: f(1 - mu, 0, z, mu, c) < 0,
  };

  let xPoints = [
    ...(
    range(-2.2, mainWindow.lagrangePoints[2][0] * 1.1, 0.005, true)
    //@ts-expect-error
      ._data as number[]),
    ...(range(
      mainWindow.lagrangePoints[2][0] * 1.1,
      mainWindow.lagrangePoints[2][0] * 0.9,
      0.0025,
      true
      //@ts-expect-error
    )._data as number[]),
    ...(range(
      mainWindow.lagrangePoints[2][0] * 0.9,
      mainWindow.lagrangePoints[0][0] * 0.9,
      0.005,
      true
      //@ts-expect-error
    )._data as number[]),
    ...(range(
      mainWindow.lagrangePoints[0][0] * 0.9,
      mainWindow.lagrangePoints[1][0] * 1.11,
      0.0025,
      true
      //@ts-expect-error
    )._data as number[]),
    ...(
    range(mainWindow.lagrangePoints[1][0] * 1.11, 2.2, 0.005, true)
    //@ts-expect-error
      ._data as number[]),
  ];
  //@ts-expect-error
  let startPoints = range(0.01, 1.5, 0.125, true)._data as number[];
  xPoints.forEach((x) => {
    let yPoints = startPoints.slice();
    for (let index = 0; index < 20; index++) {
      yPoints = yPoints.map((y) => {
        return y - f(x, y, z, mu, c) / dfdy(x, y, z, mu);
      });
    }
    yPoints = yPoints.map((s) => Math.abs(s));
    let maxY = max(yPoints);
    let minY = min(yPoints);

    if (
      Math.abs(f(x, maxY, z, mu, c)) < 1e-10 &&
      Math.abs(f(x, minY, z, mu, c)) < 1e-10
    ) {
      // Both points are on the zero velocity curve
      outLines.big.push([x, maxY, z]);
      if (Math.abs(maxY - minY) > 1e-6) {
        // Inner and outer zero-velocity limits
        outLines.small[outLines.smallIndex].push([x, minY, z]);
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
    return [];
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

  return [
    ...big.map((s) => {
      return { color: '#aa4444', line: s };
    }),
    ...small.map((s) => {
      return { color: '#aa4444', line: s };
    }),
  ];
}

function rkf45(
  state = [mainWindow.lagrangePoints[0][0], 0, 0, 0, 0, 0],
  h = 0.01,
  epsilon = 1e-3
) {
  let k1 = dotMultiply(h, crtbpAcceleration(state));
  let k2 = dotMultiply(
    h,
    crtbpAcceleration(add(state, dotMultiply(2 / 9, k1)))
  );
  let k3 = dotMultiply(
    h,
    crtbpAcceleration(
      add(state, dotMultiply(1 / 12, k1), dotMultiply(1 / 4, k2))
    )
  );
  let k4 = dotMultiply(
    h,
    crtbpAcceleration(
      add(
        state,
        dotMultiply(69 / 128, k1),
        dotMultiply(-243 / 128, k2),
        dotMultiply(135 / 64, k3)
      )
    )
  );
  let k5 = dotMultiply(
    h,
    crtbpAcceleration(
      add(
        state,
        dotMultiply(-17 / 12, k1),
        dotMultiply(27 / 4, k2),
        dotMultiply(-27 / 5, k3),
        dotMultiply(16 / 15, k4)
      )
    )
  );
  let k6 = dotMultiply(
    h,
    crtbpAcceleration(
      add(
        state,
        dotMultiply(65 / 432, k1),
        dotMultiply(-5 / 16, k2),
        dotMultiply(13 / 16, k3),
        dotMultiply(4 / 27, k4),
        dotMultiply(5 / 144, k5)
      )
    )
  );
  let y = add(
    state,
    dotMultiply(47 / 450, k1),
    dotMultiply(12 / 25, k3),
    dotMultiply(32 / 225, k4),
    dotMultiply(1 / 30, k5),
    dotMultiply(6 / 25, k6)
  );

  let te = norm(
    add(
      dotMultiply(-1 / 150, k1),
      dotMultiply(3 / 100, k3),
      dotMultiply(-16 / 75, k4),
      dotMultiply(-1 / 20, k5),
      dotMultiply(6 / 25, k6)
    )
  ) as number;
  let hnew = 0.9 * h * (epsilon / te) ** 0.2;
  if (te > epsilon) {
    y = state;
    h = 0;
  }
  return { y, hnew, dt: h, te };
}

export function calculateStateHistory(
  state: number[],
  length_dimless: number,
  error = 1e-4,
  dt = 1000
) {
  let t = 0;
  const history = [];
  dt = sign(length_dimless) * dt;

  while (Math.abs(t) <= Math.abs(length_dimless)) {
    history.push({
      t,
      state: state.slice(),
    });
    let proppedState = rkf45(state, dt, error);
    dt = proppedState.hnew;
    state = proppedState.y;

    t += proppedState.dt;
  }
  let proppedState = rkf45(state, length_dimless - t, error);

  history.push({
    t: length_dimless,
    state: proppedState.y,
  });
  return history;
}

export function eci2synodicUnitlessRotation(time_ms: number) {
  
  let moonEci = moonEciFromTime(new Date(time_ms));
  let moonEciDel = moonEciFromTime(new Date(time_ms + 1));
  let moonVel = subtract(moonEciDel, moonEci).map((s) => s / 0.001);
  let moonX = moonEci.map((val) => val / (norm(moonEci) as number));
  let moonZ = cross(moonEci, moonVel) as number[];
  moonZ = moonZ.map((s) => s / (norm(moonZ) as number));
  let moonY = cross(moonZ, moonX);
  let r = [moonX, moonY, moonZ] as number[][];
  return r;
}

function eci2synodicUnitless(state: number[], time_ms: number) {
  // console.log(date);
  let moonEci = moonEciFromTime(new Date(time_ms));
  let moonEciDel = moonEciFromTime(new Date(time_ms + 1000));
  let moonVel = subtract(moonEciDel, moonEci)
  let moonX = moonEci.map((val) => val / (norm(moonEci) as number));
  let moonZ = cross(moonEci, moonVel) as number[];
  moonZ = moonZ.map((s) => s / (norm(moonZ) as number));
  let moonY = cross(moonZ, moonX);
  let r = [moonX, moonY, moonZ] as number[][];
  
  state = [...multiply(r, state.slice(0, 3)), ...multiply(r, state.slice(3))];
  let position = state.slice(0, 3).map((s) => s / mainWindow.lengthUnit);
  let velocity = state
    .slice(3)
    .map((s) => (s * mainWindow.timeUnit) / mainWindow.lengthUnit);
  position = add(position, [-mainWindow.mu, 0, 0]);
  velocity = subtract(velocity, cross([0, 0, 1], position)) as number[];
  return [...position, ...velocity];
}

export function calculateTertiaryObjectLocation(
  time_ms: number,
  primaryBody = 'Earth'
) {
  // if (primaryBody === 'Earth') {
  if (true) {
    let sunPos = sunEciFromTime(new Date(time_ms));
    sunPos = eci2synodicUnitless([...sunPos, 0, 0, 0], time_ms).slice(0, 3);
    return sunPos;
  } else {
    //   let moonPos = moonEciFromTime(
    //     new Date(time_ms)
    //   );
    //   moonPos = eci2solarUnitless(
    //     [...moonPos, 0, 0, 0],
    //     new Date(mainWindow.startTime - -1000 * mainWindow.scenarioTime)
    //   ).slice(0, 3);
    //   return moonPos;
  }
}

export function getCurrentState(
  history: { t: number; state: number[] }[],
  time: number
) {
  let states = history.filter((s) => s.t <= time);
  const closestState = states[states.length - 1];

  return rkf45(closestState.state, time - closestState.t, 100).y;
}
