/**
 * @file Main ThreeJS engine setup and rendering logic
 */

import * as THREE from 'three';

import { createBoard } from './module/createBoard';
import { createEnvironment } from './module/createEnvironment';
import { coordinatesToPlacement, placementToCoordinates } from './module/coordinates';
/** @type {THREE.WebGLRenderer|null} */
let renderer = null;
/** @type {THREE.Scene} */
const scene = new THREE.Scene();

/** @type {THREE.PerspectiveCamera} */
const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 1000);

/** @type {THREE.Raycaster} */
const raycaster = new THREE.Raycaster();

/** @type {THREE.Vector3} */
const mouse = new THREE.Vector2();

/**
 * Initializes the ThreeJS renderer and lighting setup
 * @param {HTMLCanvasElement} canvas - The canvas element to render to
 * @returns {Promise<boolean>} - Returns true when initialization is complete
 */
async function initialize(canvas) {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    canvas,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0x808080, 12);
  directionalLight.position.set(0, 24, 0);
  scene.add(directionalLight);

  // a soft ambient light in the middle of the scene
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  camera.lookAt(0, 0, 0);

  return true;
}

/**
 * Main render loop
 */
function render() {
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

/**
 * Handles canvas resize to maintain proper display ratio
 * @param {THREE.WebGLRenderer} renderer - The ThreeJS renderer
 * @returns {boolean} - Whether a resize was needed
 */
function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

/** Creates a new module in the scene
 * @param {Object} encounter - The encounter configuration object containing:
 *  @param {Object} encounter.board - The initial layout of the board
 *  @param {Object} encounter.environment - The environment to use for the encounter
 * @returns {Promise<void>}
 */
async function createEncounter(encounter) {
  camera.userData.perspective = {
    initial: { alpha: 180, beta: 25, radius: 7 },
    current: { alpha: 180, beta: 25, radius: 7 },
  };

  const [boardGroup, environment] = await Promise.all([createBoard(encounter.board, encounter.environment), createEnvironment(encounter.environment)]);
  console.log('created encounter ', encounter.name, 'in', encounter.environment.name, 'from setting', encounter.environment.setting.name, 'camera.position', camera.position);
  scene.add(boardGroup);
  scene.add(environment);

  scene.userData.board = encounter.board;
  scene.userData.environment = encounter.environment;

  await changePerspective('home');
  requestAnimationFrame(render);
}

/** searches for an interaction target within the scene on an a explorative level like lookAt or hover, or selection level like clicking to select a tile
 * @async
 * @param {Object} event - The event object
 * @returns {Promise<void>}
 */
async function getInteractionTarget(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  const tile = intersects.find((intersect) => intersect.object.name.startsWith('tile:'));
  const moveTo = intersects.find((intersect) => intersect.object.name.startsWith('moveTo:'));
  if (moveTo) {
    const response = {
      type: 'moveTo',
      name: moveTo.object.name,
      position: moveTo.object.position,
    };
    // console.log('mouse interaction', response);
    return response;
  } else if (tile) {
    const response = {
      type: 'tile',
      name: tile.object.name,
      position: tile.object.position,
    };
    // console.log('mouse interaction', response);
    return response;
  }
}

/** Updates the cursor position based on direction input
 * @param {string} direction - The direction to move the cursor ('up'|'down'|'left'|'right'|'to')
 * @param {string} placement - The placement to move the cursor to if direction is 'to', i.e. 'd3'
 * @returns {Promise<void>}
 */
async function moveCursor(direction, placement) {
  const cursor = scene.getObjectByName('cursor');
  const move = { x: 0, z: 0 };

  const alpha = camera.userData.perspective.current.alpha;
  if (direction === 'to') {
    const coordinates = placementToCoordinates(placement);
    if (withinBounds(placement)) {
      cursor.position.set(coordinates.x, 0, coordinates.z);
      cursor.userData.placement = placement;
    }
  } else {
    if ([0, 315, 45].includes(alpha)) {
      move.x = direction === 'left' ? 1 : direction === 'right' ? -1 : 0;
      move.z = direction === 'down' ? -1 : direction === 'up' ? 1 : 0;
    } else if ([90].includes(alpha)) {
      move.x = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
      move.z = direction === 'left' ? 1 : direction === 'right' ? -1 : 0;
    } else if ([180, 225, 135].includes(alpha)) {
      move.x = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
      move.z = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
    } else if ([270].includes(alpha)) {
      move.x = direction === 'down' ? -1 : direction === 'up' ? 1 : 0;
      move.z = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    }
    const destination = coordinatesToPlacement({ x: cursor.position.x + move.x, y: 0, z: cursor.position.z + move.z });
    if (withinBounds(destination)) {
      cursor.position.set(cursor.position.x + move.x, 0, cursor.position.z + move.z);
      cursor.userData.placement = destination;
    }
  }
  console.log('movedCursor', direction, alpha, cursor.position.x, move.x, cursor.position.z, move.z, cursor.userData.placement);
  return cursor.userData.placement;

  // check if the destination is within the board
  function withinBounds(destination) {
    const indexColumn = scene.userData.board.shape[scene.userData.board.shape.length - 1].indexOf(destination.charAt(0));
    const indexRow = scene.userData.board.shape.length - 1 - parseInt(destination.charAt(1));
    console.log('destination', destination, 'indexColumn', indexColumn, scene.userData.board.shape[scene.userData.board.shape.length - 1], 'indexRow', indexRow, scene.userData.board.shape[indexRow]);
    return scene.userData.board.shape[indexRow].charAt(indexColumn) !== '0';
  }
}

/** Rotates the board group based on direction input
 * @param {number} direction - The direction the camera is supposed to move
 * @returns {Promise<void>}
 */
async function changePerspective(direction) {
  const duration = 1000; // Increased duration for smoother animation

  let alpha = camera.userData.perspective.current.alpha;
  let beta = camera.userData.perspective.current.beta;
  let radius = camera.userData.perspective.current.radius;

  const startPosition = camera.position.clone();

  switch (direction) {
    case 'home':
      alpha = camera.userData.perspective.initial.alpha;
      beta = camera.userData.perspective.initial.beta;
      radius = camera.userData.perspective.initial.radius;
      break;
    case 'up':
      if (camera.userData.perspective.current.beta === 75) return false;
      beta = camera.userData.perspective.current.beta + 25;
      break;
    case 'down':
      if (camera.userData.perspective.current.beta === 25) return false;
      beta = camera.userData.perspective.current.beta - 25;
      break;
    case 'left':
      alpha = camera.userData.perspective.current.alpha + 45;
      if (alpha > 360) alpha = 0;
      break;
    case 'right':
      alpha = camera.userData.perspective.current.alpha - 45;
      if (alpha <= 0) alpha = 315;
      break;
  }

  // TODO: does it make sense to manipulate the radius based on elevation?
  // radius = camera.userData.perspective.initial.radius - beta / 15;
  // console.log('change perspective', alpha, beta, radius);

  // Calculate end position with corrected trigonometry
  const endPosition = new THREE.Vector3(radius * Math.sin((alpha * Math.PI) / 180) * Math.cos((beta * Math.PI) / 180), radius * Math.sin((beta * Math.PI) / 180), -radius * Math.cos((alpha * Math.PI) / 180) * Math.cos((beta * Math.PI) / 180));

  // Create closure for animation parameters
  const animationStart = Date.now();
  const animate = () => {
    const elapsed = Date.now() - animationStart;
    const progress = Math.min(elapsed / duration, 1);
    // Use easeInOutQuad for smooth animation
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    camera.position.lerpVectors(startPosition, endPosition, eased);
    camera.lookAt(0, 0, 0);
    if (progress < 1) requestAnimationFrame(animate);
  };
  animate();
  camera.lookAt(0, 0, 0);
  camera.userData.perspective.current.alpha = alpha;
  camera.userData.perspective.current.beta = beta;
  camera.userData.perspective.current.radius = radius;
}

/** Shows the movement options for a given maneuver
 * @param {Object} maneuver - The maneuver object
 * @param {string} maneuver.name - The name of the maneuver
 * @param {string} maneuver.description - The description of the maneuver
 * @param {Object[]} maneuver.options - An array of tiles the character could move to
 * @param {string} maneuver.options[].placement - The tile the character could move to
 * @param {string} maneuver.options[].type - The type of the movement, i.e. 'unoccupied' if the character moves to an unoccupied tile
 * @returns {Promise<void>}
 */
async function showMovementOptions(maneuver) {
  console.log('showMovementOptions', maneuver);
  const movementOptionsGroup = scene.getObjectByName('Board').getObjectByName('MovementOptions');
  movementOptionsGroup.position.set(0, -0.2, 0);
  for (const option of maneuver.options) {
    const coordinates = placementToCoordinates(option.placement);
    let indicatorColor = null;
    switch (option.type) {
      case 'unoccupied':
        indicatorColor = new THREE.MeshPhongMaterial({ color: 0x009acd, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        break;
      case 'occupied':
        indicatorColor = new THREE.MeshPhongMaterial({ color: 0x006e93, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        break;
    }
    const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), indicatorColor);
    indicator.name = `moveTo:${option.placement}`;
    indicator.position.set(coordinates.x, 0, coordinates.z);
    movementOptionsGroup.add(indicator);
  }

  // Create an animation raising the movement options group
  const duration = 1000;
  const animationStart = Date.now();
  const startPosition = movementOptionsGroup.position.clone();
  const endPosition = new THREE.Vector3(0, 0, 0);
  const animateIn = () => {
    const elapsed = Date.now() - animationStart;
    const progress = Math.min(elapsed / duration, 1);
    // Use easeInOutQuad for smooth animation
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    movementOptionsGroup.position.lerpVectors(startPosition, endPosition, eased);
    if (progress < 1) requestAnimationFrame(animateIn);
  };
  animateIn();
  console.log('anmation done');
  return true;
}

/** Clears all movement options from the board
 * @returns {Promise<void>}
 */
async function clearMovementOptions() {
  const movementOptionsGroup = scene.getObjectByName('Board').getObjectByName('MovementOptions');
  movementOptionsGroup.position.set(0, -0.2, 0);
  movementOptionsGroup.clear();
}

export { initialize, createEncounter, moveCursor, changePerspective, getInteractionTarget, showMovementOptions, clearMovementOptions };
