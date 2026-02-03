import { Outlet, Link } from 'react-router-dom';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            HUMS
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/admin" className="text-sm hover:text-primary">
              Admin
            </Link>
            <Link to="/academic" className="text-sm hover:text-primary">
              Academic
            </Link>
            <Link to="/student" className="text-sm hover:text-primary">
              Student
            </Link>
            <Link to="/staff" className="text-sm hover:text-primary">
              Staff
            </Link>
            <Link to="/finance" className="text-sm hover:text-primary">
              Finance
            </Link>
            <Link to="/library" className="text-sm hover:text-primary">
              Library
            </Link>
          </nav>
        </div>
      </header>
      <main className="container py-8">
        <Outlet />
      </main>
    </div>
  );
}
