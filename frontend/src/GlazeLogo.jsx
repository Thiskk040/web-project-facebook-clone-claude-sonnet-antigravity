import React from 'react';

export default function GlazeLogo({ size = 32, showWordmark = true }) {
    return (
        <div className="flex items-center gap-2" style={{ textDecoration: 'none', userSelect: 'none', cursor: 'pointer' }}>
            {/* Option B: Interlocking Translucent Glass Capsule Badge */}
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--surface-2)',
                    backdropFilter: 'blur(20px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 8px 24px rgba(201, 182, 255, 0.3), inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1.5px 1px rgba(154, 212, 255, 0.4)',
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                }}
            >
                {/* Ambient inner liquid optical spark */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '18%',
                        borderRadius: '50%',
                        background: 'var(--glaze-gradient)',
                        opacity: 0.85,
                        filter: 'blur(1px)',
                        boxShadow: '0 0 12px rgba(201, 182, 255, 0.8)'
                    }}
                />

                {/* Glass specular refraction arc */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 100%)',
                        borderRadius: '999px 999px 0 0',
                        pointerEvents: 'none'
                    }}
                />

                {/* Stylized Raycast/WWDC glass optics symbol */}
                <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 2 }}>
                    <path d="M12 4L14.5 9.5L20 12L14.5 14.5L12 20L9.5 14.5L4 12L9.5 9.5L12 4Z" fill="#100e0c" opacity="0.9" />
                </svg>
            </div>

            {showWordmark && (
                <h2 
                    className="glaze-wordmark" 
                    style={{ 
                        margin: 0, 
                        fontSize: `${size * 0.72}px`, 
                        fontWeight: 'var(--font-semibold)', 
                        letterSpacing: '-0.035em',
                        lineHeight: 1
                    }}
                >
                    glaze
                </h2>
            )}
        </div>
    );
}
