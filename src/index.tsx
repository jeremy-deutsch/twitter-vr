import ReactDOM from "react-dom";
import React, { useEffect, useRef, useState } from "react";
import { VRCanvas, Hands, DefaultXRControllers, useXRFrame } from "@react-three/xr";
import "./styles.css";
import * as THREE from "three";
import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Material,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Ray,
  Raycaster,
  Sphere,
  SphereGeometry,
  SpriteMaterial,
  TextureLoader,
  Vector3,
} from "three";
import { Plane } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

const imageTexture = new TextureLoader().load("https://pbs.twimg.com/profile_images/709974198677069828/NeQa6N_M_400x400.jpg");

function _un(num: number) {
  return num * 0.1;
}

// "un" = "units"
function un(nums: number): number;
function un(nums: [number, number]): [number, number];
function un(nums: [number, number, number]): [number, number, number];
function un(nums: number | number[]) {
  if (typeof nums === "number") {
    return _un(nums);
  } else {
    return nums.map(_un);
  }
}

const slightlyForward = new Vector3(0, 0, 0.0001);

function useHandsReady() {
  const [ready, setReady] = useState(false);
  const { gl } = useThree();
  useEffect(() => {
    if (ready) return;
    const joint = (gl.xr as any).getHand(0).joints["index-finger-tip"];
    if (joint?.jointRadius !== undefined) return;
    const id = setInterval(() => {
      const joint = (gl.xr as any).getHand(0).joints["index-finger-tip"];
      if (joint?.jointRadius !== undefined) {
        setReady(true);
      }
    }, 500);
    return () => clearInterval(id);
  }, [gl, ready]);

  return ready;
}

function InsideCanvas() {
  const handsReady = useHandsReady();

  const raycasterRef = useRef<Raycaster>(null);
  const { gl } = useThree();

  const distanceRef = useRef(new Vector3(1, 0, 0));

  const lineRef = useRef<Line>(null);
  useEffect(() => {
    lineRef.current?.geometry.setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, 0)]);
  }, []);

  const planeRef = useRef<Mesh<PlaneGeometry>>(null);

  const pictureRef = useRef<Mesh>(null);

  useXRFrame(() => {
    if (handsReady && raycasterRef.current && planeRef.current) {
      const hand = gl.xr.getHand(0) as any;
      const indexTip: Mesh = hand.joints["index-finger-tip"];
      const indexKnuckle: Mesh = hand.joints["index-finger-metacarpal"];

      lineRef.current?.geometry.setFromPoints([indexKnuckle.position, indexTip.position]);

      const distance = distanceRef.current;
      distance.subVectors(indexTip.position, indexKnuckle.position);
      raycasterRef.current.far = distance.length();
      raycasterRef.current.set(indexKnuckle.position, distance.normalize());
      const [intersection] = raycasterRef.current.intersectObject(planeRef.current);
      if (intersection && pictureRef.current && pictureRef.current.parent) {
        pictureRef.current.position.addVectors(intersection.point, slightlyForward).sub(pictureRef.current.parent.position);
      }
    }
  });

  return (
    <>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <DefaultXRControllers />
      <Hands />
      <raycaster ref={raycasterRef} near={0} />
      <line ref={lineRef}>
        <lineBasicMaterial color={0xff0000} />
        <bufferGeometry />
      </line>
      {/* <mesh position={un([6, 8, 0])} ref={sphereRef}>
        <sphereGeometry args={[un(4), 32, 16]} />
        <meshBasicMaterial color={0xffff00} />
      </mesh> */}
      <Plane
        args={un([4, 4])}
        position={un([0, 8, 0])}
        ref={planeRef}
        // raycast={(_, [intersection]) => {
        //   if (intersection && pictureRef.current && pictureRef.current.parent) {
        //     pictureRef.current.position.addVectors(intersection.point, slightlyForward).sub(pictureRef.current.parent.position);
        //   }
        // }}
      >
        <Plane ref={pictureRef} position={un([-1, 1, 0.01])} args={un([1, 1])}>
          <meshLambertMaterial map={imageTexture} />
        </Plane>
      </Plane>
    </>
  );
}

// Oculus Browser with #webxr-hands flag enabled
function App() {
  return (
    <VRCanvas>
      <InsideCanvas />
    </VRCanvas>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
