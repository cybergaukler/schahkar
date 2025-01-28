import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { placementToCoordinates } from './coordinates';

const gltfLoader = new GLTFLoader();

/** Creates a 3D game board with tiles, pieces and cursor based on the provided board configuration
 * @param {Object} board - The board configuration object containing:
 *  @param {string[][]} board.shape - 2D array defining which tiles are playable ('1') or not ('0')
 *  @param {Object} board.initial - Initial board state including cursor and camera positions
 * @param {Object} environment - The environment the board is placed in containing:
 *  @param {string} environment.name - The name of the environment
 *  @param {Object} environment.setting - The setting configuration object containing:
 *    @param {string} environment.setting.name - The name of the setting
 * @returns {Promise<THREE.Group>} A ThreeJS Group containing all board elements
 */
async function createBoard(board, environment) {
  const materials = {
    'tile-white': { color: 0xffffff },
    'tile-black': { color: 0x666666 },
    'piece-white': new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: -2, roughness: 1 }),
    'piece-black': new THREE.MeshStandardMaterial({ color: 0x101010, metalness: -2, roughness: 1 }),
    'cursor-white': new THREE.MeshPhongMaterial({ color: 0x006e93, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    'cursor-white-movement': new THREE.MeshPhongMaterial({ color: 0x009acd, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  };
  // Load the geometry of pieces
  let gltf = null;
  let mesh = null;
  const pieces = {};

  for (const color of ['white', 'black']) {
    for (const piece of ['shah', 'vizier', 'asp', 'fil', 'rukh', 'piyade']) {
      try {
        gltf = await gltfLoader.loadAsync(`https://shahkar.fra1.digitaloceanspaces.com/settings/${environment.setting.name.toLowerCase()}/characters/${color}/${piece}.glb`);
        console.log('loaded piece', color, piece, gltf);
        // mesh = gltf.scene.getObjectByName(piece);
        pieces[`${piece}-${color}`] = gltf.scene;
      } catch (error) {
        console.log('could not load piece', color, piece, error);
        pieces[piece] = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      }
    }
  }
  // load the geometry cursor
  // gltf = await gltfLoader.loadAsync(`https://shahkar.fra1.digitaloceanspaces.com/settings/${environment.setting.name.toLowerCase()}/cursor.glb`);
  // mesh = gltf.scene.getObjectByName('cursor');
  // pieces['cursor'] = mesh.geometry;

  // create the cursor geometry as a simple cube
  pieces['cursor'] = new THREE.BoxGeometry(0.8, 0.2, 0.8);
  pieces['cursor'].name = 'cursor';

  // Create a group to hold all tiles and the movementOptions
  const boardGroup = new THREE.Group();
  boardGroup.name = 'Board';
  const movementOptionsGroup = new THREE.Group();
  movementOptionsGroup.name = 'MovementOptions';
  boardGroup.add(movementOptionsGroup);

  gltf = await gltfLoader.loadAsync(`https://shahkar.fra1.digitaloceanspaces.com/settings/${environment.setting.name.toLowerCase()}/tile.glb`);
  mesh = gltf.scene.getObjectByName('Plane');
  console.log('create board', board);

  // the shape of the board is like a chessboard with letters and numbers
  // 0: "800000000"
  // 1: "700000000"
  // 2: "600011000"
  // 3: "500011000"
  // 4: "400011000"
  // 5: "300011000"
  // 6: "200000000"
  // 7: "100000000"
  // 8: " abcdefgh"
  // we need to translate this into a 2D array of numbers

  for (let row = 7; row > -1; row--) {
    for (let column = 1; column < board.shape[row].length; column++) {
      const geometry = mesh.geometry.clone();
      const layout = board.shape[row][column];
      if (layout === '0') continue;
      const regularTile = Object.assign({}, materials[(row + (column - 1)) % 2 === 1 ? 'tile-black' : 'tile-white'], { transparent: false, opacity: 1 });
      const restrictedTile = Object.assign({}, materials[(row + (column - 1)) % 2 === 1 ? 'tile-black' : 'tile-white'], { transparent: true, opacity: 0.2 });
      const material = new THREE.MeshLambertMaterial(layout !== '0' ? regularTile : restrictedTile);

      const tile = new THREE.Mesh(geometry, material);
      // as the board is created from the white players perspective, the first visible row is the last element in the shape array
      const placement = `${board.shape[8].charAt(column)}${board.shape.length - 1 - row}`;
      tile.name = `tile:${placement}`;
      const coordinates = placementToCoordinates(placement);
      console.log('tile', tile.name, coordinates);
      tile.position.set(coordinates.x, 0, coordinates.z);

      boardGroup.add(tile);
    }
  }
  // Place the pieces
  console.log('board.initial.setup', board.initial.setup);
  for (const [placement, piece] of Object.entries(board.initial.setup)) {
    const coordinates = placementToCoordinates(placement);
    console.log('placing piece', piece.character.role, piece.character.color, placement, coordinates);
    if (!['shah', 'piyade'].includes(piece.character.role)) continue;
    const figure = pieces[`${piece.character.role}-${piece.character.color}`].clone();
    figure.name = `piece:${piece.character.role}-${piece.character.color}`;
    figure.position.set(coordinates.x, 0, coordinates.z);
    boardGroup.add(figure);
    if (piece.cursor) {
      const cursorGroup = new THREE.Group();
      cursorGroup.name = 'cursor';
      const geometry = pieces['cursor'].clone();
      const materialProperties = Object.assign({}, materials[`cursor-${piece.character.color}`], { metalness: -2, roughness: 1 });
      const material = new THREE.MeshLambertMaterial(materialProperties);
      const cursor = new THREE.Mesh(geometry, material);
      cursor.name = `cursor-${piece.character.color}`;
      cursorGroup.add(cursor);
      const spotLight = new THREE.SpotLight(0xffffff);
      spotLight.position.set(0, 2, 0);
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 128; // default is 1024
      spotLight.shadow.mapSize.height = 128; // default is 1024
      spotLight.shadow.radius = 0.2;
      spotLight.shadow.blurSamples = 2;
      spotLight.angle = 0.75;
      spotLight.target = cursor;
      cursorGroup.add(spotLight);
      cursorGroup.position.set(coordinates.x, 0, coordinates.z);
      boardGroup.add(cursorGroup);
    }
  }

  // shift the whole board position by an offset to make the game engines center the middle of the board
  boardGroup.position.set(-1 * ((board.shape.length - 1) / 2), 0, (board.shape[0].length - 1) / 2);
  return boardGroup;
}

export { createBoard };
