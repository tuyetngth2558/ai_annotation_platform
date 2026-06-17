type BrandLogoVariant = "sidebar" | "hero" | "compact";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  /** Sidebar thu gọn: chỉ hiện logo, ẩn text. */
  collapsed?: boolean;
}

/** Logo chính thức: fe_ui/vsf.png → public/vsf.png */
const LOGO_SRC = "/vsf.png";

export default function BrandLogo({ variant = "sidebar", className = "", collapsed = false }: BrandLogoProps) {
  if (variant === "sidebar") {
    return (
      <div
        className={`app-shell-brand !px-4 ${className}`}
        data-testid="brand-logo"
      >
        {/* Logo cố định kích thước + vị trí (luôn căn trái, cùng padding) → thu/mở không nhảy chỗ. */}
        <div className="flex items-center min-w-0 gap-3">
          <img
            src={LOGO_SRC}
            alt="VinSmart Future"
            className="h-10 w-auto shrink-0 object-contain"
          />
          {/* Chữ luôn render; khi thu thì ẩn + thu width về 0. Khi mở: fade-in có delay
              (đợi sidebar giãn xong ~0.2s mới hiện) → không bị bóp méo lúc đang giãn. */}
          <div
            className={`min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 ${
              collapsed
                ? "opacity-0 w-0"
                : "opacity-100 w-auto delay-150"
            }`}
          >
            <p className="text-[15px] font-bold tracking-tight text-slate-900 leading-tight">
              Annotation Hub
            </p>
            <p className="text-[11px] font-medium text-slate-500 leading-tight mt-1">
              VSF quality workspace
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={className} data-testid="brand-logo">
        <img
          src={LOGO_SRC}
          alt="VinSmart Future"
          className="h-16 xl:h-[4.5rem] w-auto max-w-[280px] object-contain object-left"
        />
      </div>
    );
  }

  return (
    <div className={className} data-testid="brand-logo">
      <img
        src={LOGO_SRC}
        alt="VinSmart Future"
        className="h-12 w-auto max-w-[220px] object-contain"
      />
    </div>
  );
}
