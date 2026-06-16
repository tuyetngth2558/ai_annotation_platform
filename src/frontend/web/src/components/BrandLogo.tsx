type BrandLogoVariant = "sidebar" | "hero" | "compact";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
}

/** Logo chính thức: fe_ui/vsf.png → public/vsf.png */
const LOGO_SRC = "/vsf.png";

export default function BrandLogo({ variant = "sidebar", className = "" }: BrandLogoProps) {
  if (variant === "sidebar") {
    return (
      <div
        className={`app-shell-brand ${className}`}
        data-testid="brand-logo"
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={LOGO_SRC}
            alt="VinSmart Future"
            className="h-12 w-auto shrink-0 object-contain"
          />
          <div className="min-w-0">
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
