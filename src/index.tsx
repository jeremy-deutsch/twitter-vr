import ReactDOM from "react-dom";
import { useEffect, useRef, useState } from "react";
import { VRCanvas, Hands, DefaultXRControllers } from "@react-three/xr";
import "./styles.css";
import { Line, Mesh, PlaneGeometry, TextureLoader, Vector3 } from "three";
import { Circle, Plane, Text } from "@react-three/drei";
import { HandsReadyProvider } from "./HandsReady";
// @ts-expect-error no types in this library yet
import { getCaretAtPoint } from "troika-three-text";
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
  body: string;
}

const tweetBodyHeight = 1.8;

function Tweet(props: TweetProps) {
  const position = useRef(new Vector3(0, 0.8, -0.4));

  const [{ lastCheckedBody, endPosition }, setBodyCheck] = useState<{
    lastCheckedBody: string | null;
    endPosition: number;
  }>({ lastCheckedBody: null, endPosition: Infinity });

  const isBodyTooLong =
    props.body === lastCheckedBody && props.body.length > endPosition;

  let bodyText: string;
  if (isBodyTooLong) {
    bodyText = props.body.substring(0, endPosition).trimEnd();
  } else {
    bodyText = props.body;
  }

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
      {/* body */}
      <Text
        color="black"
        anchorX="left"
        anchorY="top"
        position={un([-1.3, 0.6, 0.001])}
        fontSize={un(0.16)}
        whiteSpace="overflowWrap"
        maxWidth={un(2.6)}
        clipRect={un([0, -tweetBodyHeight, 2.6, 0])}
        onSync={(
          troikaText: Mesh & { textRenderInfo: { lineHeight: number } },
        ) => {
          if (props.body !== lastCheckedBody) {
            try {
              // get the charIndex in the last fully-rendered row to know where to show a "..."
              const caret: { charIndex: number; y: number } = getCaretAtPoint(
                troikaText.textRenderInfo,
                un(0),
                un(-tweetBodyHeight),
              );
              console.log(caret);
              if (
                caret.y - troikaText.textRenderInfo.lineHeight <
                un(-tweetBodyHeight)
              ) {
                setBodyCheck({
                  lastCheckedBody: props.body,
                  endPosition: caret.charIndex,
                });
              } else {
                setBodyCheck({
                  lastCheckedBody: props.body,
                  endPosition: Infinity,
                });
              }
            } catch (e) {
              // getCaretAtPoint throws an error if it doesn't find anything
              setBodyCheck({
                lastCheckedBody: props.body,
                endPosition: Infinity,
              });
            }
          }
        }}>
        {bodyText}
      </Text>
      {isBodyTooLong && (
        <Text
          color="black"
          anchorX="left"
          position={un([-1.3, -1.2, 0.001])}
          fontSize={un(0.3)}>
          ...
        </Text>
      )}
    </Plane>
  );
}

const tweetBody = `(Star wars) Bingo Balaak'tu has stolen the bactu crystals,

(Me) *booing*

(Dune) Adam and Fahoud must come to blows;as spice floweth in the Sha-kareen, mashala. \
Blah blah blah let's make this really long with short words

(Me) Yes, yes!`;

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
      <Tweet
        displayName="Jeremy Deutsch"
        handle="deutsch_jeremy"
        body={tweetBody}
      />
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
