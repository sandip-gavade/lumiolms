'use client';

import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Award, Bell, BookOpen, LogOut, Search, Settings, ShoppingCart, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { logout as apiLogout } from '@/lib/api/auth';
import { getCart } from '@/lib/api/cart';
import { listNotifications, markNotificationRead } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/auth-store';
import { initialsOf, relativeTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

const NOTIFICATION_LABELS: Record<string, string> = {
  QA_REPLY: 'Someone replied to your question',
  COURSE_ANNOUNCEMENT: 'New course announcement',
  SALE: 'A course you liked is on sale',
  RESUME_REMINDER: 'Pick up where you left off',
  CERTIFICATE_READY: 'Your certificate is ready',
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, refreshToken, clear } = useAuthStore();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: cart } = useQuery({ queryKey: queryKeys.cart, queryFn: getCart });
  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: listNotifications,
    refetchInterval: 60_000,
  });
  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Browse', href: '/catalog' },
    { label: 'My Learning', href: '/my-learning' },
  ];

  function isActive(href: string) {
    if (href === '/catalog') return pathname.startsWith('/catalog') || pathname.startsWith('/courses');
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    setMenuOpen(false);
    if (refreshToken) {
      try {
        await apiLogout(refreshToken);
      } catch {
        // best-effort — clear local session regardless
      }
    }
    clear();
    router.push('/login');
  }

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(search.trim())}`);
    }
  }

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/92 backdrop-blur-md border-b border-ink-200 flex items-center gap-4 md:gap-7 px-4 md:px-8 h-16">
      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-brand-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#fff" />
          </svg>
        </div>
        <span className="font-display font-extrabold text-xl tracking-tight text-ink-800">lumio</span>
      </Link>

      <nav className="hidden sm:flex items-center gap-0.5 flex-wrap">
        {navItems.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={clsx(
              'rounded-[9px] px-3.5 py-2 font-semibold text-[14.5px] whitespace-nowrap transition-colors',
              isActive(n.href) ? 'bg-brand-50 text-brand-600 font-bold' : 'text-ink-600 hover:bg-ink-100',
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="relative hidden md:flex items-center bg-ink-100 border border-ink-200 rounded-[10px] px-2.5 h-[38px] max-w-[240px] flex-1 min-w-0">
        <Search size={16} className="opacity-50 shrink-0 text-ink-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search courses"
          className="border-none bg-transparent outline-none text-sm ml-2 w-full min-w-0"
        />
      </div>

      <Link
        href="/cart"
        className="relative shrink-0 p-2 rounded-full hover:bg-ink-100 transition-colors"
        aria-label="Cart"
      >
        <ShoppingCart size={19} className="text-ink-600" />
        {!!cart?.items.length && (
          <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {cart.items.length}
          </span>
        )}
      </Link>

      <div className="relative shrink-0" ref={bellRef}>
        <button
          onClick={() => setBellOpen((v) => !v)}
          className="relative p-2 rounded-full hover:bg-ink-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={19} className="text-ink-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {bellOpen && (
          <div className="absolute top-[52px] right-0 w-80 bg-white border border-ink-200 rounded-2xl shadow-card-lg p-2 animate-fadeUp max-h-96 overflow-y-auto">
            <div className="px-2.5 py-2 font-display font-bold text-sm text-ink-800">Notifications</div>
            {!notifications?.length && (
              <div className="text-center text-sm text-ink-400 py-8">You&apos;re all caught up.</div>
            )}
            {notifications?.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.readAt) markNotificationRead(n.id).catch(() => {});
                }}
                className={clsx(
                  'w-full text-left flex flex-col gap-0.5 rounded-xl px-2.5 py-2.5 hover:bg-ink-50',
                  !n.readAt && 'bg-brand-50/60',
                )}
              >
                <span className="text-[13.5px] text-ink-800 leading-snug">
                  {NOTIFICATION_LABELS[n.type] ?? n.type}
                </span>
                <span className="text-xs text-ink-400">{relativeTime(n.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 bg-transparent border-none cursor-pointer pl-1 pr-1.5 py-1 rounded-full"
        >
          <div
            className="w-[34px] h-[34px] rounded-full text-white flex items-center justify-center font-bold text-sm font-display"
            style={{ background: '#4F46E5' }}
          >
            {initialsOf(user.name)}
          </div>
        </button>
        {menuOpen && (
          <div className="absolute top-[52px] right-0 w-[230px] bg-white border border-ink-200 rounded-2xl shadow-card-lg p-2 animate-fadeUp">
            <div className="flex items-center gap-2.5 px-2.5 pt-2.5 pb-3">
              <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold font-display bg-brand-600">
                {initialsOf(user.name)}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-ink-800 truncate">{user.name}</div>
                <div className="text-xs text-ink-500 truncate">{user.email}</div>
              </div>
            </div>
            <div className="h-px bg-ink-100 my-1" />
            <MenuLink href="/profile" icon={<User size={15} />} label="Profile" onClick={() => setMenuOpen(false)} />
            <MenuLink
              href="/my-learning"
              icon={<BookOpen size={15} />}
              label="My Learning"
              onClick={() => setMenuOpen(false)}
            />
            <MenuLink
              href="/certificates"
              icon={<Award size={15} />}
              label="Certificates"
              onClick={() => setMenuOpen(false)}
            />
            <MenuLink
              href="/orders"
              icon={<Settings size={15} />}
              label="Order history"
              onClick={() => setMenuOpen(false)}
            />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 bg-transparent border-none rounded-[9px] px-2.5 py-2.5 text-sm font-semibold text-danger-dark cursor-pointer text-left hover:bg-danger-light"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-sm font-semibold text-ink-700 cursor-pointer text-left hover:bg-ink-100"
    >
      {icon}
      {label}
    </Link>
  );
}
