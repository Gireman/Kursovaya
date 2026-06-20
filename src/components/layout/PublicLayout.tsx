import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export function PublicLayout() {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-grow max-w-container-max mx-auto px-lg w-full py-xl space-y-xl">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
