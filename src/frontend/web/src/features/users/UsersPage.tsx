/** UsersPage (ADMIN) — list + tạo user, phân trang 10. Nối GET/POST /users. */
import { useCallback, useEffect, useState } from "react";
import UsersView from "@/components/UsersView";
import { Pagination } from "@/shared/Pagination";
import { fetchUsersPaged } from "@/api/adapters";
import { useToast } from "@/app/providers/ToastProvider";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import type { UserAccount } from "@/types";

const PAGE = 10;

export function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  usePageHeader({
    title: "Thành viên",
    description: "Quản lý tài khoản & vai trò (RBAC) — tạo annotator/QA/admin.",
  });

  const reload = useCallback(() => {
    setLoading(true);
    fetchUsersPaged(PAGE, offset)
      .then((p) => { setUsers(p.items); setHasMore(p.hasMore); })
      .catch((e) => showToast(e?.message ?? "Không tải được user."))
      .finally(() => setLoading(false));
  }, [offset, showToast]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <div className="space-y-3">
      <UsersView users={users} loading={loading} showToast={showToast} onUserCreated={() => { setOffset(0); reload(); }} />
      {!loading && (
        <div className="app-card p-0">
          <Pagination offset={offset} limit={PAGE} hasMore={hasMore} onChange={setOffset} />
        </div>
      )}
    </div>
  );
}
