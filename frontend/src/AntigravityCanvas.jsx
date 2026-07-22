import React, { useEffect, useRef } from 'react';

export default function AntigravityCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        let width = (canvas.width = canvas.parentElement.offsetWidth || window.innerWidth);
        let height = (canvas.height = canvas.parentElement.offsetHeight || window.innerHeight);

        const colors = [
            '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4',
            '#10b981', '#eab308', '#f97316', '#a855f7',
            '#ffd6e8', '#c9b6ff', '#9ad4ff'
        ];

        // Particle System Setup
        const particleCount = 160;
        const particles = [];

        const mouse = {
            x: width * 0.35,
            y: height * 0.5,
            targetX: width * 0.35,
            targetY: height * 0.5,
            radius: 180
        };

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.targetX = e.clientX - rect.left;
            mouse.targetY = e.clientY - rect.top;
        };

        window.addEventListener('mousemove', handleMouseMove);

        const handleResize = () => {
            if (!canvas.parentElement) return;
            width = canvas.width = canvas.parentElement.offsetWidth;
            height = canvas.height = canvas.parentElement.offsetHeight;
        };

        window.addEventListener('resize', handleResize);

        // Initialize particles in swirling orbital paths
        const centerX = width * 0.35;
        const centerY = height * 0.5;

        for (let i = 0; i < particleCount; i++) {
            const orbitRadius = Math.random() * (Math.min(width, height) * 0.65) + 30;
            const angle = Math.random() * Math.PI * 2;
            particles.push({
                x: centerX + Math.cos(angle) * orbitRadius,
                y: centerY + Math.sin(angle) * orbitRadius,
                orbitRadius: orbitRadius,
                angle: angle,
                speed: (0.002 + Math.random() * 0.005) * (Math.random() < 0.5 ? 1 : -1),
                size: Math.random() * 3.5 + 1.2,
                length: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: Math.random() * 0.7 + 0.3,
                vx: 0,
                vy: 0
            });
        }

        // Render Loop
        const render = () => {
            // Smooth mouse interpolation
            mouse.x += (mouse.targetX - mouse.x) * 0.05;
            mouse.y += (mouse.targetY - mouse.y) * 0.05;

            ctx.clearRect(0, 0, width, height);

            particles.forEach((p) => {
                // Orbital base movement
                p.angle += p.speed;
                const baseX = mouse.x + Math.cos(p.angle) * p.orbitRadius;
                const baseY = mouse.y + Math.sin(p.angle) * p.orbitRadius;

                // Mouse antigravity force
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    const angle = Math.atan2(dy, dx);
                    p.vx -= Math.cos(angle) * force * 1.5;
                    p.vy -= Math.sin(angle) * force * 1.5;
                }

                // Spring back to orbit
                p.vx += (baseX - p.x) * 0.02;
                p.vy += (baseY - p.y) * 0.02;

                p.vx *= 0.92;
                p.vy *= 0.92;

                p.x += p.vx;
                p.y += p.vy;

                // Draw elongated particle dash (Google Antigravity style)
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle + Math.PI / 2);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;

                ctx.beginPath();
                ctx.roundRect(-p.size / 2, -p.length / 2, p.size, p.length, p.size / 2);
                ctx.fill();

                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0
            }}
        />
    );
}
