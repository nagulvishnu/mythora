import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

/** Fill an InstancedMesh once (and on deps change). `fill` returns true if it set `color`. */
export function useInstances(count: number, fill: (i: number, o: THREE.Object3D, c: THREE.Color) => boolean | void, deps: unknown[]) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      o.quaternion.identity();
      const hasColor = fill(i, o, c);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (hasColor) m.setColorAt(i, c);
    }
    m.count = count;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    m.computeBoundingBox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
