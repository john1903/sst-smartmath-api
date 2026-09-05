import { useEffect } from "react";
import { userManager } from "../auth/userManager";

export function SilentCallback() {
  useEffect(() => {
    void userManager.signinSilentCallback();
  }, []);
  return null;
}
