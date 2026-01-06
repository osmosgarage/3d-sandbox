import type { WebGLRenderer } from 'three';
import type { LightingRig } from './lights';
import type { LoadedModel } from './models';

type UIOptions = {
  models: LoadedModel[];
  lighting: LightingRig;
  renderer: WebGLRenderer;
  onEnvironmentIntensityChange: (intensity: number) => void;
  navigation?: {
    getState: () => {
      flyMode: boolean;
      speed: number;
      lookSpeed: number;
      gyroEnabled: boolean;
      gyroAvailable: boolean;
    };
    setFlyMode: (enabled: boolean) => void;
    setSpeed: (speed: number) => void;
    setLookSpeed: (speed: number) => void;
    setGyroEnabled: (enabled: boolean) => Promise<boolean>;
  };
};

type UIHandle = {
  updateModels: (models: LoadedModel[]) => void;
};

const createSlider = (
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (nextValue: number) => void
) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-control';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'ui-value';
  valueEl.textContent = value.toFixed(2);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('input', () => {
    const nextValue = Number(input.value);
    valueEl.textContent = nextValue.toFixed(2);
    onChange(nextValue);
  });

  labelEl.appendChild(valueEl);
  wrapper.append(labelEl, input);
  return wrapper;
};

const createToggle = (
  label: string,
  checked: boolean,
  onChange: (nextValue: boolean) => void
) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-control';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => {
    onChange(input.checked);
  });

  wrapper.append(labelEl, input);
  return wrapper;
};

export const createUI = ({
  models,
  lighting,
  renderer,
  onEnvironmentIntensityChange,
  navigation
}: UIOptions): UIHandle => {
  const panel = document.createElement('aside');
  panel.className = 'ui-panel';

  const toggleButton = document.createElement('button');
  toggleButton.className = 'ui-toggle';
  toggleButton.type = 'button';
  toggleButton.setAttribute('aria-expanded', 'false');
  toggleButton.textContent = '▸';

  toggleButton.addEventListener('click', () => {
    const isCollapsed = panel.classList.toggle('collapsed');
    toggleButton.textContent = isCollapsed ? '▸' : '▾';
    toggleButton.setAttribute('aria-expanded', (!isCollapsed).toString());
  });

  const content = document.createElement('div');
  content.className = 'ui-content';

  const heading = document.createElement('h2');
  heading.textContent = 'Scene Controls';
  content.appendChild(heading);

  const modelsSection = document.createElement('section');
  const modelsHeading = document.createElement('h3');
  modelsHeading.textContent = 'Models';
  modelsSection.appendChild(modelsHeading);

  const renderModels = (nextModels: LoadedModel[]) => {
    while (modelsSection.children.length > 1) {
      modelsSection.removeChild(modelsSection.lastChild as ChildNode);
    }

    nextModels.forEach((model) => {
      modelsSection.appendChild(
        createToggle(model.name, model.object.visible, (visible) => {
          model.object.visible = visible;
        })
      );
    });
  };

  renderModels(models);

  content.appendChild(modelsSection);

  const lightingSection = document.createElement('section');
  const lightingHeading = document.createElement('h3');
  lightingHeading.textContent = 'Lighting';
  lightingSection.appendChild(lightingHeading);

  lightingSection.appendChild(
    createSlider(
      'Ambient',
      lighting.ambientLight.intensity,
      0,
      2,
      0.01,
      (value) => {
        lighting.ambientLight.intensity = value;
      }
    )
  );

  lightingSection.appendChild(
    createToggle('Code Lights', true, (enabled) => {
      lighting.setEnabled(enabled);
    })
  );

  lightingSection.appendChild(
    createSlider(
      'Directional',
      lighting.directionalLight.intensity,
      0,
      10,
      0.05,
      (value) => {
        lighting.directionalLight.intensity = value;
      }
    )
  );

  lighting.pointLights.forEach((pointLight, index) => {
    lightingSection.appendChild(
      createSlider(
        `Point ${index + 1}`,
        pointLight.intensity,
        0,
        10,
        0.05,
        (value) => {
          pointLight.intensity = value;
        }
      )
    );
  });

  lightingSection.appendChild(
    createSlider('Exposure', renderer.toneMappingExposure, 0.2, 2, 0.01, (v) => {
      renderer.toneMappingExposure = v;
    })
  );

  lightingSection.appendChild(
    createSlider('Environment', 1, 0, 2, 0.05, onEnvironmentIntensityChange)
  );

  content.appendChild(lightingSection);

  if (navigation) {
    const navigationSection = document.createElement('section');
    const navigationHeading = document.createElement('h3');
    navigationHeading.textContent = 'Navigation';
    navigationSection.appendChild(navigationHeading);

    const state = navigation.getState();

    navigationSection.appendChild(
      createToggle('Fly Mode', state.flyMode, (enabled) => {
        navigation.setFlyMode(enabled);
      })
    );

    navigationSection.appendChild(
      createSlider('Speed', state.speed, 0.5, 10, 0.1, (value) => {
        navigation.setSpeed(value);
      })
    );

    navigationSection.appendChild(
      createSlider('Look', state.lookSpeed, 0.0005, 0.01, 0.0001, (value) => {
        navigation.setLookSpeed(value);
      })
    );

    if (state.gyroAvailable) {
      const gyroToggle = createToggle('Gyro Look', state.gyroEnabled, (enabled) => {
        navigation.setGyroEnabled(enabled).then((granted) => {
          if (!granted) {
            (gyroToggle.querySelector('input') as HTMLInputElement).checked = false;
          }
        });
      });
      navigationSection.appendChild(gyroToggle);

      if (!state.gyroEnabled) {
        navigation.setGyroEnabled(true).then((granted) => {
          if (granted) {
            (gyroToggle.querySelector('input') as HTMLInputElement).checked = true;
          }
        });
      }
    }

    content.appendChild(navigationSection);
  }

  panel.classList.add('collapsed');
  panel.append(toggleButton, content);
  document.body.appendChild(panel);

  return {
    updateModels: (nextModels: LoadedModel[]) => {
      renderModels(nextModels);
    }
  };
};
