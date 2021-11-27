import { useThree } from "@react-three/fiber";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const HandsReadyContext = createContext(false);

export function useHandsReady() {
  return useContext(HandsReadyContext);
}

export function HandsReadyProvider(props: { children: ReactNode }) {
  const handsReady = useGetHandsReady();
  return (
    <HandsReadyContext.Provider value={handsReady}>
      {props.children}
    </HandsReadyContext.Provider>
  );
}

function useGetHandsReady() {
  const [ready, setReady] = useState(false);
  const { gl } = useThree();
  useEffect(() => {
    if (ready) return;
    const joint = (gl.xr.getHand(0) as any).joints["index-finger-tip"];
    if (joint?.jointRadius !== undefined) return;
    const id = setInterval(() => {
      const joint = (gl.xr.getHand(0) as any).joints["index-finger-tip"];
      if (joint?.jointRadius !== undefined) {
        setReady(true);
      }
    }, 500);
    return () => clearInterval(id);
  }, [gl, ready]);

  return ready;
}
