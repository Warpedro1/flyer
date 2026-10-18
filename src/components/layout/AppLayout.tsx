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

import { useAppVersionCheck } from '../../hooks/useAppVersionCheck.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { useAccountGate } from '../../hooks/useAccountGate.ts';
import { markIntroSeen } from '../../services/flyerApi.ts';
import { isImmersivePath } from '../../utils/immersivePaths.ts';
import { ErrorBoundary } from '../errors/ErrorBoundary.tsx';
import { IntroTour } from '../intro/IntroTour.tsx';
import { WingHeartLogo } from './WingHeartLogo.tsx';

function SidebarLink({
  to,
  end,
  icon,
  label,
  badge,
  collapsed,
  avatarUrl,
  tour,
}: {
  to: string;
  end?: boolean;
  icon?: React.ReactNode;
  label: string;
  badge?: string;
  collapsed: boolean;
  avatarUrl?: string;
  /** Alvo da introdução (`data-tour`). */
  tour?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      data-tour={tour}
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
  tour,
}: {
  to: string;
  end?: boolean;
  icon?: React.ReactNode;
  label: string;
  avatarUrl?: string;
  /** Alvo da introdução (`data-tour`). */
  tour?: string;
}) {
  const match = useMatch({ path: to, end: end ?? false });
  const isActive = !!match;

  return (
    <NavLink
      to={to}
      end={end}
      data-tour={tour}
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
  const { user, session, loading, signOut } = useAuth();
  const { gate, intro } = useAccountGate(session?.access_token, user?.id);
  // Recarrega uma aba antiga quando volta ao ecrã depois de um deploy.
  useAppVersionCheck();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  // Introdução do 1.º login (Warpedro1/flyer#23), ou "Ver introdução de novo" no Perfil.
  const [introClosed, setIntroClosed] = useState(false);
  const replayIntro = (location.state as { replayIntro?: unknown } | null)?.replayIntro === true;
  const showIntro = gate === 'ok' && (replayIntro || (intro?.seen === false && !introClosed));

  const finishIntro = () => {
    setIntroClosed(true);
    // Uma falha ao gravar não volta a abrir o tour nesta sessão nem trava o app.
    if (!replayIntro) markIntroSeen().catch(() => undefined);
    // Quem ainda não fez o onboarding do chat vai fazê-lo; quem fez fica na descoberta.
    navigate(intro?.onboarded ? '/' : '/chat', { replace: true });
  };

  if (loading || (user && gate === 'checking')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
          role="status"
          aria-label="Carregando"
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (gate === 'needs_code') {
    return <Navigate to="/login/code" replace />;
  }
  if (gate === 'needs_signup_code') {
    return <Navigate to="/signup/code" replace />;
  }
  if (gate === 'needs_profile') {
    return <Navigate to="/complete-profile" replace />;
  }
  // O tour aponta os botões do Descobrir (mapa, criar, meus eventos): começa lá.
  if (showIntro && location.pathname !== '/') {
    return <Navigate to="/" replace state={location.state} />;
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
            tour="discover"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/events"
            icon={<Calendar />}
            label="Meus eventos"
            tour="my-events"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/notifications"
            icon={<Bell />}
            label="Notificações"
            tour="notifications"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/chat"
            icon={<MessageCircle />}
            label="Chat IA"
            tour="chat"
            collapsed={collapsed}
          />
          <SidebarLink
            to="/profile"
            avatarUrl={avatarUrl}
            label="Perfil"
            tour="profile"
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
              data-tour="notifications"
            >
              <Bell className="h-6 w-6" />
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-600" />
            </button>
          </header>
        )}

        <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth bg-gray-50/50">
          {/* Um erro numa página não leva a navegação; mudar de página limpa o erro. */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* A barra fica na coluna, logo abaixo do <main>, e não por cima dele: assim
            nunca acompanha o scroll nem tapa o fim do conteúdo. */}
        {!immersive && (
          <nav
            aria-label="Navegação principal"
            className="z-20 flex w-full shrink-0 items-center justify-around border-t border-gray-200 bg-white px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden"
          >
            <MobileNavButton
              to="/"
              end
              icon={<Compass className="h-6 w-6" />}
              label="Descobrir"
              tour="discover"
            />
            <MobileNavButton
              to="/chat"
              icon={<MessageCircle className="w-6 h-6" />}
              label="Chat IA"
              tour="chat"
            />
            <MobileNavButton
              to="/profile"
              avatarUrl={avatarUrl}
              label="Perfil"
              tour="profile"
            />
          </nav>
        )}
      </div>
      {showIntro && <IntroTour onFinish={finishIntro} />}
    </div>
  );
}
