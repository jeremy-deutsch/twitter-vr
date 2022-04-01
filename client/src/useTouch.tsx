import { useThree } from "@react-three/fiber";
import { useXRFrame } from "@react-three/xr";
import { useRef } from "react";
import { Intersection, Line, Mesh, Raycaster, Vector3 } from "three";
import { useHandsReady } from "./HandsReady";

interface TouchArgs<T extends Mesh> {
  onTouchStart?: (intersection: Intersection<T>) => void;
  onTouchEnd?: (intersection: Intersection<T>) => void;
  onTouchFrame?: (
    intersection: Intersection<T>,
    dt: DOMHighResTimeStamp,
  ) => void;
  debugLineRef?: React.RefObject<Line | null>;
}

export default function useTouch<T extends Mesh>(
  meshRef: React.RefObject<T | null>,
  args: TouchArgs<T>,
) {
  const handsReady = useHandsReady();
  const raycasterRef = useRef(new Raycaster());
  const distanceRef = useRef(new Vector3(1, 0, 0));
  const { gl } = useThree();

  const wasTouchingRef = useRef(false);
  const lastIntersectionRef = useRef<Intersection<T>>();
  const lastTimeRef = useRef(0);

  useXRFrame((time) => {
    if (handsReady) {
      const hand = gl.xr.getHand(0) as any;
      const indexTip: Mesh = hand.joints["index-finger-tip"];
      const indexMetacarpal: Mesh = hand.joints["index-finger-metacarpal"];

      args.debugLineRef?.current?.geometry.setFromPoints([
        indexMetacarpal.position,
        indexTip.position,
      ]);

      if (raycasterRef.current && meshRef.current) {
        const distance = distanceRef.current;
        distance.subVectors(indexTip.position, indexMetacarpal.position);
        raycasterRef.current.far = distance.length();
        raycasterRef.current.set(
          indexMetacarpal.position,
          distance.normalize(),
        );
        const [intersection]: Intersection<T>[] =
          raycasterRef.current.intersectObject(meshRef.current);
        if (intersection) {
          if (!wasTouchingRef.current) {
            wasTouchingRef.current = true;
            lastIntersectionRef.current = intersection;
            args.onTouchStart?.(intersection);
          } else {
            const dt = time - lastTimeRef.current;
            args.onTouchFrame?.(intersection, dt);
          }
        } else if (wasTouchingRef.current && lastIntersectionRef.current) {
          wasTouchingRef.current = false;
          args.onTouchEnd?.(lastIntersectionRef.current);
        }
      }
    }
    lastTimeRef.current = time;
  });
}
