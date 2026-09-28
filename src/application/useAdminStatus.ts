import { useEffect, useState } from "react";

import { checkIsAdmin } from "@/infrastructure/tauri/commands";
import { ADMIN_STATUS_CACHE_KEY } from "@/infrastructure/storage/keys";
import { readString, writeString } from "@/infrastructure/storage/local-storage";

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(() => readString(ADMIN_STATUS_CACHE_KEY) === "true");

  useEffect(() => {
    checkIsAdmin()
      .then((value) => {
        setIsAdmin(value);
        writeString(ADMIN_STATUS_CACHE_KEY, String(value));
      })
      .catch(() => {
        setIsAdmin(false);
        writeString(ADMIN_STATUS_CACHE_KEY, "false");
      });
  }, []);

  return isAdmin;
}
