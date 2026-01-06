import {
  AmbientLight,
  DirectionalLight,
  PMREMGenerator,
  PointLight,
  Scene,
  WebGLRenderer
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type LightingRig = {
  ambientLight: AmbientLight;
  directionalLight: DirectionalLight;
  pointLights: PointLight[];
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
};

export const setupLighting = (
  scene: Scene,
  renderer: WebGLRenderer
): LightingRig => {
  const ambientLight = new AmbientLight(0xffffff, 0.35);
  const directionalLight = new DirectionalLight(0xffffff, 3);
  directionalLight.position.set(6, 8, 6);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 40;

  const keyLight = new PointLight(0xffffff, 1.5, 30);
  keyLight.position.set(4, 6, 2);
  keyLight.castShadow = true;

  const fillLight = new PointLight(0x88aaff, 0.7, 40);
  fillLight.position.set(-6, 4, -4);

  const pmremGenerator = new PMREMGenerator(renderer);
  const environmentTexture = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
  ).texture;
  pmremGenerator.dispose();

  const rigLights = [ambientLight, directionalLight, keyLight, fillLight];
  scene.environment = environmentTexture;
  scene.add(...rigLights);

  return {
    ambientLight,
    directionalLight,
    pointLights: [keyLight, fillLight],
    setEnabled: (enabled) => {
      rigLights.forEach((light) => {
        light.visible = enabled;
      });
      scene.environment = enabled ? environmentTexture : null;
    },
    dispose: () => {
      environmentTexture.dispose();
    }
  };
};
