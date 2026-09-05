import { useEffect } from "react";
import { userManager } from "../auth/userManager";

// Rendered inside the hidden iframe oidc-client-ts opens for silent renew.
// Just hands the code back to the parent frame via signinSilentCallback.
export function SilentCallback() {
  useEffect(() => {
    void userManager.signinSilentCallback();
  }, []);
  return null;
}
