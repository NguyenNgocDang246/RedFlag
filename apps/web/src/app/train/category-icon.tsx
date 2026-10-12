import {
  Briefcase,
  Building,
  Building2,
  Cloud,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  Landmark,
  Package,
  RadioTower,
  ShoppingBag,
  Tag,
  TrendingUp,
  Truck,
  Tv,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Icon per topic (CategoryCode). New topics without an icon → generic label. */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  BANK: Landmark,
  WALLET: Wallet,
  SHIP: Truck,
  GOV: Building2,
  JOB: Briefcase,
  BEC: Building,
  SUBSCR: Tv,
  SOCIAL: Users,
  ECOM: ShoppingBag,
  TELCO: RadioTower,
  UTIL: Zap,
  CUSTOMS: Package,
  LOAN: HandCoins,
  INVEST: TrendingUp,
  CHARITY: HeartHandshake,
  EDU: GraduationCap,
  ACC: Cloud,
};

export function CategoryIcon({ code, size = 18 }: { code: string; size?: number }) {
  const Icon = CATEGORY_ICON[code] ?? Tag;
  return <Icon size={size} aria-hidden />;
}
