// Turning a point the camera has projected (Three.js "normalised device coordinates") into a spot
// on the screen, as plain maths so it can be tested. In NDC, x and y run -1 to +1 across the view
// (y up) and z is below +1 for anything in front of the camera.

export interface ScreenPoint {
  /** Pixels from the left of the container. */
  x: number;
  /** Pixels from the top of the container. */
  y: number;
  /** In front of the camera and not further than `margin` px past an edge. */
  visible: boolean;
}

export function toScreen(
  ndcX: number,
  ndcY: number,
  ndcZ: number,
  width: number,
  height: number,
  margin: number,
): ScreenPoint {
  const x = (ndcX * 0.5 + 0.5) * width;
  const y = (-ndcY * 0.5 + 0.5) * height;
  const inFront = ndcZ < 1;
  const inside = x > -margin && x < width + margin && y > -margin && y < height + margin;
  return { x, y, visible: inFront && inside };
}
