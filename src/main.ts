import './styles.css';

import { Clock, Raycaster, Vector2 } from 'three';
import { createCamera } from './camera';
import { createWalkFlyControls } from './controls';
import { setupLighting } from './lights';
import {
  collectByPrefix,
  findFirstByName,
  layoutModels,
  loadModels,
  setModelsEnvironmentIntensity
} from './models';
import { createRenderer } from './renderer';
import { createScene } from './scene';
import { createUI } from './ui';

const container = document.getElementById('canvas-container');

if (!container) {
  throw new Error('Canvas container element not found.');
}

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer(container);
const navigation = createWalkFlyControls(camera, renderer.domElement);

const lighting = setupLighting(scene, renderer);

const modelConfigs = [
  {
    name: 'Room',
    url: '/models/threetestart1.glb',
    castShadow: true,
    receiveShadow: true
  }
];

loadModels(scene, modelConfigs)
  .then((models) => {
    if (models.length > 1) {
      layoutModels(models, { spacing: 3 });
    }

    setModelsEnvironmentIntensity(models, 1);
    createUI({
      models,
      lighting,
      renderer,
      onEnvironmentIntensityChange: (value) => {
        setModelsEnvironmentIntensity(models, value);
      },
      navigation
    });

    const spawn = findFirstByName(models, 'SPAWN');
    if (spawn) {
      spawn.getWorldPosition(camera.position);
    }

    const colliders = collectByPrefix(models, 'COLLIDER_', { hide: true });
    if (colliders.length > 0) {
      navigation.setColliders(colliders);
      navigation.setColliderRadius(0.35);
    }

    const interactables = collectByPrefix(models, 'INTERACT_');
    if (interactables.length > 0) {
      const raycaster = new Raycaster();
      const pointer = new Vector2(0, 0);
      const actions = new Map<string, () => void>([
        [
          'INTERACT_1EP',
          () => {
            showInfoPanel(
              'Eija P',
              'This piece showcases the Eija P series. Swap in your own description here.'
            );
          }
        ],
        [
          'INTERACT_2EP',
          () => window.open('https://eijap.art', '_blank', 'noopener,noreferrer')
        ]
      ]);

      const onInteract = (event: PointerEvent) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('.ui-panel') || target?.closest('.touch-controls')) {
          return;
        }

        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(interactables, true);
        if (hits.length === 0) {
          return;
        }

        let object = hits[0].object;
        while (object) {
          if (actions.has(object.name)) {
            actions.get(object.name)?.();
            break;
          }
          object = object.parent as typeof object | null;
        }
      };

      renderer.domElement.addEventListener('pointerup', onInteract);
      window.addEventListener('beforeunload', () => {
        renderer.domElement.removeEventListener('pointerup', onInteract);
      });
    }
  })
  .catch((error) => {
    console.error('Failed to load models:', error);
  });

const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
};

let animationId: number;
const clock = new Clock();

const animate = () => {
  animationId = window.requestAnimationFrame(animate);
  navigation.update(clock.getDelta());
  renderer.render(scene, camera);
};

window.addEventListener('resize', handleResize);

animate();

window.addEventListener('beforeunload', () => {
  window.cancelAnimationFrame(animationId);
  navigation.dispose();
  renderer.dispose();
  lighting.dispose();
});

const infoPanel = (() => {
  const panel = document.createElement('div');
  panel.className = 'info-panel hidden';

  const card = document.createElement('div');
  card.className = 'info-card';

  const title = document.createElement('h2');
  const body = document.createElement('p');
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  card.append(title, body, close);
  panel.appendChild(card);
  document.body.appendChild(panel);

  return { panel, title, body };
})();

const showInfoPanel = (titleText: string, bodyText: string) => {
  infoPanel.title.textContent = titleText;
  infoPanel.body.textContent = bodyText;
  infoPanel.panel.classList.remove('hidden');
};
