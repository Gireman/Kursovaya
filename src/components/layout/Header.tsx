export function Header() {
  return (
    <header className="bg-surface border-b border-outline-variant">
      <div className="max-w-[1280px] mx-auto px-lg flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined font-bold">laptop</span>
          </div>
          <span className="text-2xl tracking-tight font-bold text-on-background">VERTEX</span>
        </div>
        <div className="flex items-center gap-sm">
          <div className="relative hidden sm:block">
            <input
              className="pl-10 pr-4 py-2 bg-surface-container rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface placeholder-on-surface-variant outline-none"
              placeholder="Поиск..."
              type="text"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
          </div>
          <button className="text-on-surface-variant hover:text-primary transition-colors p-2 active:opacity-80">
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </div>
    </header>
  );
}
