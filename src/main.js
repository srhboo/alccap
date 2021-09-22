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

let lines = [],
  curves = [],
  catCurves = [],
  straightLines = [];
const lineObjects = [],
  points = [],
  curvePoints = [],
  straightLinePoints = [],
  chaosPoints = [],
  chaosPointLabels = [];

const matchPoints = [],
  matchPoints2 = [],
  tensionPoints = [],
  drinkPoints = [],
  spendPoints = [];

const lineOffset = [],
  segmentRows = [],
  accSegmentRows = [],
  segmentObjects = [],
  segmentPositions = [],
  segmentOffsets = [],
  accSegmentPositions = [0],
  totalLineCount = [],
  segmentPoints = [];

const searchTerm = "productive";
const searchTerm2 = "sad";

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
    0.001,
    100000
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
  camera.position.set(0, 300, 3000);
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
  moveSegments();

  drawCurves(parentTransform);
  // relaxCurves();
  scene.add(parentTransform);

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("click", onPointerClick);
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

function onPointerClick(event) {
  const intersects = raycaster.intersectObjects(parentTransform.children, true);
  if (intersects.length) {
    const currEl = intersects[0].object;
    if (currEl.callback) {
      currEl.callback();
    }
  }
}

function drawCurves(parent) {
  const curveMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 1,
  });
  for (let i = 0; i < curvePoints.length; i++) {
    const [c1x, c1y, c1z, p1, , , p2, , , c2x, c2y, c2z] = curvePoints[i];

    // points are given as index of global points array
    const p1x = points[p1].x;

    const p1y = points[p1].y;
    const p1z = points[p1].z;
    const p2x = points[p2].x;
    const p2y = points[p2].y;
    const p2z = points[p2].z;

    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(p1x, p1y, p1z),
      new THREE.Vector3(c1x, c1y, c1z),
      new THREE.Vector3(c2x, c2y, c2z),
      new THREE.Vector3(p2x, p2y, p2z)
    );
    const newPoints = curve.getPoints(50);

    const curveGeometry = new THREE.BufferGeometry().setFromPoints(newPoints);

    const curveObject = new THREE.Line(curveGeometry, curveMaterial);
    curves.push(curveObject);
    parent.add(curveObject);
  }
  const curveMaterial2 = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
  });
  for (let i = 0; i < straightLinePoints.length; i++) {
    const [p1, p2] = straightLinePoints[i];

    // points are given as index of global points array
    const p1x = points[p1].x;
    const p1y = points[p1].y;
    const p1z = points[p1].z;
    const p2x = points[p2].x;
    const p2y = points[p2].y;
    const p2z = points[p2].z;

    const newPoints = [];
    newPoints.push(new THREE.Vector3(p1x, p1y, p1z));
    newPoints.push(new THREE.Vector3(p2x, p2y, p2z));

    const geometry = new THREE.BufferGeometry().setFromPoints(newPoints);

    const line = new THREE.Line(geometry, curveMaterial2);
    line.callback = () => {
      console.log("hello");
    };

    straightLines.push(line);
    parent.add(line);
  }
}

function relaxCurves() {
  const time = clock.getElapsedTime() * 10;
  for (let i = 0; i < curves.length; i++) {
    const curve = curves[i];
    const position = curve.geometry.attributes.position;

    const positionBase = curvePoints[i];
    const [c1x, c1y, c1z, p1, , , p2, , , c2x, c2y, c2z] = positionBase;
    // points are given as index of global points array
    const p1x = points[p1].x;
    const p1y = points[p1].y;
    const p1z = points[p1].z;
    const p2x = points[p2].x;
    const p2y = points[p2].y;
    const p2z = points[p2].z;

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
    const newPoints = newCurve.getPoints(50);
    for (let i = 0; i < position.count; i++) {
      position.setX(i, newPoints[i].x);
      position.setY(i, newPoints[i].y);
      position.setZ(i, newPoints[i].z);
    }
    position.needsUpdate = true;
    curve.geometry.computeBoundingBox();
  }
  for (let i = 0; i < straightLines.length; i++) {
    const line = straightLines[i];
    const position = line.geometry.attributes.position;

    const positionBase = straightLinePoints[i];
    const [p1, p2] = positionBase;
    // points are given as index of global points array
    position.array[0] = points[p1].x;
    position.array[1] = points[p1].y;
    position.array[2] = points[p1].z;
    position.array[3] = points[p2].x;
    position.array[4] = points[p2].y;
    position.array[5] = points[p2].z;

    position.needsUpdate = true;
    line.geometry.computeBoundingBox();
  }
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();

  untether();

  relaxCurves();
}

