import { useThree } from "@react-three/fiber";
import { useXRFrame } from "@react-three/xr";
import { RefObject, useState } from "react";
import { Mesh } from "three";
import { useHandsReady } from "./HandsReady";

export default function useThumbsUp(
  debugTextRef?: RefObject<Mesh & { text: string }>,
) {
  const handsReady = useHandsReady();
  const { gl } = useThree();

  const [isDoingThumbsUp, setIsDoingThumbsUp] = useState(false);

  useXRFrame(() => {
    if (handsReady) {
      const hand = gl.xr.getHand(0) as any;
      const indexTip: Mesh = hand.joints["index-finger-tip"];
      const indexMetacarpal: Mesh = hand.joints["index-finger-metacarpal"];

      const tipToMetacarpalDistance = indexTip.position.distanceTo(
        indexMetacarpal.position,
      );

      const isIndexFingerTucked = tipToMetacarpalDistance < 0.04;

      let didCheckThumb = false;

      let isThumbPointedUp = false;

      // we need to check this also, because a fist pointed up
      // technically matches both "index finger tucked" and "thumb
      // pointed up"
      let isThumbAwayFromHand = false;

      if (isIndexFingerTucked) {
        didCheckThumb = true;
        // to check if the thumb is pointed up, see if the tip of the
        // thumb is high above its knuckle (relative to their length)
        const thumbTip: Mesh = hand.joints["thumb-tip"];
        const thumbKnuckle: Mesh = hand.joints["thumb-phalanx-proximal"];
        const indexLowerJoint: Mesh =
          hand.joints["index-finger-phalanx-intermediate"];

        const thumbHeightAboveKnuckle =
          thumbTip.position.y - thumbKnuckle.position.y;

        const thumbTipToKnuckleDistance = thumbTip.position.distanceTo(
          thumbKnuckle.position,
        );

        isThumbPointedUp =
          thumbHeightAboveKnuckle > thumbTipToKnuckleDistance / 2;

        const thumbTipToIndexJointDistance = thumbTip.position.distanceTo(
          indexLowerJoint.position,
        );

        isThumbAwayFromHand =
          thumbTipToIndexJointDistance > thumbTipToKnuckleDistance / 2;
      }

      const isThumbsUp =
        isIndexFingerTucked && isThumbPointedUp && isThumbAwayFromHand;

      if (debugTextRef?.current) {
        debugTextRef.current.text =
          `Is index finger tucked? ${isIndexFingerTucked}\n` +
          `Is thumb pointed up? ${
            didCheckThumb ? isThumbPointedUp : "Didn't check"
          }\n` +
          `Is thumb away from hand? ${
            didCheckThumb ? isThumbAwayFromHand : "Didn't check"
          }\n` +
          `Is doing a thumbs up? ${isThumbsUp}`;
      }

      setIsDoingThumbsUp(isThumbsUp);
    }
  });

  return isDoingThumbsUp;
}
