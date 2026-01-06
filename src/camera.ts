import { PerspectiveCamera } from 'three';

export const createCamera = (): PerspectiveCamera => {
  const aspectRatio = window.innerWidth / window.innerHeight || 1;
  const camera = new PerspectiveCamera(60, aspectRatio, 0.1, 100);
  camera.position.set(0, 1, 5);
  return camera;
};
