import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Pill, FlaskConical, UtensilsCrossed, User } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'الرئيسية' },
  { path: '/medications', icon: Pill, label: 'أدويتي' },
  { path: '/lab-results', icon: FlaskConical, label: 'تحاليلي' },
  { path: '/nutrition', icon: UtensilsCrossed, label: 'تغذيتي' },
  { path: '/profile', icon: User, label: 'ملفي' },
];

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="pb-safe max-w-lg mx-auto">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-50">
        <div className="max-w-lg mx-auto flex justify-around items-center h-[70px] px-2">
          {tabs.map(tab => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center gap-1 touch-target p-2 rounded-xl transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
};

export default Layout;
