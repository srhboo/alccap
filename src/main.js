import * as THREE from "three";

import Stats from "./jsm/libs/stats.module.js";

import { basicData } from "./data/basic";
import { CSVToArray } from "./utils/csv";
import { random } from "./utils/misc";
import { OrbitControls } from "./jsm/controls/OrbitControls";
import { noise } from "./utils/perlin";

let container, stats, controls, clock;
let camera, scene, raycaster, renderer, parentTransform, sphereInter;

//data
let bottomY = -500;
let lines = [];
const points = [];
const curvePoints = [];
const curvePoints2 = [];
let curves = [];
const matchPoints = [];
const matchPoints2 = [];
const tensionPoints = [];
const drinkPoints = [];
const searchTerm = "tired";
const searchTerm2 = "energy";

let theta = 0;
let weeks = 0;
let conDat = [];

const pointer = new THREE.Vector2();

init();
animate();

function init() {
  clock = new THREE.Clock();
  container = document.createElement("div");
  document.body.appendChild(container);

  setupData();
  setupLines();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 3;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  camera.position.set(0, 0, 700);
  controls.update();

  stats = new Stats();
  container.appendChild(stats.dom);

  const geometry = new THREE.SphereGeometry(5);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  sphereInter = new THREE.Mesh(geometry, material);
  sphereInter.visible = false;
  scene.add(sphereInter);
  parentTransform = new THREE.Object3D();

  drawGrid(parentTransform, 0);

  drawCurves(parentTransform);
  relaxCurves();
  scene.add(parentTransform);

  document.addEventListener("pointermove", onPointerMove);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function drawCurves(parent) {
  const curveMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 1,
  });
  for (let i = 0; i < curvePoints.length; i++) {
    const [c1x, c1y, c1z, p1x, p1y, p1z, p2x, p2y, p2z, c2x, c2y, c2z] =
      curvePoints[i];

    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(p1x, p1y, p1z),
      new THREE.Vector3(c1x, c1y, c1z),
      new THREE.Vector3(c2x, c2y, c2z),
      new THREE.Vector3(p2x, p2y, p2z)
    );
    const points = curve.getPoints(50);

    const curveGeometry = new THREE.BufferGeometry().setFromPoints(points);

    const curveObject = new THREE.Line(curveGeometry, curveMaterial);
    curves.push(curveObject);
    parent.add(curveObject);
  }
}

function relaxCurves() {
  const delta = clock.getDelta();
  const time = clock.getElapsedTime() * 10;
  for (let i = 0; i < curves.length; i++) {
    const curve = curves[i];
    const position = curve.geometry.attributes.position;

    const positionBase = curvePoints[i];
    const [c1x, c1y, c1z, p1x, p1y, p1z, p2x, p2y, p2z, c2x, c2y, c2z] =
      positionBase;

    const newC1x =
      c1x +
      Math.sin(time / 20) +
      noise.simplex3(p1x / 200, p1y / 200, time / 200) * 5;
    const newC2y =
      c2y +
      Math.sin(time / 20) +
      noise.simplex3(p2x / 200, p2y / 2000, time / 200) * 5;

    curvePoints[i][0] = newC1x;
    curvePoints[i][10] = newC2y;

    const newCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(p1x, p1y, p1z),
      new THREE.Vector3(newC1x, c1y, c1z),
      new THREE.Vector3(c2x, newC2y, c2z),
      new THREE.Vector3(p2x, p2y, p2z)
    );
    const points = newCurve.getPoints(50);
    for (let i = 0; i < position.count; i++) {
      position.setX(i, points[i].x);
      position.setY(i, points[i].y);
      position.setZ(i, points[i].z);
    }
    position.needsUpdate = true;
    curve.geometry.computeBoundingBox();
  }
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
  relaxCurves();
}

function render() {
  // find intersections

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(parentTransform.children, true);

  if (intersects.length > 0) {
    sphereInter.visible = true;
    sphereInter.position.copy(intersects[0].point);
  } else {
    sphereInter.visible = false;
  }

  renderer.render(scene, camera);
}

function setupData() {
  conDat = CSVToArray(basicData);
  weeks = conDat.length / 7;
  for (let i = 0; i < conDat.length; i++) {
    const entry = conDat[i];
    const searchPhrase = `${entry[2]} ${entry[3]}`;
    const hasMatch = searchPhrase.includes(searchTerm);
    if (hasMatch) {
      matchPoints.push(entry);
    }
    const hasMatch2 = searchPhrase.includes(searchTerm2);
    if (hasMatch2) {
      matchPoints2.push(entry);
    }
    const hasTension = parseInt(entry[5]) === 1;
    if (hasTension) {
      tensionPoints.push(entry);
    }
    const hasDrink = entry[4];
    if (hasDrink) {
      drinkPoints.push(entry);
    }
  }
}

