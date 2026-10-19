"use client";

import { useEffect } from "react";
import { upgradeLegacyAuth } from "@/lib/api";

/**
 * Upgrades credentials saved before PBKDF2 once, then reloads so pages that read
 * localStorage on mount pick up the new value.
 */
export default function AuthUpgrade() {
  useEffect(() => {
    if (localStorage.getItem("authVersion") || !localStorage.getItem("passwordHash")) return;
    upgradeLegacyAuth().then(() => window.location.reload());
  }, []);

  return null;
}
