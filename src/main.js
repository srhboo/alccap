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
let curves2 = [];
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
  const curveMaterial2 = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
  });
  for (let i = 0; i < curvePoints2.length; i++) {
    const [c1x, c1y, c1z, p1x, p1y, p1z, p2x, p2y, p2z, c2x, c2y, c2z] =
      curvePoints2[i];

    // const curve = new THREE.CubicBezierCurve3(
    //   new THREE.Vector3(p1x, p1y, p1z),
    //   new THREE.Vector3(c1x, c1y, c1z),
    //   new THREE.Vector3(c2x, c2y, c2z),
    //   new THREE.Vector3(p2x, p2y, p2z)
    // );
    // const points = curve.getPoints(50);

    // const curveGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const points = [];
    points.push(new THREE.Vector3(p1x, p1y, p1z));
    points.push(new THREE.Vector3(p2x, p2y, p2z));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const line = new THREE.Line(geometry, curveMaterial2);

    curves2.push(line);
    parent.add(line);
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
  return { topX1, topY1, topX2, topY2: topY1 };
}

function generateDays(offset = { x: 0, y: 0, z: 0 }) {
  const days = [
    {
      bottomX: random(0, 100) + offset.x,
      type: "weekday",
    },
    {
      bottomX: random(351, 450) + offset.x,
      type: "weekday",
    },
    {
      bottomX: random(101, 180) + offset.x,
      type: "weekday",
    },
    {
      bottomX: random(181, 200) + offset.x,
      type: "weekday",
    },
    {
      bottomX: random(201, 250) + offset.x,
      type: "weekday",
    },
    {
      bottomX: random(251, 350) + offset.x,
      type: "weekend",
    },
    {
      bottomX: random(451, 500) + offset.x,
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
    const l = [topX, topY, 0, bottomX, bottomY, 0];
    const lm = (l[4] - l[1]) / (l[3] - l[0]);
    const lb = l[1] - lm * l[0];
    lines.push({ l, plane: "xy" });
    vertLines.push({ m: lm, b: lb, x: topX, z: 0, dy: topY - bottomY });
  }
  return vertLines;
}

function setupVertLines(offset) {
  const days = generateDays(offset);

  const lastRow = points.slice(points.length - 7, points.length);
  const vertLines = [];
  const bottomY = offset.y - random(200, 1000);
  for (let i = 0; i < days.length; i++) {
    const { bottomX } = days[i];
    const topX = lastRow[i].x + offset.x;
    const topY = offset.y;
    const topZ = offset.z;
    const l = [topX, topY, topZ, bottomX, bottomY, topZ];
    const lm = (l[4] - l[1]) / (l[3] - l[0]);
    const lb = l[1] - lm * l[0];
    lines.push({ l, plane: "xy" });
    vertLines.push({ m: lm, b: lb, x: topX, z: topZ, dy: topY - bottomY });
  }
  return vertLines;
}

function setupHoriLines(vertLines, rows, offset) {
  const horiLines = [];

  let currentY = -200;
  let currentZ = 0;

  let deltaY = vertLines[0].dy;

  if (points.length) {
    const lastRow = points.slice(points.length - 7, points.length);
    currentY = offset.y;
    currentZ = offset.z;
  }

  // horizontal lines
  for (let i = 0; i < rows; i++) {
    let increment = 50;
    if (i === rows - 1) {
      increment = deltaY;
    } else if (i === 0) {
      increment = 0;
    } else {
      increment = random(50, 80);
    }

    const lHorY = currentY - increment;
    currentY = lHorY;
    deltaY -= increment;
    const l1 = vertLines[0];
    const l7 = vertLines[vertLines.length - 1];
    const l1Fin = isFinite(l1.m);
    const l7Fin = isFinite(l7.m);
    const lHor = [
      l1Fin ? (lHorY - l1.b) / l1.m : l1.x,
      lHorY,
      currentZ,
      l7Fin ? (lHorY - l7.b) / l7.m : l7.x,
      lHorY,
      currentZ,
    ];
    horiLines.push(lHorY);
    lines.push({ l: lHor, plane: "xy" });
  }
  return horiLines;
}

function setupIntersectionPoints(vertLines, horiLines) {
  for (let j = 0; j < horiLines.length; j++) {
    for (let i = 0; i < vertLines.length; i++) {
      const { m, b, x, z } = vertLines[i];
      const y = horiLines[j];
      const xf = isNaN((y - b) / m) ? x : (y - b) / m;
      points.push({ x: xf, y, z });
    }
  }
}

function setupLines() {
  let weeksLeft = weeks;
  const topVertLines = setupTopVertLines();
  const topRows = random(2, 10);
  const topHoriLines = setupHoriLines(topVertLines, topRows, {
    x: 0,
    y: 0,
    z: 0,
  });
  setupIntersectionPoints(topVertLines, topHoriLines);
  weeksLeft -= topRows;
  while (weeksLeft > 0) {
    const offset = {
      x: random(-1000, 1000),
      y: random(-1000, 1000),
      z: random(-3000, 3000),
    };
    const rows = weeksLeft < 2 ? weeksLeft : random(2, 10);
    const vertLines = setupVertLines(offset);
    const horiLines = setupHoriLines(vertLines, rows, offset);
    setupIntersectionPoints(vertLines, horiLines);
    weeksLeft -= rows;
  }

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
  for (let i = 0; i < tensionPoints.length - 2; i++) {
    const px1 = random(-900, 1000);
    const py1 = random(-900, 1000);
    const pz1 = random(-900, 1000);
    const px2 = random(-900, 1000);
    const py2 = random(-900, 1000);
    const pz2 = random(-900, 1000);

    const p3 = getCoordFromSet(tensionPoints[i]);
    const p4 = getCoordFromSet(tensionPoints[i + 1]);

    curvePoints2.push([
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
    const [x1, y1, z1, x2, y2, z2] = l;
    const points = [];
    points.push(new THREE.Vector3(x1, y1, z1));
    points.push(new THREE.Vector3(x2, y2, z2));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const line = new THREE.Line(geometry, lineMaterial);
    parent.add(line);
  }
}