function render() {
  // find intersections

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(parentTransform.children, true);

  // if (intersects.length > 0) {
  //   sphereInter.visible = true;
  //   sphereInter.position.copy(intersects[0].point);
  // } else {
  //   sphereInter.visible = false;
  // }
  if (intersects.length > 0) {
    document.body.style.cursor = "pointer";
  } else {
    document.body.style.cursor = "default";
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
    const spend = entry[6];
    if (parseInt(spend) > 0) {
      spendPoints.push(entry);
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

function setupTopVertLines(offset) {
  let bottomY = -800;
  const days = generateDays();
  const vertLines = [];
  const { topX1, topX2 } = generateTops();
  const topY1 = 0,
    topY2 = 0;

  for (let i = 0; i < days.length; i++) {
    const { bottomX, type } = days[i];
    const topX = type === "weekday" ? topX1 : topX2;
    const topY = type === "weekday" ? topY1 : topY2;
    const l = [topX, topY, 0, bottomX, bottomY, 0];
    const lm = (l[4] - l[1]) / (l[3] - l[0]);
    const lb = l[1] - lm * l[0];
    lines.push({ l, plane: "xy" });
    lineOffset.push(offset);
    vertLines.push({ m: lm, b: lb, x: topX, z: 0, dy: topY - bottomY });
  }
  return vertLines;
}

function setupVertLines(offset) {
  const days = generateDays(offset);

  const lastRow = points.slice(points.length - 7, points.length);

  segmentPositions.push(lastRow[0].y);
  const prevAcc = accSegmentPositions.slice(-1)[0];
  accSegmentPositions.push(prevAcc + lastRow[0].y);

  const vertLines = [];
  // ending position
  // const bottomY = offset.y - random(200, 1000);
  const bottomY = 0 - random(200, 1000);
  for (let i = 0; i < days.length; i++) {
    // ending position
    // const { bottomX } = days[i];
    const topX = lastRow[i].x + offset.x;
    // const topY = offset.y;
    // const topZ = offset.z;
    // const topX = 0;
    const topY = 0;
    const topZ = 0;

    const bottomX = topX + 10;

    const l = [topX, topY, topZ, bottomX, bottomY, topZ];
    const lm = (l[4] - l[1]) / (l[3] - l[0]);
    const lb = l[1] - lm * l[0];
    lines.push({ l, plane: "xy" });
    lineOffset.push(offset);
    vertLines.push({ m: lm, b: lb, x: topX, z: topZ, dy: topY - bottomY });
  }
  return vertLines;
}

function setupHoriLines(vertLines, rows, offset) {
  const horiLines = [];

  let currentY = -300;
  let currentZ = 0;

  let deltaY = vertLines[0].dy;

  if (points.length) {
    const lastRow = points.slice(points.length - 7, points.length);
    currentY = 0;
    currentZ = 0;
    // ending position
    // currentY = offset.y;
    // currentZ = offset.z;
  } else {
    currentY = -300;
    deltaY += currentY;
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
    lineOffset.push(offset);
  }
  segmentRows.push(horiLines.length);
  const tempBase = accSegmentRows.length ? accSegmentRows.slice(-1)[0] : 0;
  accSegmentRows.push(tempBase + horiLines.length);
  updateTotalLineCount(horiLines.length);
  return horiLines;
}

function updateTotalLineCount(newRows) {
  if (totalLineCount.length === 0) {
    totalLineCount.push(0);
    totalLineCount.push(7 + newRows);
  } else {
    const prevTotal = totalLineCount[totalLineCount.length - 1];
    totalLineCount.push(prevTotal + 7 + newRows);
  }
}

function setupIntersectionPoints(vertLines, horiLines, segIndex) {
  // segmentPointsStart.push(points.length);
  for (let j = 0; j < horiLines.length; j++) {
    for (let i = 0; i < vertLines.length; i++) {
      const { m, b, x, z } = vertLines[i];
      const y = horiLines[j];
      const xf = isNaN((y - b) / m) ? x : (y - b) / m;
      const pt = { x: xf, y, z };
      points.push(pt);
      if (!segmentPoints[segIndex]) {
        segmentPoints[segIndex] = [];
      }
      segmentPoints[segIndex].push(pt);
    }
  }
}

function setupLines() {
  let weeksLeft = weeks;
  const topOffset = {
    x: 0,
    y: 0,
    z: 0,
  };
  const topVertLines = setupTopVertLines(topOffset);
  const topRows = random(2, 10);
  const topHoriLines = setupHoriLines(topVertLines, topRows, topOffset);
  setupIntersectionPoints(topVertLines, topHoriLines, segmentPositions.length);
  weeksLeft -= topRows;
  while (weeksLeft > 0) {
    // const offset = {
    //   x: random(-1000, 1000),
    //   y: random(-1000, 1000),
    //   z: random(-3000, 3000),
    // };
    const offset = { x: 0, y: 0, z: 0 };
    const rows = weeksLeft < 2 ? weeksLeft : random(2, 10);
    const vertLines = setupVertLines(offset);
    const horiLines = setupHoriLines(vertLines, rows, offset);
    setupIntersectionPoints(vertLines, horiLines, segmentPositions.length);
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

    curvePoints.push([px1, py1, pz1, p3, p3, p3, p4, p4, p4, px2, py2, pz2]);
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
    // middle two points are indexes
    curvePoints.push([px1, py1, pz1, p3, p3, p3, p4, p4, p4, px2, py2, pz2]);
  }
  for (let i = 0; i < tensionPoints.length - 2; i++) {
    const p1 = getCoordFromSet(tensionPoints[i]);
    const p2 = getCoordFromSet(tensionPoints[i + 1]);
    // middle two points are indexes
    straightLinePoints.push([p1, p2]);
  }

  // messy

  let segmentIndex = 0;
  chaosPoints[segmentIndex] = [];
  chaosPointLabels[segmentIndex] = [];
  for (let i = 0; i < spendPoints.length - 1; i++) {
    const spend = parseFloat(spendPoints[i][6]);
    const pi = getCoordFromSet(spendPoints[i]);
    const segmentLimit = accSegmentRows[segmentIndex];
    const week = parseInt(spendPoints[i][0]);
    if (week > segmentLimit) {
      segmentIndex += 1;
    }
    const randomPoints = [];
    for (let j = 0; j < spend; j++) {
      const dx = random(-20, 20);
      const dy = random(-20, 20);
      const dz = random(-20, 20);
      randomPoints.push(new THREE.Vector3(dx, dy, dz));
    }
    if (!chaosPoints[segmentIndex]) {
      chaosPoints[segmentIndex] = [];
      chaosPointLabels[segmentIndex] = [];
    }
    chaosPoints[segmentIndex].push([pi, ...randomPoints]);
    chaosPointLabels[segmentIndex].push(spend);
  }
}

function getCoordFromSet(set) {
  const week = parseInt(set[0]);
  const dayOfWeek = parseInt(set[1]);
  return (week - 1) * 7 + dayOfWeek - 1;
}

function getNewTetherPos(offset) {
  const time = clock.getElapsedTime();
  const isComplete = theta >= 1000;
  const floating = noise.simplex3(time / 100, time / 100, time / 200) * 0.5;
  return isComplete ? floating : offset / 1000;
}

function untether() {
  theta += 1;

  for (let i = 0; i < segmentObjects.length; i++) {
    const seg = segmentObjects[i];
    const currPos = seg.position;
    const offset = segmentOffsets[i];
    seg.position.setX(currPos.x + getNewTetherPos(offset.x));
    seg.position.setY(currPos.y + getNewTetherPos(offset.y));
    seg.position.setZ(currPos.z + getNewTetherPos(offset.z));
    const segPts = segmentPoints[i] || [];
    for (let j = 0; j < segPts.length; j++) {
      segPts[j].x += getNewTetherPos(offset.x);
      segPts[j].y += getNewTetherPos(offset.y);
      segPts[j].z += getNewTetherPos(offset.z);
    }
  }
}

function moveSegments() {
  for (let i = 0; i < segmentObjects.length; i++) {
    const seg = segmentObjects[i];
    seg.position.setY(accSegmentPositions[i]);
    const segPts = segmentPoints[i];
    for (let j = 0; j < segPts.length; j++) {
      segPts[j].y += accSegmentPositions[i];
    }
  }
}
function drawGrid(parent) {
  let z = 0;
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

  const addLine = (lines, i, segParent) => {
    const { l } = lines[i];
    const [x1, y1, z1, x2, y2, z2] = l;
    const tempPoints = [];
    tempPoints.push(new THREE.Vector3(x1, y1, z1));
    tempPoints.push(new THREE.Vector3(x2, y2, z2));

    const geometry = new THREE.BufferGeometry().setFromPoints(tempPoints);

    const line = new THREE.Line(geometry, lineMaterial);
    lineObjects.push(line);
    segParent.add(line);
  };
  for (let i = 0; i < segmentRows.length; i++) {
    const segmentParent = new THREE.Object3D();
    const offset = {
      x: random(-1000, 1000),
      y: random(-1000, 1000),
      z: random(-3000, 3000),
    };
    segmentOffsets.push(offset);
    const rows = segmentRows[i];
    const startCoord = totalLineCount[i];

    const vertLines = lines.slice(startCoord, startCoord + 7);
    const horiLines = lines.slice(startCoord + 7, startCoord + 7 + rows);

    for (let j = 0; j < vertLines.length; j++) {
      addLine(vertLines, j, segmentParent);
    }
    for (let j = 0; j < horiLines.length; j++) {
      addLine(horiLines, j, segmentParent);
    }
    const curveMaterial2 = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1,
    });
    const segmentChaosPoints = chaosPoints[i];
    for (let j = 0; j < segmentChaosPoints.length; j++) {
      const [pi, ...other] = segmentChaosPoints[j];
      // points are given as index of global points array
      const pix = points[pi].x;
      const piy = points[pi].y;
      const piz = points[pi].z;

      const adjustedOther = other.map(({ x, y, z }) => {
        return new THREE.Vector3(x + pix, y + piy, z + piz);
      });

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pix, piy, piz),
        ...adjustedOther,
      ]);
      const newPoints = curve.getPoints(40);

      const curveGeometry3 = new THREE.BufferGeometry().setFromPoints(
        newPoints
      );

      const curveObject = new THREE.Line(curveGeometry3, curveMaterial2);
      curveObject.callback = () => {
        console.log(chaosPointLabels[i][j]);
      };
      catCurves.push(curveObject);
      segmentParent.add(curveObject);
    }

    segmentObjects.push(segmentParent);
    parent.add(segmentParent);
  }
}
