import ReactDOM from "react-dom";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  VRCanvas,
  Hands,
  DefaultXRControllers,
  useXRFrame,
} from "@react-three/xr";
import "./styles.css";
import {
  Euler,
  Group,
  Line,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  TextureLoader,
  Vector3,
} from "three";
import { Circle, Plane, Text } from "@react-three/drei";
import { HandsReadyProvider } from "./HandsReady";
// @ts-expect-error no types in this library yet
import { getCaretAtPoint } from "troika-three-text";
import useTouch from "./useTouch";
import { useTwitterSearch } from "./twitterApi";
import { QueryClient, QueryClientProvider } from "react-query";

const queryClient = new QueryClient();

/*
NEXT:
- finish loading tweets from Twitter (fix CORS errors)

LATER:
- when a tweet wraps around, replace its content with the
  next/previous one
- (maybe, and maybe with help) make wrapping look pretty
- create a component for showing a big tweet in front of you,
  including any images in the tweet
- get the scroll plane to recognize left/right vs. up/down gestures
- use an "up" gesture to put a tweet in the big place
- animate the above gesture, as well as the transition from small
  to big tweet
*/

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

const numTweetsInRow = 5;
const tweetCardWidth = un(3);

const rowWidth = numTweetsInRow * tweetCardWidth;

// make the wrap a little further than the row width, so that items
// can't immediately wrap back and forth
const wrapThreshold = rowWidth / 2 + tweetCardWidth / 4;

interface TweetProps {
  objectIndex: number;
  displayName: string;
  handle: string;
  body: string;
}

// TODO: tweets should be a bit taller, so you can swipe the bottom
// of them while looking at the top
const tweetBodyHeight = 1.8;

