import { dotDivide, dotMultiply, multiply, norm, trace, transpose } from 'mathjs';

function julianDate(yr = 1996, mo = 10, d = 26, h = 14, min = 20, s = 0) {
  return (
    367 * yr -
    Math.floor((7 * (yr + Math.floor((mo + 9) / 12))) / 4) +
    Math.floor((275 * mo) / 9) +
    d +
    1721013.5 +
    ((s / 60 + min) / 60 + h) / 24
  );
}

export function sunEciFromTime(date = new Date()) {
  let jdUti = julianDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds() + date.getUTCMilliseconds()
  );
  let tUti = (jdUti - 2451545) / 36525;
  let lamba = 280.4606184 + 36000.770005361 * tUti;
  let m = 357.5277233 + 35999.05034 * tUti;
  let lambaEll =
    lamba +
    1.914666471 * Math.sin((m * Math.PI) / 180) +
    0.019994643 * Math.sin((2 * m * Math.PI) / 180);
  let epsilon = 23.439291 - 0.0130042 * tUti;
  let rSun =
    1.000140612 -
    0.016708617 * Math.cos((m * Math.PI) / 180) -
    0.000139589 * Math.cos((2 * m * Math.PI) / 180);
  let au = 149597870.7; //km
  rSun *= au;
  return [
    rSun * Math.cos((lambaEll * Math.PI) / 180),
    rSun *
      Math.cos((epsilon * Math.PI) / 180) *
      Math.sin((lambaEll * Math.PI) / 180),
    rSun *
      Math.sin((epsilon * Math.PI) / 180) *
      Math.sin((lambaEll * Math.PI) / 180),
  ];
}

export function moonEciFromTime(startDate = new Date()) {
  let sind = (ang: number) => Math.sin((ang * Math.PI) / 180);
  let cosd = (ang: number) => Math.cos((ang * Math.PI) / 180);
  let jd = julianDate(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth() + 1,
    startDate.getUTCDate(),
    startDate.getUTCHours(),
    startDate.getUTCMinutes(),
    startDate.getUTCSeconds() + startDate.getUTCMilliseconds()
  );
  let tdb = (jd - 2451545) / 36525;
  // console.log(tdb);
  let lambda_ell =
    218.32 +
    481267.8813 * tdb +
    6.29 * sind(134.9 + 477198.85 * tdb) -
    1.27 * sind(259.2 - 413335.38 * tdb) +
    0.66 * sind(235.7 + 890534.23 * tdb) +
    0.21 * sind(269.9 + 954397.7 * tdb) -
    0.19 * sind(357.5 + 35999.05 * tdb) -
    0.11 * sind(186.6 + 966404.05 * tdb);
  lambda_ell = lambda_ell % 360;
  lambda_ell = lambda_ell < 0 ? lambda_ell + 360 : lambda_ell;

  let phi_ell =
    5.13 * sind(93.3 + 483202.03 * tdb) +
    0.28 * sind(228.2 + 960400.87 * tdb) -
    0.28 * sind(318.3 + 6003.18 * tdb) -
    0.17 * sind(217.6 - 407332.2 * tdb);
  phi_ell = phi_ell % 360;
  phi_ell = phi_ell < 0 ? phi_ell + 360 : phi_ell;

  let para =
    0.9508 +
    0.0518 * cosd(134.9 + 477_198.85 * tdb) +
    0.0095 * cosd(259.2 - 413_335.38 * tdb) +
    0.0078 * cosd(235.7 + 890_534.23 * tdb) +
    0.0028 * cosd(269.9 + 954_397.7 * tdb);
  para = para % 360;
  para = para < 0 ? para + 360 : para;

  let epsilon =
    23.439291 -
    0.0130042 * tdb -
    1.64e-7 * tdb * tdb +
    5.04e-7 * tdb * tdb * tdb;

  let rC = (1 / sind(para)) * 6378.1363;

  return dotMultiply(rC, [
    cosd(phi_ell) * cosd(lambda_ell),
    cosd(epsilon) * cosd(phi_ell) * sind(lambda_ell) -
      sind(epsilon) * sind(phi_ell),
    sind(epsilon) * cosd(phi_ell) * sind(lambda_ell) +
      cosd(epsilon) * sind(phi_ell),
  ]);
}

export function earthEciRotation(date: Date) {
  // Based on Vallado "Fundamentals of Astrodyanmics and Applications" algorithm 24, p. 228 4th edition
  // ECI to ECEF
  let jd_TT = julianDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds() + date.getUTCMilliseconds() / 1000
  );
  let t_TT = (jd_TT - 2451545) / 36525;
  let zeta = 2306.2181 * t_TT + 0.30188 * t_TT ** 2 + 0.017998 * t_TT ** 3;
  zeta /= 3600;
  let theta = 2004.3109 * t_TT - 0.42665 * t_TT ** 2 - 0.041833 * t_TT ** 3;
  theta /= 3600;
  let z = 2306.2181 * t_TT + 1.09468 * t_TT ** 2 + 0.018203 * t_TT ** 3;
  z /= 3600;
  let p = multiply(rot(zeta, 3), rot(-theta, 2), rot(z, 3));

  let thetaGmst = siderealTime(jd_TT);
  let w = rot(-thetaGmst, 3);
  return multiply(transpose(w), transpose(p));
}

function rot(angle = 45, axis = 1, useDegree = true) {
  angle = useDegree ? angle * 0.017453292519943295 : angle;
  let rotMat;
  let sAng = Math.sin(angle),
    cAng = Math.cos(angle);
  if (axis === 1) {
    rotMat = [
      [1, 0, 0],
      [0, cAng, sAng],
      [0, -sAng, cAng],
    ];
  } else if (axis === 2) {
    rotMat = [
      [cAng, 0, -sAng],
      [0, 1, 0],
      [sAng, 0, cAng],
    ];
  } else {
    rotMat = [
      [cAng, sAng, 0],
      [-sAng, cAng, 0],
      [0, 0, 1],
    ];
  }
  return rotMat;
}

function siderealTime(jdUti = 2448855.009722) {
  let tUti = (jdUti - 2451545.0) / 36525;
  return (
    ((67310.54841 +
      (876600 * 3600 + 8640184.812866) * tUti +
      0.093104 * tUti * tUti -
      6.2e-6 * tUti * tUti * tUti) %
      86400) /
    240
  );
}

export function rotationMatrixToQuaternion(rot: number[][]) {
  const traceRot = trace(rot)

  let quatMatrix = [
    rot[2][0] + rot[0][2],
    rot[2][1] + rot[1][2],
    1 + 2 * rot[2][2] - traceRot,
    rot[0][1] - rot[1][0]
  ]

  quatMatrix = dotDivide(quatMatrix, norm(quatMatrix))

  return quatMatrix
}