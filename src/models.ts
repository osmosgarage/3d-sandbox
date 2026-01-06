import type { Material, Object3D } from 'three';
import { Box3, Scene, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type ModelConfig = {
  name: string;
  url: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
  targetSize?: number;
  center?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

export type LoadedModel = {
  name: string;
  object: Object3D;
};

const applyShadows = (
  object: Object3D,
  castShadow = true,
  receiveShadow = true
) => {
  object.traverse((child) => {
    if ('isMesh' in child) {
      child.castShadow = castShadow;
      child.receiveShadow = receiveShadow;
    }
  });
};

const normalizeModel = (
  object: Object3D,
  {
    center = true,
    targetSize
  }: { center?: boolean; targetSize?: number }
) => {
  const box = new Box3().setFromObject(object);
  if (!box.isEmpty()) {
    if (center) {
      const centerPoint = new Vector3();
      box.getCenter(centerPoint);
      object.position.sub(centerPoint);
    }

    if (targetSize && targetSize > 0) {
      const size = new Vector3();
      box.getSize(size);
      const maxDimension = Math.max(size.x, size.y, size.z);
      if (maxDimension > 0) {
        const uniformScale = targetSize / maxDimension;
        object.scale.multiplyScalar(uniformScale);
      }
    }
  }
};

export const loadModels = async (
  scene: Scene,
  configs: ModelConfig[] = []
): Promise<LoadedModel[]> => {
  if (configs.length === 0) {
    return [];
  }

  const loader = new GLTFLoader();

  const loadModel = (config: ModelConfig) =>
    new Promise<LoadedModel>((resolve, reject) => {
      loader.load(
        config.url,
        (gltf) => {
          const model = gltf.scene || gltf.scenes[0];
          normalizeModel(model, {
            center: config.center ?? true,
            targetSize: config.targetSize
          });

          if (config.scale) {
            model.scale.multiplyScalar(config.scale);
          }

          if (config.position) {
            model.position.set(
              config.position.x,
              config.position.y,
              config.position.z
            );
            model.userData.layoutLocked = true;
          }

          if (config.rotation) {
            model.rotation.set(
              config.rotation.x,
              config.rotation.y,
              config.rotation.z
            );
          }

          applyShadows(
            model,
            config.castShadow ?? true,
            config.receiveShadow ?? true
          );

          scene.add(model);
          resolve({ name: config.name, object: model });
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });

  return Promise.all(configs.map(loadModel));
};

export const layoutModels = (
  models: LoadedModel[],
  { spacing = 2.5, alignToGround = true } = {}
) => {
  let cursor = 0;
  models.forEach((model) => {
    if (model.object.userData.layoutLocked) {
      return;
    }
    const box = new Box3().setFromObject(model.object);
    if (box.isEmpty()) {
      model.object.position.x = cursor;
      cursor += spacing;
      return;
    }

    const size = new Vector3();
    box.getSize(size);
    const halfWidth = size.x / 2;

    model.object.position.x = cursor + halfWidth;

    if (alignToGround) {
      const minY = box.min.y;
      model.object.position.y -= minY;
    }

    cursor += size.x + spacing;
  });
};

export const setModelsVisibility = (
  models: LoadedModel[],
  name: string,
  visible: boolean
) => {
  const model = models.find((entry) => entry.name === name);
  if (model) {
    model.object.visible = visible;
  }
};

export const setModelsEnvironmentIntensity = (
  models: LoadedModel[],
  intensity: number
) => {
  models.forEach((model) => {
    model.object.traverse((child) => {
      if ('isMesh' in child) {
        const mesh = child as Object3D & { material?: Material | Material[] };
        if (!mesh.material) {
          return;
        }

        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        materials.forEach((material) => {
          if ('envMapIntensity' in material) {
            material.envMapIntensity = intensity;
            material.needsUpdate = true;
          }
        });
      }
    });
  });
};

export const findFirstByName = (
  models: LoadedModel[],
  name: string
): Object3D | undefined => {
  for (const model of models) {
    let found: Object3D | undefined;
    model.object.traverse((child) => {
      if (found) {
        return;
      }
      if (child.name === name) {
        found = child;
      }
    });
    if (found) {
      return found;
    }
  }
  return undefined;
};

export const collectByPrefix = (
  models: LoadedModel[],
  prefix: string,
  { hide = false } = {}
): Object3D[] => {
  const matches: Object3D[] = [];
  models.forEach((model) => {
    model.object.traverse((child) => {
      if (child.name.startsWith(prefix)) {
        matches.push(child);
        if (hide) {
          child.visible = false;
        }
      }
    });
  });
  return matches;
};
