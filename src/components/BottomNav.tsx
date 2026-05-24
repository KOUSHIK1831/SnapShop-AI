import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  Store, 
  ShoppingBag, 
  User, 
  PlusCircle, 
  LayoutGrid, 
  ClipboardList, 
  BarChart3, 
  Settings,
  LayoutDashboard,
  Users,
  MessageSquare,
  Package,
  LucideIcon,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  tab?: string;
  primary?: boolean;
}

export default function BottomNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!user) return null;

  const role = user.role;
  const currentTab = searchParams.get('tab');

  const sellerItems: NavItem[] = [
    { icon: LayoutGrid, label: t('dashboard.tabs.products'), path: '/dashboard', tab: 'products' },
    { icon: Wrench, label: 'Manage', path: '/dashboard', tab: 'tools' },
    { icon: User, label: 'Profile', path: '/dashboard', tab: 'profile' },
  ];

  const buyerItems: NavItem[] = [
    { icon: Store, label: t("auto.shops"), path: '/buyer', tab: 'shops' },
    { icon: Package, label: t("auto.my_orders"), path: '/buyer', tab: 'orders' },
    { icon: User, label: 'Profile', path: '/buyer', tab: 'profile' },
  ];

  const adminItems: NavItem[] = [
    { icon: Store, label: 'Sellers', path: '/admin', tab: 'sellers' },
    { icon: LayoutDashboard, label: 'Verifications', path: '/admin', tab: 'verifications' },
    { icon: Users, label: 'Users', path: '/admin', tab: 'users' },
    { icon: MessageSquare, label: 'Feedback', path: '/admin', tab: 'feedback' },
  ];

  const items = role === 'seller' ? sellerItems : role === 'admin' ? adminItems : buyerItems;

  const handleNavigate = (item: NavItem) => {
    if (location.pathname === item.path) {
      if (item.tab) {
        setSearchParams({ tab: item.tab });
      }
    } else {
      const url = item.tab ? `${item.path}?tab=${item.tab}` : item.path;
      navigate(url);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border/50 px-2 py-1 pb-safe">
      <div className="flex items-center justify-around max-w-2xl mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path && (item.tab ? currentTab === item.tab || (!currentTab && item.tab === items[0].tab) : true);
          
          return (
            <button
              key={item.label}
              data-tour={item.tab}
              onClick={() => handleNavigate(item)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("size-5")} />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
