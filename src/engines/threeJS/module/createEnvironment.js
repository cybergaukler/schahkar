import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

/** Creates a 3D environment model based on the provided environment configuration
 * @param {Object} environment - The environment configuration object containing:
 *  @param {string} environment.name - The name of the environment
 *  @param {Object} environment.setting - The setting configuration object containing:
 *    @param {string} environment.setting.name - The name of the setting
 * @returns {Promise<THREE.Group>} A ThreeJS Group containing the environment model
 */
async function createEnvironment(environment) {
  try {
    const gltf = await gltfLoader.loadAsync(`https://shahkar.fra1.digitaloceanspaces.com/settings/${environment.setting.name.toLowerCase()}/environments/${environment.name.toLowerCase()}.glb`);
    console.log('added environment', environment.name);
    return gltf.scene;
  } catch (error) {
    console.log('could not load environment', environment.name, error);
    throw error;
  }
}

export { createEnvironment };
