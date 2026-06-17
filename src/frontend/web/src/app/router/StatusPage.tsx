/** Trang 403 / 404 đơn giản. */
import { Link } from "react-router-dom";

function Status({ code, msg }: { code: string; msg: string }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="app-card p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{code}</h1>
        <p className="text-gray-500 mt-2">{msg}</p>
        <Link to="/login" className="btn-primary inline-block mt-4">Về đăng nhập</Link>
      </div>
    </div>
  );
}

export const ForbiddenPage = () => <Status code="403" msg="Bạn không có quyền truy cập trang này." />;
export const NotFoundPage = () => <Status code="404" msg="Không tìm thấy trang." />;
