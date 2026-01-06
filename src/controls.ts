import { Euler, Object3D, PerspectiveCamera, Quaternion, Raycaster, Vector3 } from 'three';

type ControlState = {
  flyMode: boolean;
  speed: number;
  lookSpeed: number;
  walkHeight: number;
  gyroEnabled: boolean;
  gyroAvailable: boolean;
};

type ControlAPI = {
  update: (delta: number) => void;
  dispose: () => void;
  setFlyMode: (enabled: boolean) => void;
  setSpeed: (speed: number) => void;
  setLookSpeed: (speed: number) => void;
  setColliders: (colliders: Object3D[]) => void;
  setColliderRadius: (radius: number) => void;
  setGyroEnabled: (enabled: boolean) => Promise<boolean>;
  getState: () => ControlState;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const createWalkFlyControls = (
  camera: PerspectiveCamera,
  domElement: HTMLElement
): ControlAPI => {
  const state: ControlState = {
    flyMode: true,
    speed: 3,
    lookSpeed: 0.002,
    walkHeight: 1.6,
    gyroEnabled: false,
    gyroAvailable:
      typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
  };

  const movement = {
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    up: 0,
    down: 0
  };

  const touchMovement = { x: 0, z: 0 };
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const raycaster = new Raycaster();
  const colliderTargets: Object3D[] = [];
  let colliderRadius = 0.35;

  let yaw = camera.rotation.y;
  let pitch = camera.rotation.x;
  let isPointerLocked = false;
  let deviceOrientation: DeviceOrientationEvent | null = null;
  let screenOrientation = 0;
  let lookOffsetYaw = 0;
  let lookOffsetPitch = 0;

  const zee = new Vector3(0, 0, 1);
  const euler = new Euler();
  const q0 = new Quaternion();
  const q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  const qOffset = new Quaternion();

  const setObjectQuaternion = (
    quaternion: Quaternion,
    alpha: number,
    beta: number,
    gamma: number,
    orient: number
  ) => {
    euler.set(beta, alpha, -gamma, 'YXZ');
    quaternion.setFromEuler(euler);
    quaternion.multiply(q1);
    quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
  };

  camera.rotation.order = 'YXZ';

  const updateRotation = () => {
    pitch = clamp(pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
    camera.rotation.set(pitch, yaw, 0);
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!isPointerLocked) {
      return;
    }
    if (state.gyroEnabled) {
      return;
    }
    yaw -= event.movementX * state.lookSpeed;
    pitch -= event.movementY * state.lookSpeed;
    updateRotation();
  };

  const onPointerLockChange = () => {
    isPointerLocked = document.pointerLockElement === domElement;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        movement.forward = 1;
        break;
      case 'KeyS':
      case 'ArrowDown':
        movement.backward = 1;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        movement.left = 1;
        break;
      case 'KeyD':
      case 'ArrowRight':
        movement.right = 1;
        break;
      case 'Space':
        movement.up = 1;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        movement.down = 1;
        break;
      default:
        break;
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        movement.forward = 0;
        break;
      case 'KeyS':
      case 'ArrowDown':
        movement.backward = 0;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        movement.left = 0;
        break;
      case 'KeyD':
      case 'ArrowRight':
        movement.right = 0;
        break;
      case 'Space':
        movement.up = 0;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        movement.down = 0;
        break;
      default:
        break;
    }
  };

  const requestPointerLock = () => {
    if (isTouch) {
      return;
    }
    if (document.pointerLockElement !== domElement) {
      domElement.requestPointerLock();
    }
  };

  const touchControls = (() => {
    if (!isTouch) {
      return null;
    }

    const container = document.createElement('div');
    container.className = 'touch-controls';

    const movePad = document.createElement('div');
    movePad.className = 'touch-joystick';
    const moveStick = document.createElement('div');
    moveStick.className = 'touch-stick';
    movePad.appendChild(moveStick);

    const lookPad = document.createElement('div');
    lookPad.className = 'touch-lookpad';

    container.append(movePad, lookPad);
    document.body.appendChild(container);

    let movePointerId: number | null = null;
    let moveCenter = { x: 0, y: 0 };
    let moveRadius = 0;

    const updateMove = (event: PointerEvent) => {
      const dx = event.clientX - moveCenter.x;
      const dy = event.clientY - moveCenter.y;
      const normalizedX = clamp(dx / moveRadius, -1, 1);
      const normalizedY = clamp(dy / moveRadius, -1, 1);
      touchMovement.x = normalizedX;
      touchMovement.z = normalizedY;
      moveStick.style.transform = `translate(${normalizedX * 28}px, ${
        normalizedY * 28
      }px)`;
    };

    movePad.addEventListener('pointerdown', (event) => {
      movePointerId = event.pointerId;
      movePad.setPointerCapture(event.pointerId);
      const rect = movePad.getBoundingClientRect();
      moveCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      moveRadius = rect.width / 2;
      updateMove(event);
    });

    movePad.addEventListener('pointermove', (event) => {
      if (event.pointerId !== movePointerId) {
        return;
      }
      updateMove(event);
    });

    const resetMove = () => {
      movePointerId = null;
      touchMovement.x = 0;
      touchMovement.z = 0;
      moveStick.style.transform = 'translate(0, 0)';
    };

    movePad.addEventListener('pointerup', resetMove);
    movePad.addEventListener('pointercancel', resetMove);

    let lookPointerId: number | null = null;
    let lastLook = { x: 0, y: 0 };

    lookPad.addEventListener('pointerdown', (event) => {
      lookPointerId = event.pointerId;
      lookPad.setPointerCapture(event.pointerId);
      lastLook = { x: event.clientX, y: event.clientY };
    });

    lookPad.addEventListener('pointermove', (event) => {
      if (event.pointerId !== lookPointerId) {
        return;
      }
      const dx = event.clientX - lastLook.x;
      const dy = event.clientY - lastLook.y;
      lastLook = { x: event.clientX, y: event.clientY };
      if (state.gyroEnabled) {
        lookOffsetYaw -= dx * state.lookSpeed * 1.2;
        lookOffsetPitch -= dy * state.lookSpeed * 1.2;
        lookOffsetPitch = clamp(
          lookOffsetPitch,
          -Math.PI / 3,
          Math.PI / 3
        );
      } else {
        yaw -= dx * state.lookSpeed * 1.5;
        pitch -= dy * state.lookSpeed * 1.5;
        updateRotation();
      }
    });

    const resetLook = () => {
      lookPointerId = null;
    };

    lookPad.addEventListener('pointerup', resetLook);
    lookPad.addEventListener('pointercancel', resetLook);

    return container;
  })();

  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  domElement.addEventListener('click', requestPointerLock);

  const update = (delta: number) => {
    if (state.gyroEnabled) {
      if (deviceOrientation) {
        const alpha = ((deviceOrientation.alpha ?? 0) * Math.PI) / 180;
        const beta = ((deviceOrientation.beta ?? 0) * Math.PI) / 180;
        const gamma = ((deviceOrientation.gamma ?? 0) * Math.PI) / 180;
        const orient = (screenOrientation * Math.PI) / 180;
        setObjectQuaternion(camera.quaternion, alpha, beta, gamma, orient);
        qOffset.setFromEuler(new Euler(lookOffsetPitch, lookOffsetYaw, 0, 'YXZ'));
        camera.quaternion.multiply(qOffset);
      }
    }
    const previousPosition = camera.position.clone();
    const inputX = movement.right - movement.left + touchMovement.x;
    const inputZ = movement.forward - movement.backward - touchMovement.z;
    const inputY = movement.up - movement.down;

    const direction = new Vector3();
    if (state.flyMode) {
      const forward = new Vector3(0, 0, -1).applyEuler(camera.rotation);
      const right = new Vector3()
        .crossVectors(forward, new Vector3(0, 1, 0))
        .normalize();
      direction.addScaledVector(right, inputX);
      direction.addScaledVector(forward, inputZ);
      direction.y += inputY;
    } else {
      const forward = new Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new Vector3()
        .crossVectors(forward, new Vector3(0, 1, 0))
        .normalize();
      direction.addScaledVector(right, inputX);
      direction.addScaledVector(forward, inputZ);
    }

    if (direction.lengthSq() > 1) {
      direction.normalize();
    }

    camera.position.addScaledVector(direction, state.speed * delta);

    if (!state.flyMode) {
      camera.position.y = state.walkHeight;
    }

    if (colliderTargets.length > 0) {
      const movementDelta = camera.position.clone().sub(previousPosition);
      const distance = movementDelta.length();
      if (distance > 0) {
        raycaster.set(previousPosition, movementDelta.normalize());
        raycaster.far = distance + colliderRadius;
        const hits = raycaster.intersectObjects(colliderTargets, true);
        if (hits.length > 0 && hits[0].distance < distance + colliderRadius) {
          camera.position.copy(previousPosition);
        }
      }
    }
  };

  const dispose = () => {
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    domElement.removeEventListener('click', requestPointerLock);
    touchControls?.remove();
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
    window.removeEventListener('orientationchange', handleOrientationChange);
  };

  const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    deviceOrientation = event;
  };

  const handleOrientationChange = () => {
    const orientation =
      screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0;
    screenOrientation = typeof orientation === 'number' ? orientation : 0;
  };

  const setGyroEnabled = async (enabled: boolean) => {
    if (!state.gyroAvailable) {
      state.gyroEnabled = false;
      return false;
    }

    if (enabled && 'requestPermission' in DeviceOrientationEvent) {
      try {
        const permission = await (
          DeviceOrientationEvent as unknown as {
            requestPermission: () => Promise<'granted' | 'denied'>;
          }
        ).requestPermission();
        if (permission !== 'granted') {
          state.gyroEnabled = false;
          return false;
        }
      } catch {
        state.gyroEnabled = false;
        return false;
      }
    }

    state.gyroEnabled = enabled;
    if (enabled) {
      handleOrientationChange();
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      window.addEventListener('orientationchange', handleOrientationChange);
      yaw = camera.rotation.y;
      pitch = camera.rotation.x;
      lookOffsetYaw = 0;
      lookOffsetPitch = 0;
    } else {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      window.removeEventListener('orientationchange', handleOrientationChange);
    }
    return state.gyroEnabled;
  };

  return {
    update,
    dispose,
    setFlyMode: (enabled) => {
      state.flyMode = enabled;
      if (!enabled) {
        camera.position.y = state.walkHeight;
      }
    },
    setSpeed: (speed) => {
      state.speed = speed;
    },
    setLookSpeed: (speed) => {
      state.lookSpeed = speed;
    },
    setColliders: (colliders) => {
      colliderTargets.length = 0;
      colliderTargets.push(...colliders);
    },
    setColliderRadius: (radius) => {
      colliderRadius = radius;
    },
    setGyroEnabled,
    getState: () => ({ ...state })
  };
};
