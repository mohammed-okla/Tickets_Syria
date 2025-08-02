import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Wallet,
  QrCode,
  History,
  Calendar,
  Ticket,
  Car,
  TrendingUp,
  Store,
  Settings,
  User,
  LogOut,
  Menu,
  Bell,
  Globe,
  ChevronRight,
  Zap,
  Shield,
  Users,
  BarChart3,
  Megaphone,
  MessageCircle,
  CreditCard
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import NotificationBell from '@/components/common/NotificationBell'
import { UserRole } from '@/lib/supabase'

interface NavigationItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  roles: UserRole[]
}

const navigationItems: NavigationItem[] = [
  {
    label: 'nav.dashboard',
    href: '',
    icon: LayoutDashboard,
    roles: ['passenger', 'driver', 'merchant', 'event_admin', 'admin']
  },
  {
    label: 'nav.wallet',
    href: 'wallet',
    icon: Wallet,
    roles: ['passenger', 'driver', 'merchant', 'event_admin']
  },
  {
    label: 'nav.scanner',
    href: 'scanner',
    icon: QrCode,
    roles: ['passenger']
  },
  {
    label: 'nav.transactions',
    href: 'transactions',
    icon: History,
    roles: ['passenger', 'driver', 'merchant', 'event_admin', 'admin']
  },
  {
    label: 'nav.events',
    href: 'events',
    icon: Calendar,
    roles: ['passenger', 'event_admin']
  },
  {
    label: 'nav.tickets',
    href: 'tickets',
    icon: Ticket,
    roles: ['passenger']
  },
  {
    label: 'nav.earnings',
    href: 'earnings',
    icon: TrendingUp,
    roles: ['driver']
  },
  {
    label: 'nav.trips',
    href: 'trips',
    icon: Car,
    roles: ['driver']
  },
  {
    label: 'nav.verification',
    href: 'verification',
    icon: Shield,
    roles: ['driver']
  },
  {
    label: 'nav.qrcode',
    href: 'qr-generator',
    icon: QrCode,
    roles: ['driver', 'merchant']
  },
  {
    label: 'nav.business',
    href: 'business',
    icon: Store,
    roles: ['merchant']
  },
  {
    label: 'nav.management',
    href: 'management',
    icon: Calendar,
    roles: ['event_admin']
  },
  {
    label: 'nav.withdrawal',
    href: 'withdrawal',
    icon: CreditCard,
    roles: ['merchant', 'event_admin']
  },
  {
    label: 'nav.analytics',
    href: 'analytics',
    icon: BarChart3,
    roles: ['admin']
  },
  {
    label: 'nav.users',
    href: 'users',
    icon: Users,
    roles: ['admin']
  },
  {
    label: 'nav.disputes',
    href: 'disputes',
    icon: Shield,
    roles: ['admin']
  },
  {
    label: 'nav.verificationReview',
    href: 'verification-review',
    icon: Shield,
    roles: ['admin']
  },
  {
    label: 'nav.notifications',
    href: 'notifications',
    icon: Bell,
    roles: ['passenger', 'driver', 'merchant', 'event_admin', 'admin']
  },
  {
    label: 'nav.chat',
    href: 'chat',
    icon: MessageCircle,
    roles: ['passenger', 'driver', 'merchant', 'event_admin']
  },
  {
    label: 'nav.chatManagement',
    href: 'chat-management',
    icon: MessageCircle,
    roles: ['admin']
  },
  {
    label: 'nav.broadcast',
    href: 'broadcast',
    icon: Megaphone,
    roles: ['admin']
  }
]

interface DashboardLayoutProps {
  children: React.ReactNode
  userType: UserRole
}

export default function DashboardLayout({ children, userType }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const { t, language, setLanguage, isRTL } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()

  const filteredNavigation = navigationItems.filter(item => 
    item.roles.includes(userType)
  )

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const getUserBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'passenger': return 'bg-blue-500'
      case 'driver': return 'bg-green-500'
      case 'merchant': return 'bg-purple-500'
      case 'event_admin': return 'bg-orange-500'
      case 'admin': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <Ticket className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold text-primary">{t('app.name')}</h1>
      </div>

      {/* User Info */}
      <div className="border-b p-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
            <AvatarFallback>
              {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{profile?.full_name}</p>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`text-xs text-white ${getUserBadgeColor(userType)}`}
              >
                {t(`auth.${userType}`)}
              </Badge>
              {profile?.is_verified && (
                <Zap className="h-3 w-3 text-yellow-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === `/${userType}/${item.href}` || 
                          (item.href === '' && location.pathname === `/${userType}`)
          
          return (
            <Link
              key={item.href}
              to={`/${userType}/${item.href}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{t(item.label)}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )
        })}
      </nav>

      <Separator />
      
      {/* Bottom Navigation */}
      <div className="space-y-1 p-3">
        <Link
          to={`/${userType}/profile`}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <User className="h-5 w-5" />
          <span>{t('nav.profile')}</span>
        </Link>
        
        <Link
          to={`/${userType}/settings`}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <Settings className="h-5 w-5" />
          <span>{t('nav.settings')}</span>
        </Link>
      </div>
    </div>
  )

  return (
    <div className={`flex h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:border-r">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side={isRTL ? "right" : "left"} className="w-72 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            >
              <Globe className="h-4 w-4 mr-2" />
              {language === 'en' ? 'العربية' : 'English'}
            </Button>

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback>
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`/${userType}/profile`}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('nav.profile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/${userType}/settings`}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('nav.settings')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('auth.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}