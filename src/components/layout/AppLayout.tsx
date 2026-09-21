import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  LogOut,
  MessageCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.ts';
import { isImmersivePath } from '../../utils/immersivePaths.ts';
import { WingHeartLogo } from './WingHeartLogo.tsx';

function SidebarLink({
  to,
  end,
  icon,
  label,
  badge,
  collapsed,
  avatarUrl,
}: {
  to: string;
  end?: boolean;
  icon?: React.ReactNode;
  label: string;
  badge?: string;
  collapsed: boolean;
  avatarUrl?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center w-full py-3 rounded-xl transition-colors font-medium ${
          collapsed ? 'justify-center px-0' : 'px-4 gap-3'
        } ${
          isActive
            ? 'bg-red-50 text-red-600'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200"
        />
      ) : (
        <span className="shrink-0 [&_svg]:w-5 [&_svg]:h-5">{icon}</span>
      )}
      {!collapsed && (
        <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
          {label}
        </span>
      )}
      {!collapsed && badge && (
        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

function MobileNavButton({
  to,
  end,
  icon,
  label,
  avatarUrl,
}: {
  to: string;
  end?: boolean;
  icon?: React.ReactNode;
  label: string;
  avatarUrl?: string;
}) {
  const match = useMatch({ path: to, end: end ?? false });
  const isActive = !!match;

  return (
    <NavLink
      to={to}
      end={end}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-1 ${
        isActive ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className={`h-7 w-7 rounded-full object-cover ring-2 ring-offset-2 ${
            isActive ? 'ring-red-600' : 'ring-transparent'
          }`}
        />
      ) : (
        <span className="[&_svg]:h-6 [&_svg]:w-6">{icon}</span>
      )}
      <span className="max-w-full truncate text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';

export default function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
          role="status"
          aria-label="A carregar"
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const immersive = isImmersivePath(location.pathname);
  const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? DEFAULT_AVATAR;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-gray-50 font-sans text-gray-900">
      {/* Desktop sidebar */}
      <aside
        className={`${
          collapsed ? 'w-24' : 'w-64'
        } relative z-20 hidden shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out md:flex`}
      >
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 z-30 rounded-full border border-gray-200 bg-white p-1 text-gray-400 shadow-sm transition-colors hover:text-red-600"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <div
          className={`flex items-center p-6 ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-500 p-2.5 shadow-lg shadow-red-200"
            aria-label="Ir para início"
          >
            <WingHeartLogo className="h-6 w-6 text-white" />
          </button>
          {!collapsed && (
            <h1 className="whitespace-nowrap text-2xl font-bold text-red-600 transition-opacity duration-300">
              Flyer
            </h1>
          )}
        </div>

        <nav className="mt-4 flex-1 space-y-2 px-4">
          <SidebarLink
            to="/"
            end
            icon={<Compass />}
            label="Descobrir"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/events"
            icon={<Calendar />}
            label="Meus eventos"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/notifications"
            icon={<Bell />}
            label="Notificações"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/chat"
            icon={<MessageCircle />}
            label="Chat IA"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/profile"
            avatarUrl={avatarUrl}
            label="Perfil"
            collapsed={collapsed}
          />
        </nav>

        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={() => void signOut()}
            className={`flex w-full items-center rounded-xl py-3 font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-4'
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {!immersive && (
          <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md sm:px-8 md:hidden">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-500">
                <WingHeartLogo className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-red-600">Flyer</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Notificações"
            >
              <Bell className="h-6 w-6" />
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-600" />
            </button>
          </header>
        )}

        <main
          className={`relative min-h-0 flex-1 overflow-y-auto scroll-smooth bg-gray-50/50 ${
            !immersive ? 'pb-24 md:pb-0' : ''
          }`}
        >
          <Outlet />
        </main>
      </div>

      {!immersive && (
        <nav className="absolute bottom-0 z-20 flex w-full items-center justify-around border-t border-gray-200 bg-white px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden">
          <MobileNavButton
            to="/"
            end
            icon={<Compass className="h-6 w-6" />}
            label="Descobrir"
          />
          <MobileNavButton
            to="/chat"
            icon={<MessageCircle className="w-6 h-6" />}
            label="Chat IA"
          />
          <MobileNavButton
            to="/profile"
            avatarUrl={avatarUrl}
            label="Perfil"
          />
        </nav>
      )}
    </div>
  );
}
