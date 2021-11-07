import ReactDOM from "react-dom";
import { useEffect, useRef } from "react";
import { VRCanvas, Hands, DefaultXRControllers } from "@react-three/xr";
import "./styles.css";
import { Line, Mesh, PlaneGeometry, TextureLoader, Vector3 } from "three";
import { Circle, Plane, Text } from "@react-three/drei";
import { HandsReadyProvider } from "./HandsReady";
import useTouch from "./useTouch";

const imageTexture = new TextureLoader().load(
  "https://pbs.twimg.com/profile_images/709974198677069828/NeQa6N_M_400x400.jpg",
);

function _un(num: number) {
  return num * 0.1;
}

// "un" = "units"
function un(nums: number): number;
function un(nums: [number, number]): [number, number];
function un(nums: [number, number, number]): [number, number, number];
function un(
  nums: [number, number, number, number],
): [number, number, number, number];
function un(nums: number | number[]) {
  if (typeof nums === "number") {
    return _un(nums);
  } else {
    return nums.map(_un);
  }
}

const slightlyForward = new Vector3(0, 0, 0.0001);

interface TweetProps {
  displayName: string;
  handle: string;
}

function Tweet(props: TweetProps) {
  const position = useRef(new Vector3(0, 0.8, 0));

  return (
    <Plane position={position.current} args={un([3, 3])}>
      {/* profile image */}
      <Circle position={un([-1, 1, 0.001])} args={[un(0.3), 30]}>
        <meshLambertMaterial map={imageTexture} />
      </Circle>
      {/* display name */}
      <Text
        color="black"
        anchorX="left"
        position={un([-0.5, 1.1, 0.001])}
        fontSize={un(0.16)}
        clipRect={un([0, -1, 1.8, 1])}>
        {props.displayName}
      </Text>
      {/* handle */}
      <Text
        color="dimgray"
        anchorX="left"
        position={un([-0.5, 0.9, 0.001])}
        fontSize={un(0.14)}
        clipRect={un([0, -1, 1.8, 1])}>
        @{props.handle}
      </Text>
    </Plane>
  );
}

function InsideCanvas() {
  const lineRef = useRef<Line>(null);
  useEffect(() => {
    lineRef.current?.geometry.setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 0),
    ]);
  }, []);

  const planeRef = useRef<Mesh<PlaneGeometry>>(null);

  const pictureRef = useRef<Mesh<PlaneGeometry>>(null);

  useTouch(planeRef, {
    debugLineRef: lineRef,
    onTouchFrame(intersection) {
      if (pictureRef.current && pictureRef.current.parent) {
        pictureRef.current.position
          .addVectors(intersection.point, slightlyForward)
          .sub(pictureRef.current.parent.position);
      }
    },
  });

  return (
    <>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <DefaultXRControllers />
      <Hands />
      {/* @ts-ignore it thinks <line> is an svg line */}
      <line ref={lineRef}>
        <lineBasicMaterial color={0xff0000} />
        <bufferGeometry />
      </line>
      <Tweet displayName="Jeremy Deutsch" handle="@deutsch_jeremy" />
      {/* <Plane args={un([4, 4])} position={un([0, 8, 0])} ref={planeRef}>
        <Plane ref={pictureRef} position={un([-1, 1, 0.01])} args={un([1, 1])}>
          <meshLambertMaterial map={imageTexture} />
        </Plane>
      </Plane> */}
    </>
  );
}

// Oculus Browser with #webxr-hands flag enabled
function App() {
  return (
    <VRCanvas>
      <HandsReadyProvider>
        <InsideCanvas />
      </HandsReadyProvider>
    </VRCanvas>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
