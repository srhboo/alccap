import * as THREE from "three";

import Stats from "./jsm/libs/stats.module.js";

import { basicData } from "./data/basic";
import { CSVToArray } from "./utils/csv";
import { random } from "./utils/misc";
import { OrbitControls } from "./jsm/controls/OrbitControls";

let container, stats, controls;
let camera, scene, raycaster, renderer, parentTransform, sphereInter;

//data
let bottom = -1000;
let lines = [];
const points = [];
const curves = [];
const curves2 = [];
const matchPoints = [];
const matchPoints2 = [];
const tensionPoints = [];
const drinkPoints = [];
const searchTerm = "tired";
const searchTerm2 = "energy";
let topX1 = -200;
let topY1 = 100;
let topX2 = 200;
let topY2 = 100;
let theta = 0;
let weeks = 0;
let conDat = [];

const pointer = new THREE.Vector2();

init();
animate();

function init() {
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

  drawGrid(parentTransform, 10);

  drawGrid(parentTransform, 500, 500);
  const curveMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  for (let i = 0; i < curves.length; i++) {
    const [c1x, c1y, p1x, p1y, p2x, p2y, c2x, c2y] = curves[i];

    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(p1x, p1y, 10),
      new THREE.Vector3(c1x, c1y, random(-500, 500)),
      new THREE.Vector3(c2x, c2y, random(-500, 500)),
      new THREE.Vector3(p2x, p2y, 10)
    );
    const points = curve.getPoints(50);

    const curveGeometry = new THREE.BufferGeometry().setFromPoints(points);

    const curveObject = new THREE.Line(curveGeometry, curveMaterial);
    parentTransform.add(curveObject);
  }
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

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
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

let z = 100;
function setupLines() {
  const days = [
    {
      bottomX: 100,
      type: "weekday",
    },
    {
      bottomX: 430,
      type: "weekday",
    },
    {
      bottomX: 180,
      type: "weekday",
    },
    {
      bottomX: 200,
      type: "weekday",
    },
    {
      bottomX: 250,
      type: "weekday",
    },
    {
      bottomX: 350,
      type: "weekend",
    },
    {
      bottomX: 450,
      type: "weekend",
    },
  ];

  const vertLines = [];
  for (let i = 0; i < days.length; i++) {
    const { bottomX, type } = days[i];
    const topX = type === "weekday" ? topX1 : topX2;
    const l = [topX, topY1, bottomX, bottom];
    const lm = (l[3] - l[1]) / (l[2] - l[0]);
    const lb = l[1] - lm * l[0];
    lines.push(l);
    vertLines.push({ m: lm, b: lb });
  }
  const horiLines = [];

  // horizontal lines
  for (let i = 0; i < weeks; i++) {
    const lHorY = -200 - i * 50;
    const l1 = vertLines[0];
    const l7 = vertLines[vertLines.length - 1];
    const lHor = [(lHorY - l1.b) / l1.m, lHorY, (lHorY - l7.b) / l7.m, lHorY];
    horiLines.push(lHorY);
    lines.push(lHor);
  }
  for (let j = 0; j < horiLines.length; j++) {
    for (let i = 0; i < vertLines.length; i++) {
      const { m, b } = vertLines[i];
      const y = horiLines[j];
      const x = (y - b) / m;
      points.push({ x, y });
    }
  }

  for (let i = 0; i < matchPoints.length - 1; i++) {
    const px1 = random(-900, 1000);
    const py1 = random(-900, 1000);
    const px2 = random(-900, 1000);
    const py2 = random(-900, 1000);

    const p3 = getCoordFromSet(matchPoints[i]);
    const p4 = getCoordFromSet(matchPoints[i + 1]);

    curves.push([px1, py1, p3.x, p3.y, p4.x, p4.y, px2, py2]);
  }

  for (let i = 0; i < matchPoints2.length - 1; i++) {
    const px1 = random(-900, 1000);
    const py1 = random(-900, 1000);
    const px2 = random(-900, 1000);
    const py2 = random(-900, 1000);

    const p3 = getCoordFromSet(matchPoints2[i]);
    const p4 = getCoordFromSet(matchPoints2[i + 1]);

    curves.push([px1, py1, p3.x, p3.y, p4.x, p4.y, px2, py2]);
  }
  for (let i = 0; i < tensionPoints.length - 2; i++) {
    const px1 = random(-900, 2000);
    const py1 = random(-900, 2000);
    const px2 = random(-900, 2000);
    const py2 = random(-900, 2000);

    const p3 = getCoordFromSet(tensionPoints[i]);
    const p4 = getCoordFromSet(tensionPoints[i + 1]);

    curves2.push([px1, py1, p3.x, p3.y, p4.x, p4.y, px2, py2]);
  }
}

function getCoordFromSet(set) {
  const week = parseInt(set[0]);
  const dayOfWeek = parseInt(set[1]);
  return points[(week - 1) * 7 + dayOfWeek - 1];
}

function drawGrid(parent, z, topOffset = 0) {
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  for (let i = 0; i < lines.length; i++) {
    const [x1, y1, x2, y2] = lines[i];
    const points = [];
    points.push(new THREE.Vector3(x1, y1 + topOffset, z));
    points.push(new THREE.Vector3(x2, y2 + topOffset, z));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const line = new THREE.Line(geometry, lineMaterial);
    parent.add(line);
  }
}