function generateTops() {
  let topX1 = random(-400, 200);
  let topY1 = random(100, 400);
  let topX2 = random(250, 450);
  let topY2 = random(100, 400);
  return { topX1, topY1, topX2, topY2 };
}

function generateDays() {
  const days = [
    {
      bottomX: random(0, 100),
      type: "weekday",
    },
    {
      bottomX: random(351, 450),
      type: "weekday",
    },
    {
      bottomX: random(101, 180),
      type: "weekday",
    },
    {
      bottomX: random(181, 200),
      type: "weekday",
    },
    {
      bottomX: random(201, 250),
      type: "weekday",
    },
    {
      bottomX: random(251, 350),
      type: "weekend",
    },
    {
      bottomX: random(451, 500),
      type: "weekend",
    },
  ];
  return days;
}

function setupTopVertLines() {
  const days = generateDays();
  const vertLines = [];
  const { topX1, topY1, topX2, topY2 } = generateTops();

  for (let i = 0; i < days.length; i++) {
    const { bottomX, type } = days[i];
    const topX = type === "weekday" ? topX1 : topX2;
    const topY = type === "weekday" ? topY1 : topY2;
    const l = [topX, topY, bottomX, bottomY];
    const lm = (l[3] - l[1]) / (l[2] - l[0]);
    const lb = l[1] - lm * l[0];
    lines.push({ l, plane: "xy" });
    vertLines.push({ m: lm, b: lb, x: topX });
  }
  return vertLines;
}

function setupVertLines() {
  const days = generateDays();

  const lastRow = points.slice(points.length - 7, points.length);
  const vertLines = [];
  const bottomY = lastRow[0].y - 1000;
  for (let i = 0; i < days.length; i++) {
    const { bottomX } = days[i];
    const topX = lastRow[i].x;
    const topY = lastRow[i].y;
    const z = lastRow[i].z;
    const l = [topX, topY, bottomX, bottomY];
    const lm = (l[3] - l[1]) / (l[2] - l[0]);
    const lb = l[1] - lm * l[0];
    lines.push({ l, plane: "xy" });
    vertLines.push({ m: lm, b: lb, x: topX, z });
  }
  return vertLines;
}

function setupHoriLines(vertLines, rows) {
  const horiLines = [];

  let currentY = -200;

  if (points.length) {
    const lastRow = points.slice(points.length - 7, points.length);
    currentY = lastRow[0].y;
  }

  // horizontal lines
  for (let i = 0; i < rows; i++) {
    const lHorY = currentY - i * 50;
    const l1 = vertLines[0];
    const l7 = vertLines[vertLines.length - 1];
    const l1Fin = isFinite(l1.m);
    const l7Fin = isFinite(l7.m);
    const lHor = [
      l1Fin ? (lHorY - l1.b) / l1.m : l1.x,
      lHorY,
      l7Fin ? (lHorY - l7.b) / l7.m : l7.x,
      lHorY,
    ];
    horiLines.push(lHorY);
    lines.push({ l: lHor, plane: "xy" });
  }
  return horiLines;
}

function setupIntersectionPoints(vertLines, horiLines) {
  for (let j = 0; j < horiLines.length; j++) {
    for (let i = 0; i < vertLines.length; i++) {
      const { m, b } = vertLines[i];
      const y = horiLines[j];
      const x = (y - b) / m;
      points.push({ x, y, z: 0 });
    }
  }
}