function Tweet(props: TweetProps) {
  const [{ lastCheckedBody, endPosition }, setBodyCheck] = useState<{
    lastCheckedBody: string | null;
    endPosition: number;
  }>({ lastCheckedBody: null, endPosition: Infinity });

  // the number of times the tweet has wrapped around the left side
  const [numWraps, setNumWraps] = useState(0);

  const twitterSearchResult = useTwitterSearch("garfield");

  let displayName: string, handle: string, body: string;
  let hidden = false;
  if (twitterSearchResult.status === "error") {
    displayName = "Error!";
    handle = "error";
    body = String(twitterSearchResult.error);
  } else if (twitterSearchResult.status !== "success") {
    displayName = "Loading...";
    handle = "Loading";
    body = "Loading...";
  } else {
    const tweetIndex = props.objectIndex + numWraps * numTweetsInRow;
    const tweet = twitterSearchResult.data.data[tweetIndex];
    if (tweet) {
      const user = twitterSearchResult.data.includes.users.find(
        (usr) => usr.id === tweet.author_id,
      );
      displayName = user?.name ?? "User not found";
      handle = user?.username ?? "user_not_found";
      body = tweet.text;
    } else {
      displayName = "";
      handle = "";
      body = "";
      hidden = true;
    }
  }

  const isBodyTooLong = body === lastCheckedBody && body.length > endPosition;

  let bodyText: string;
  if (isBodyTooLong) {
    bodyText = body.substring(0, endPosition).trimEnd();
  } else {
    bodyText = body;
  }

  const cardRef = useRef<Mesh<PlaneGeometry>>(null);

  const ownPosition = props.objectIndex * tweetCardWidth + numWraps * rowWidth;

  useXRFrame(() => {
    if (cardRef.current?.parent) {
      const relativePosition = cardRef.current.parent.position.x + ownPosition;
      if (relativePosition > wrapThreshold) {
        setNumWraps(numWraps - 1);
      } else if (relativePosition < -wrapThreshold) {
        setNumWraps(numWraps + 1);
      }
    }
  });

  return (
    <Plane
      ref={cardRef}
      visible={numWraps >= 0 && !hidden}
      position={[ownPosition, 0, 0]}
      args={[tweetCardWidth, un(3)]}>
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
        {displayName}
      </Text>
      {/* handle */}
      <Text
        color="dimgray"
        anchorX="left"
        position={un([-0.5, 0.9, 0.001])}
        fontSize={un(0.14)}
        clipRect={un([0, -1, 1.8, 1])}>
        @{handle}
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
          if (body !== lastCheckedBody) {
            try {
              // get the charIndex in the last fully-rendered row to know where to show a "..."
              const caret: { charIndex: number; y: number } = getCaretAtPoint(
                troikaText.textRenderInfo,
                0,
                un(-tweetBodyHeight),
              );
              if (
                caret.y - troikaText.textRenderInfo.lineHeight <
                un(-tweetBodyHeight)
              ) {
                setBodyCheck({
                  lastCheckedBody: body,
                  endPosition: caret.charIndex,
                });
              } else {
                setBodyCheck({
                  lastCheckedBody: body,
                  endPosition: Infinity,
                });
              }
            } catch (e) {
              // getCaretAtPoint throws an error if it doesn't find anything
              setBodyCheck({
                lastCheckedBody: body,
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

  const groupRef = useRef<Group>(null);

  const isDraggingRef = useRef(false);
  const touchStartPoint = useRef(0);
  const touchStartGroupPosition = useRef(0);
  const velocity = useRef(0);

  useTouch(planeRef, {
    debugLineRef: lineRef,
    onTouchStart(intersection) {
      isDraggingRef.current = true;
      touchStartPoint.current = intersection.point.x;
      touchStartGroupPosition.current = groupRef.current?.position.x ?? 0;
    },
    onTouchFrame(intersection, dt) {
      if (groupRef.current) {
        const groupPosition = groupRef.current.position;
        const prevDragAmount = groupPosition.x;
        groupPosition.setX(
          touchStartGroupPosition.current +
            intersection.point.x -
            touchStartPoint.current,
        );
        velocity.current = (groupPosition.x - prevDragAmount) / dt;
      }
    },
    onTouchEnd() {
      isDraggingRef.current = false;
    },
  });

  const debugTextRef = useRef(null);

  const momentumScrollLastTime = useRef(0);

  useXRFrame((time) => {
    if (!isDraggingRef.current && groupRef.current) {
      const groupPosition = groupRef.current.position;
      let amountToMoveBy = 0;
      if (groupPosition.x > 0) {
        // snap back to zero
        if (groupPosition.x < 0.00001) {
          groupPosition.x = 0;
          velocity.current = 0;
        } else {
          const dt = time - momentumScrollLastTime.current;
          amountToMoveBy -= groupPosition.x * 0.01 * dt;
        }
      }
      if (velocity.current !== 0) {
        // momentum scroll
        const dt = time - momentumScrollLastTime.current;
        amountToMoveBy += velocity.current * dt;
        // groupPosition.setX(amountToMoveBy + groupPosition.x);

        // decelerate
        const prevSign = Math.sign(velocity.current);
        velocity.current -= velocity.current * 0.0027 * dt;
        if (
          Math.abs(velocity.current) < 0.00001 ||
          Math.sign(velocity.current) !== prevSign
        ) {
          velocity.current = 0;
        }
      }

      if (amountToMoveBy !== 0) {
        groupPosition.setX(amountToMoveBy + groupPosition.x);
      }
    }

    // momentum scroll
    // if (!isDraggingRef.current && groupRef.current && velocity.current) {
    //   const groupPosition = groupRef.current.position;
    //   const dt = time - momentumScrollLastTime.current;
    //   const amountToMoveBy = velocity.current * dt;
    //   groupPosition.setX(amountToMoveBy + groupPosition.x);

    //   // decelerate
    //   const prevSign = Math.sign(velocity.current);
    //   velocity.current -= velocity.current * 0.0027 * dt;
    //   if (
    //     Math.abs(velocity.current) < 0.00001 ||
    //     Math.sign(velocity.current) !== prevSign
    //   ) {
    //     velocity.current = 0;
    //   }
    // }
    momentumScrollLastTime.current = time;
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
      {/* <Plane args={un([3, 3])} position={[0, 1.5, -0.6]}>
        <Text
          ref={debugTextRef}
          color="black"
          fontSize={un(0.16)}
          position={[0, 0, 0.001]}>
          Debug Text Goes Here
        </Text>
      </Plane> */}
      <Plane
        args={[rowWidth, un(3)]}
        ref={planeRef}
        position={[0, 1.1, -0.4]}
        rotation={new Euler(-Math.PI / 5)}>
        <group ref={groupRef} position={[0, 0, 0]}>
          <Tweet
            objectIndex={0}
            displayName="Jeremy Deutsch"
            handle="deutsch_jeremy"
            body={tweetBody}
          />
          <Tweet
            objectIndex={1}
            displayName="Jeremy Deutsch"
            handle="deutsch_jeremy"
            body={tweetBody}
          />
          <Tweet
            objectIndex={2}
            displayName="Jeremy Deutsch"
            handle="deutsch_jeremy"
            body={tweetBody}
          />
          <Tweet
            objectIndex={3}
            displayName="Jeremy Deutsch"
            handle="deutsch_jeremy"
            body={tweetBody}
          />
          <Tweet
            objectIndex={4}
            displayName="Jeremy Deutsch"
            handle="deutsch_jeremy"
            body={tweetBody}
          />
        </group>
      </Plane>
    </>
  );
}

// Oculus Browser with #webxr-hands flag enabled
function App() {
  return (
    <VRCanvas>
      <QueryClientProvider client={queryClient}>
        <HandsReadyProvider>
          <InsideCanvas />
        </HandsReadyProvider>
      </QueryClientProvider>
    </VRCanvas>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
