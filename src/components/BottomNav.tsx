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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#0a0a0c]/90 backdrop-blur-md border-t border-white/5 z-50">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // 홈은 정확히 '/'일 때만, 나머지는 시작 경로 포함
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-600'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
