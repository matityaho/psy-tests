import { Navigation } from "./Navigation";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-semibold">PsychAssess</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <Navigation />
      </div>
    </aside>
  );
}
