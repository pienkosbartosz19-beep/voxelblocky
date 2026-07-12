'use client';

import { BLOCKS } from '@/game/blocks';
import type { BlockType } from '@/game/types';
import { useState, useRef, useEffect } from 'react';

interface BlockIconProps {
  block: BlockType;
  size?: number;
  className?: string;
}

// Renders a pseudo-3D isometric cube icon using CSS
export function BlockIcon({ block, size = 32, className = '' }: BlockIconProps) {
  const def = BLOCKS[block];
  if (!def || block === 'air') return <div style={{ width: size, height: size }} className={className} />;

  // For cross-shape plants, render a stylized icon
  if (def.variant === 'cross') {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <div
          style={{
            width: size * 0.7,
            height: size * 0.7,
            background: def.color,
            borderRadius: '50% 0 50% 0',
            boxShadow: `inset -2px -2px 0 rgba(0,0,0,0.25)`,
          }}
        />
      </div>
    );
  }

  // For torch
  if (def.variant === 'thin') {
    return (
      <div
        className={className}
        style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ position: 'relative', width: size * 0.25, height: size * 0.9 }}>
          <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '60%', background: '#6b4a2e' }} />
          <div
            style={{
              position: 'absolute',
              top: 0,
              width: '100%',
              height: '50%',
              background: def.color,
              borderRadius: '50% 50% 30% 30%',
              boxShadow: `0 0 ${size * 0.3}px ${def.color}`,
            }}
          />
        </div>
      </div>
    );
  }

  // For water - render as flat colored square with shimmer
  if (block === 'water') {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: def.color,
          opacity: 0.7,
          borderRadius: 2,
          boxShadow: 'inset 0 0 4px rgba(255,255,255,0.4)',
        }}
      />
    );
  }

  // For cube blocks - render isometric cube
  const topColor = def.color;
  const leftColor = def.sideColor || def.color;
  const rightColor = def.sideColor || def.color;
  // Darken right side
  const darken = (hex: string, amount = 0.7) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgb(${Math.floor(r * amount)}, ${Math.floor(g * amount)}, ${Math.floor(b * amount)})`;
  };

  const s = size;
  return (
    <div
      className={className}
      style={{
        width: s,
        height: s,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={s} height={s} viewBox="0 0 32 32" style={{ filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.3))' }}>
        {/* top face */}
        <polygon points="16,2 30,9 16,16 2,9" fill={topColor} stroke={darken(topColor, 0.5)} strokeWidth="0.5" />
        {/* left face */}
        <polygon points="2,9 16,16 16,30 2,23" fill={leftColor} stroke={darken(leftColor, 0.5)} strokeWidth="0.5" />
        {/* right face (darker) */}
        <polygon points="30,9 16,16 16,30 30,23" fill={darken(rightColor, 0.7)} stroke={darken(rightColor, 0.4)} strokeWidth="0.5" />
      </svg>
    </div>
  );
}
