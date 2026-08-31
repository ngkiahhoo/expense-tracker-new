export type ClassValue =
  | string
  | false
  | null
  | undefined;

export function cn(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export type UiTone =
  | "neutral"
  | "info"
  | "accent"
  | "success"
  | "danger"
  | "warning"
  | "balance"
  | "needs"
  | "commitment"
  | "wants";

export const ui = {
  page: "app-background min-h-screen text-white",
  pagePadding: "px-4 pt-4 pb-28 sm:px-6 sm:pt-6 md:px-8",
  pageInner: "mx-auto w-full",
  text: {
    body: "text-white",
    muted: "text-zinc-400",
    faint: "text-zinc-500",
    subtle: "text-zinc-300",
    danger: "text-red-400",
    success: "text-emerald-400",
    info: "text-cyan-400",
    accent: "text-violet-400",
    balance: "text-sky-400",
    needs: "text-red-500",
    commitment: "text-amber-400",
    wants: "text-blue-500",
  },
  surface: {
    app: "app-background",
    panel: "glass-surface",
    panelSoft: "glass-surface",
    raised: "glass-surface",
    inset: "glass-surface-soft",
    input: "bg-black/50 backdrop-blur-xl",
    hover: "hover:bg-white/10",
  },
  border: {
    default: "border-zinc-800",
    strong: "border-zinc-700",
    hover: "hover:border-zinc-500",
    info: "border-cyan-500/30",
    accent: "border-violet-500/30",
    success: "border-emerald-500/30",
    danger: "border-red-500/30",
    warning: "border-amber-500/30",
    needs: "border-red-500/30",
    commitment: "border-amber-500/30",
    wants: "border-blue-500/30",
  },
  radius: {
    sm: "rounded-xl",
    md: "rounded-2xl",
    lg: "rounded-3xl",
    full: "rounded-full",
  },
  focus:
    "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
};

export const toneStyles: Record<
  UiTone,
  {
    text: string;
    border: string;
    surface: string;
    subtleSurface: string;
    chart: string;
  }
> = {
  neutral: {
    text: ui.text.muted,
    border: ui.border.default,
    surface: ui.surface.panel,
    subtleSurface: "bg-zinc-800 border-zinc-700",
    chart: "#a1a1aa",
  },
  info: {
    text: ui.text.info,
    border: ui.border.info,
    surface: ui.surface.panel,
    subtleSurface: "bg-cyan-500/10 border-cyan-500/30",
    chart: "#22d3ee",
  },
  accent: {
    text: ui.text.accent,
    border: ui.border.accent,
    surface: ui.surface.panel,
    subtleSurface: "bg-violet-500/10 border-violet-500/30",
    chart: "#a78bfa",
  },
  success: {
    text: ui.text.success,
    border: ui.border.success,
    surface: ui.surface.panel,
    subtleSurface: "bg-emerald-500/10 border-emerald-500/30",
    chart: "#34d399",
  },
  danger: {
    text: ui.text.danger,
    border: ui.border.danger,
    surface: ui.surface.panel,
    subtleSurface: "bg-red-500/10 border-red-500/30",
    chart: "#ef4444",
  },
  warning: {
    text: "text-amber-300",
    border: ui.border.warning,
    surface: ui.surface.panel,
    subtleSurface: "bg-amber-500/10 border-amber-500/30",
    chart: "#f59e0b",
  },
  balance: {
    text: ui.text.balance,
    border: ui.border.wants,
    surface: ui.surface.panel,
    subtleSurface: "bg-sky-500/10 border-sky-500/30",
    chart: "#38bdf8",
  },
  needs: {
    text: ui.text.needs,
    border: ui.border.needs,
    surface: ui.surface.panel,
    subtleSurface: "bg-red-500/10 border-red-500/30",
    chart: "#ef4444",
  },
  commitment: {
    text: ui.text.commitment,
    border: ui.border.commitment,
    surface: ui.surface.panel,
    subtleSurface: "bg-amber-500/10 border-amber-500/30",
    chart: "#f59e0b",
  },
  wants: {
    text: ui.text.wants,
    border: ui.border.wants,
    surface: ui.surface.panel,
    subtleSurface: "bg-blue-500/10 border-blue-500/30",
    chart: "#3b82f6",
  },
};

export const buttonStyles = {
  base: cn(
    "inline-flex shrink-0 items-center justify-center gap-2 font-bold transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    ui.focus
  ),
  variants: {
    primary: "bg-white text-black hover:bg-zinc-100",
    secondary: "bg-emerald-500 text-black hover:bg-emerald-400",
    ghost: cn(
      "border bg-zinc-900 text-zinc-300",
      ui.border.strong,
      ui.border.hover,
      ui.surface.hover
    ),
    danger: "bg-red-600 text-white hover:bg-red-500",
    outline: cn(
      "border bg-transparent text-zinc-300 hover:bg-zinc-900",
      ui.border.strong,
      ui.border.hover
    ),
    subtle: "bg-zinc-800 text-white hover:bg-zinc-700",
  },
  sizes: {
    sm: "rounded-xl px-3 py-2 text-sm",
    md: "rounded-2xl px-4 py-3 text-sm",
    lg: "rounded-2xl p-4 text-base",
    icon: "size-10 rounded-xl p-0",
    iconLg: "size-12 rounded-2xl p-0",
  },
};

export const cardStyles = {
  base: "border",
  variants: {
    default: cn(ui.radius.lg, ui.border.default, ui.surface.panel),
    panel: cn(ui.radius.lg, ui.border.default, ui.surface.panelSoft),
    raised: cn(ui.radius.lg, ui.border.default, ui.surface.raised, "shadow-2xl"),
    muted: cn(ui.radius.md, ui.border.default, ui.surface.inset),
    item: cn(ui.radius.md, "border-2", ui.border.strong, ui.surface.panel),
    inset: cn(ui.radius.md, ui.border.default, ui.surface.inset),
    info: cn(ui.radius.lg, toneStyles.info.border, toneStyles.info.surface),
    accent: cn(ui.radius.lg, toneStyles.accent.border, toneStyles.accent.surface),
    success: cn(ui.radius.lg, toneStyles.success.border, toneStyles.success.surface),
    danger: cn(ui.radius.lg, toneStyles.danger.border, toneStyles.danger.surface),
    warning: cn(ui.radius.lg, toneStyles.warning.border, toneStyles.warning.surface),
    balance: cn(ui.radius.lg, toneStyles.balance.border, toneStyles.balance.surface),
  },
  padding: {
    none: "p-0",
    sm: "p-3 sm:p-4",
    md: "p-5",
    lg: "p-5 sm:p-6",
  },
};

export const fieldStyles = {
  base: cn(
    "w-full min-w-0 rounded-2xl border border-white/10 bg-black/50 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl",
    "placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50",
    ui.focus
  ),
  sizes: {
    md: "px-4 py-3 text-sm",
    lg: "p-4 text-base",
  },
  textarea: "resize-none",
};

export const overlayStyles = {
  backdrop:
    "fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-md",
  bottomSheet:
    "fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 pb-4 backdrop-blur-md sm:px-6",
  modalPanel:
    "glass-surface w-full rounded-3xl border border-white/15 p-5 shadow-2xl",
  sheetPanel:
    "glass-surface w-full overflow-hidden rounded-t-3xl border border-white/15 shadow-2xl",
  stickyHeader:
    "sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-black/35 p-4 backdrop-blur-xl",
};

export const emptyStateStyles =
  "glass-surface-soft rounded-2xl border border-white/10 p-8 text-center";
