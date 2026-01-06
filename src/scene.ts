import { Color, Scene } from 'three';

export const createScene = (): Scene => {
  const scene = new Scene();
  scene.background = new Color(0x000000);
  return scene;
};
