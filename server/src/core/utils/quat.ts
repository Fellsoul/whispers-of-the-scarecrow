// Quaternion and Euler utilities for server-side animation math
// Coordinate assumptions:
// - Euler order: XYZ (apply X then Y then Z), intrinsic rotations
// - Unit: degrees by default

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function normalizeQuat(q: Quat): Quat {
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

export function multiplyQuat(a: Quat, b: Quat): Quat {
  const ax = a[0],
    ay = a[1],
    az = a[2],
    aw = a[3];
  const bx = b[0],
    by = b[1],
    bz = b[2],
    bw = b[3];
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * Convert Euler angles to quaternion.
 * @param euler [x, y, z] rotations
 * @param order Rotation order, default 'XYZ'
 * @param unit 'deg' or 'rad', default 'deg'
 */
export function eulerToQuaternion(
  euler: Vec3,
  order: 'XYZ' | 'ZYX' = 'XYZ',
  unit: 'deg' | 'rad' = 'deg'
): Quat {
  const [exRaw, eyRaw, ezRaw] = euler;
  const ex = unit === 'deg' ? degreesToRadians(exRaw) : exRaw;
  const ey = unit === 'deg' ? degreesToRadians(eyRaw) : eyRaw;
  const ez = unit === 'deg' ? degreesToRadians(ezRaw) : ezRaw;

  // Half-angles
  const hx = ex * 0.5;
  const hy = ey * 0.5;
  const hz = ez * 0.5;

  // Individual axis quaternions (qx * qy * qz in given order)
  const sx = Math.sin(hx),
    cx = Math.cos(hx);
  const sy = Math.sin(hy),
    cy = Math.cos(hy);
  const sz = Math.sin(hz),
    cz = Math.cos(hz);

  let x: number, y: number, z: number, w: number;

  switch (order) {
    case 'XYZ':
      // q = qx * qy * qz
      x = sx * cy * cz + cx * sy * sz;
      y = cx * sy * cz - sx * cy * sz;
      z = cx * cy * sz + sx * sy * cz;
      w = cx * cy * cz - sx * sy * sz;
      break;
    case 'ZYX':
      // q = qz * qy * qx
      x = sx * cy * cz - cx * sy * sz;
      y = cx * sy * cz + sx * cy * sz;
      z = cx * cy * sz - sx * sy * cz;
      w = cx * cy * cz + sx * sy * sz;
      break;
    default:
      // Fallback to XYZ
      x = sx * cy * cz + cx * sy * sz;
      y = cx * sy * cz - sx * cy * sz;
      z = cx * cy * sz + sx * sy * cz;
      w = cx * cy * cz - sx * sy * sz;
      break;
  }

  return normalizeQuat([x, y, z, w]);
}
