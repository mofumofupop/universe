import { useEffect, useState } from "react";
import { getAuthFromStorage } from "./api";

export function useIsLoggedIn(): boolean | undefined {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const check = () => {
      const { userId, passwordHash } = getAuthFromStorage();
      setIsLoggedIn(!!(userId && passwordHash));
    };

    check();

    // 認証情報が更新されたら再チェック（同一タブではカスタムイベントを使用）
    window.addEventListener("auth:changed", check);
    window.addEventListener("storage", check);

    return () => {
      window.removeEventListener("auth:changed", check);
      window.removeEventListener("storage", check);
    };
  }, []);

  return isLoggedIn;
}
