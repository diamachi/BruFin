import React from 'react';
import {
  Utensils,
  ShoppingCart,
  Home,
  Zap,
  Car,
  Tv,
  Sparkles,
  HeartPulse,
  Gift,
  Plane,
  ShieldCheck,
  BadgePercent,
  MoreHorizontal,
  Briefcase,
  RefreshCw,
  TrendingUp,
  Award,
  CreditCard,
  Banknote,
  Smartphone,
  HelpCircle,
  Tag
} from 'lucide-react';

interface Props {
  name: string;
  className?: string;
  size?: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Utensils,
  ShoppingCart,
  Home,
  Zap,
  Car,
  Tv,
  Sparkles,
  HeartPulse,
  Gift,
  Plane,
  ShieldCheck,
  BadgePercent,
  MoreHorizontal,
  Briefcase,
  RefreshCw,
  TrendingUp,
  Award,
  CreditCard,
  Banknote,
  Smartphone,
  HelpCircle,
  Tag
};

export const CategoryIcon: React.FC<Props> = ({ name, className = 'w-5 h-5', size }) => {
  const IconComponent = ICON_MAP[name] || Tag;
  return <IconComponent className={className} size={size} />;
};
