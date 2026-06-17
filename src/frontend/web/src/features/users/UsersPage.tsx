/** UsersPage (ADMIN) — list + tạo user. Nối GET/POST /users. */
import { useCallback, useEffect, useState } from "react";
import UsersView from "@/components/UsersView";
import { fetchUsers } from "@/api/adapters";
import { useToast } from "@/app/providers/ToastProvider";
import type { UserAccount } from "@/types";

export function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserAccount[]>([]);

  const reload = useCallback(() => {
    fetchUsers().then(setUsers).catch((e) => showToast(e?.message ?? "Không tải được user."));
  }, [showToast]);

  useEffect(() => { reload(); }, [reload]);

  return <UsersView users={users} showToast={showToast} onUserCreated={reload} />;
}