function setupLines() {
  // set 1

  let weeksLeft = weeks;
  const topVertLines = setupTopVertLines();
  const topRows = random(2, 10);
  const topHoriLines = setupHoriLines(topVertLines, topRows);
  setupIntersectionPoints(topVertLines, topHoriLines);
  weeksLeft -= topRows;
  while (weeksLeft > 0) {
    const offset = {
      x: random(500, 2000),
      y: random(500, 2000),
      z: random(500, 2000),
    };
    const rows = weeksLeft < 2 ? weeksLeft : random(2, weeksLeft);
    const vertLines = setupVertLines();
    const horiLines = setupHoriLines(vertLines, rows);
    setupIntersectionPoints(vertLines, horiLines);
    weeksLeft -= rows;
  }

  // end set 1

  // // set 2
  // const vertLines2 = [];
  // const bottomY2 = -2000;
  // const lastRow = points.slice(points.length - 7, points.length);
  // for (let i = 0; i < days.length; i++) {
  //   const { bottomX, type } = days[i];
  //   const topX = lastRow[i].x;
  //   const topY = lastRow[i].y;
  //   const z = lastRow[i].z;
  //   const l = [topX, topY, bottomX, bottomY2];
  //   const lm = (l[3] - l[1]) / (l[2] - l[0]);
  //   const lb = l[1] - lm * l[0];
  //   lines.push({ l, plane: "xy" });
  //   vertLines2.push({ m: lm, b: lb, x: topX, z });
  // }

  // const horiLines2 = [];
  // const phase2 = 25;
  // // // horizontal lines
  // for (let i = 0; i < phase2; i++) {
  //   const lHorY = -200 - i * 50;
  //   const l1 = vertLines2[0];
  //   const l7 = vertLines2[vertLines2.length - 1];
  // const l1Fin = isFinite(l1.m);
  // const l7Fin = isFinite(l7.m);
  //   const lHor = [
  // l1Fin ? (lHorY - l1.b) / l1.m : l1.x,
  // lHorY,
  // l7Fin ? (lHorY - l7.b) / l7.m : l7.x,
  // lHorY,
  //   ];
  //   horiLines2.push(lHorY);
  //   lines.push({ l: lHor, plane: "xy" });
  // }
  // for (let j = 0; j < horiLines2.length; j++) {
  //   for (let i = 0; i < vertLines2.length; i++) {
  //     const { m, b, x } = vertLines2[i];
  //     const y = horiLines2[j];
  //     const xf = isNaN((y - b) / m) ? x : (y - b) / m;
  //     points.push({ x: xf, y, z: 0 });
  //   }
  // }

  // POINTS START
  for (let i = 0; i < matchPoints.length - 1; i++) {
    const px1 = random(-900, 1000);
    const py1 = random(-900, 1000);
    const pz1 = random(-900, 1000);
    const px2 = random(-900, 1000);
    const py2 = random(-900, 1000);
    const pz2 = random(-900, 1000);

    const p3 = getCoordFromSet(matchPoints[i]);
    const p4 = getCoordFromSet(matchPoints[i + 1]);

    curvePoints.push([
      px1,
      py1,
      pz1,
      p3.x,
      p3.y,
      p3.z,
      p4.x,
      p4.y,
      p4.z,
      px2,
      py2,
      pz2,
    ]);
  }

  for (let i = 0; i < matchPoints2.length - 1; i++) {
    const px1 = random(-900, 1000);
    const py1 = random(-900, 1000);
    const pz1 = random(-900, 1000);
    const px2 = random(-900, 1000);
    const py2 = random(-900, 1000);
    const pz2 = random(-900, 1000);

    const p3 = getCoordFromSet(matchPoints2[i]);
    const p4 = getCoordFromSet(matchPoints2[i + 1]);

    curvePoints.push([
      px1,
      py1,
      pz1,
      p3.x,
      p3.y,
      p3.z,
      p4.x,
      p4.y,
      p4.z,
      px2,
      py2,
      pz2,
    ]);
  }
  // for (let i = 0; i < tensionPoints.length - 2; i++) {
  //   const px1 = random(-900, 1000);
  //   const py1 = random(-900, 1000);
  //   const pz1 = random(-900, 1000);
  //   const px2 = random(-900, 1000);
  //   const py2 = random(-900, 1000);
  //   const pz2 = random(-900, 1000);

  //   const p3 = getCoordFromSet(tensionPoints[i]);
  //   const p4 = getCoordFromSet(tensionPoints[i + 1]);

  //   curvePoints2.push([
  //     px1,
  //     py1,
  //     pz1,
  //     p3.x,
  //     p3.y,
  //     p3.z,
  //     p4.x,
  //     p4.y,
  //     p4.z,
  //     px2,
  //     py2,
  //     pz2,
  //   ]);
  // }
}

function getCoordFromSet(set) {
  const week = parseInt(set[0]);
  const dayOfWeek = parseInt(set[1]);
  return points[(week - 1) * 7 + dayOfWeek - 1];
}

function drawGrid(parent) {
  let z = 0;
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  for (let i = 0; i < lines.length; i++) {
    const { l, plane } = lines[i];
    const [x1, y1, x2, y2] = l;
    const points = [];
    if (plane == "xy") {
      points.push(new THREE.Vector3(x1, y1, z));
      points.push(new THREE.Vector3(x2, y2, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const line = new THREE.Line(geometry, lineMaterial);
    parent.add(line);
  }
}
