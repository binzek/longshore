// Camera pose. The camera stands on the beach looking out to sea at an angle, and slides along
// the coast (x) as the player pans. Step 3 adds the drag and inertia; for now this just places it.
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { CAMERA } from './config';
import { shoreZ } from './coastShape';

const lookDirection = new Vector3();

/** Put the camera at position `x` along the coast, keeping the same distance from the waterline. */
export function placeCamera(camera: PerspectiveCamera, x: number): void {
  camera.position.set(x, CAMERA.height, shoreZ(x) + CAMERA.inland);

  const yaw = MathUtils.degToRad(CAMERA.yawDeg);
  const pitch = MathUtils.degToRad(CAMERA.pitchDeg);
  lookDirection.set(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  );
  camera.lookAt(
    camera.position.x + lookDirection.x,
    camera.position.y + lookDirection.y,
    camera.position.z + lookDirection.z,
  );
}
