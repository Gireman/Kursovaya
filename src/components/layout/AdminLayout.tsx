import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export function AdminLayout() {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 max-w-[1280px] mx-auto w-full px-lg py-xl flex gap-xl flex-col lg:flex-row">
        <Sidebar />
        <main className="flex-1 flex flex-col gap-lg min-w-0">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
