'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ScrollText, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',           label: '홈',      icon: Home      },
  { href: '/community',  label: '커뮤니티', icon: Users     },
  { href: '/history',    label: '히스토리', icon: ScrollText },
  { href: '/profile',    label: '프로필',  icon: User      },
];

const HIDE_NAV = ['/login', '/onboarding', '/auth', '/onboarding/nickname'];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDE_NAV.some(p => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-[480px] rounded-2xl z-50"
      style={{
        background: 'rgba(10,10,12,0.92)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 transition-colors ${
                isActive ? 'text-white' : 'text-gray-600'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
