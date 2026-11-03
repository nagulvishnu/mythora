import { QUALITY } from "./quality";
import { useStore } from "../store/useStore";

export function useQ() {
  const q = useStore((s) => s.quality);
  return QUALITY[q];
}
