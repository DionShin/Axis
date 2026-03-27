'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Stat } from '@/lib/types';

interface Props {
  stats: Stat[];
}

const SIZE = 300;
const PAD = 40;       // 라벨 여백
const TOTAL = SIZE + PAD * 2;
const CX = TOTAL / 2;
const CY = TOTAL / 2;
const R = 100;        // 최대 반지름
const LABEL_R = 132;  // 라벨 반지름

// n각형 꼭짓점 좌표 계산 (12시 방향부터 시계방향)
function getVertices(n: number, r: number, cx = CX, cy = CY) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

// 점들을 SVG path로
function pointsToPath(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';
}

// 동심원 격자선 레벨 (20%, 40%, 60%, 80%, 100%)
const GRID_LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0];

export default function StatRadarChart({ stats }: Props) {
  const router = useRouter();
  const n = stats.length;

  // 이전 꼭짓점 수 추적 → 애니메이션 트리거
  const prevN = useRef(n);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (prevN.current !== n) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 400);
      prevN.current = n;
      return () => clearTimeout(t);
    }
  }, [n]);

  if (n < 3) return null;

  const vertices = getVertices(n, R);
  const dataPath = pointsToPath(
    vertices.map((v, i) => {
      const ratio = (stats[i]?.score ?? 0) / 100;
      return {
        x: CX + (v.x - CX) * ratio,
        y: CY + (v.y - CY) * ratio,
      };
    })
  );

  return (
    <svg
      viewBox={`0 0 ${TOTAL} ${TOTAL}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      {/* ── 격자선 (동심 n각형) ── */}
      {GRID_LEVELS.map(level => (
        <path
          key={level}
          d={pointsToPath(getVertices(n, R * level))}
          fill="none"
          stroke="#1e293b"
          strokeWidth={1}
          style={{ transition: animating ? 'd 0.4s ease' : undefined }}
        />
      ))}

      {/* ── 꼭짓점에서 중심으로 이어지는 선 ── */}
      {vertices.map((v, i) => (
        <line
          key={i}
          x1={CX} y1={CY}
          x2={v.x} y2={v.y}
          stroke="#1e293b"
          strokeWidth={1}
        />
      ))}

      {/* ── 데이터 영역 ── */}
      <path
        d={dataPath}
        fill="#ffffff"
        fillOpacity={0.08}
        stroke="#ffffff"
        strokeWidth={1.5}
        strokeLinejoin="round"
        style={{
          transition: animating ? 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'all 0.6s ease',
        }}
      />

      {/* ── 꼭짓점 점 ── */}
      {vertices.map((v, i) => {
        const ratio = (stats[i]?.score ?? 0) / 100;
        const px = CX + (v.x - CX) * ratio;
        const py = CY + (v.y - CY) * ratio;
        return (
          <circle
            key={i}
            cx={px} cy={py}
            r={3}
            fill="#ffffff"
            style={{ transition: 'all 0.4s ease' }}
          />
        );
      })}

      {/* ── 라벨 (아이콘 + 이름 + 점수) ── */}
      {getVertices(n, LABEL_R).map((lv, i) => {
        const stat = stats[i];
        if (!stat) return null;
        // 텍스트 앵커: 왼쪽/오른쪽/가운데 구분
        const angle = (360 * i) / n - 90;
        const anchor =
          Math.abs(angle % 360) < 10 || Math.abs((angle % 360) - 360) < 10
            ? 'middle'
            : angle > 0 && angle < 180
            ? 'start'
            : angle > 180 && angle < 360
            ? 'end'
            : 'middle';

        return (
          <g
            key={stat.id}
            onClick={() => router.push(`/stat/${stat.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={lv.x - 32}
              y={lv.y - 18}
              width={64}
              height={36}
              fill="transparent"
            />
            <text
              x={lv.x}
              y={lv.y - 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight="700"
              fill={stat.color}
            >
              {stat.icon} {stat.name}
            </text>
            <text
              x={lv.x}
              y={lv.y + 10}
              textAnchor="middle"
              fontSize={10}
              fill="#64748b"
            >
              {Math.round(stat.score)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
