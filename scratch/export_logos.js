const fs = require('fs');
const path = require('path');

const exportsDir = path.join(__dirname, '..', 'exports');
const publicDir = path.join(__dirname, '..', 'frontend', 'public');

if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Icon Mark SVG (512x512)
const glazeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Glaze Signature Liquid Gradient -->
    <linearGradient id="glaze-liquid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd6e8"/>
      <stop offset="45%" stop-color="#c9b6ff"/>
      <stop offset="100%" stop-color="#9ad4ff"/>
    </linearGradient>

    <!-- Glass Surface Gradient Sheen -->
    <linearGradient id="glaze-glass-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <!-- Outer Rim Glow Filter -->
    <filter id="glaze-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="24" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Inner Shadow / Refraction Light -->
    <linearGradient id="glaze-rim-light" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#9ad4ff" stop-opacity="0.4"/>
    </linearGradient>
  </defs>

  <!-- Ambient Glow Behind Capsule -->
  <circle cx="256" cy="256" r="210" fill="url(#glaze-liquid-grad)" opacity="0.35" filter="url(#glaze-glow)" />

  <!-- Outer Glass Capsule Body -->
  <circle cx="256" cy="256" r="224" fill="#161224" stroke="url(#glaze-rim-light)" stroke-width="4" opacity="0.95" />

  <!-- Inner Liquid Core -->
  <circle cx="256" cy="256" r="165" fill="url(#glaze-liquid-grad)" opacity="0.9" />

  <!-- Glass Specular Refraction Top Arc -->
  <path d="M 52 256 A 204 204 0 0 1 460 256 A 204 160 0 0 0 52 256 Z" fill="url(#glaze-glass-sheen)" opacity="0.75" />

  <!-- Center 4-Point Optics Sparkle Symbol -->
  <path d="M 256 128 L 284 228 L 384 256 L 284 284 L 256 384 L 228 284 L 128 256 L 228 228 Z" fill="#100e0c" opacity="0.92" />
</svg>`;

// 2. Full Horizontal Logo (Dark Theme) SVG (800x240)
const glazeLogoFullDarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 240" width="800" height="240">
  <defs>
    <!-- Liquid Gradient -->
    <linearGradient id="dark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd6e8"/>
      <stop offset="45%" stop-color="#c9b6ff"/>
      <stop offset="100%" stop-color="#9ad4ff"/>
    </linearGradient>
    
    <!-- Wordmark Dark Text Gradient -->
    <linearGradient id="wordmark-dark-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#ffd6e8"/>
      <stop offset="70%" stop-color="#c9b6ff"/>
      <stop offset="100%" stop-color="#9ad4ff"/>
    </linearGradient>

    <!-- Glass Sheen -->
    <linearGradient id="sheen-dark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background (Optional / Container preview) -->
  <rect width="800" height="240" rx="24" fill="#0d0b14"/>

  <!-- Icon Mark (Centered at X=130, Y=120, R=80) -->
  <g transform="translate(50, 40)">
    <circle cx="80" cy="80" r="76" fill="#1a152e" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
    <circle cx="80" cy="80" r="56" fill="url(#dark-grad)" />
    <path d="M 12 80 A 68 68 0 0 1 148 80 A 68 50 0 0 0 12 80 Z" fill="url(#sheen-dark)" opacity="0.7" />
    <path d="M 80 38 L 90 70 L 122 80 L 90 90 L 80 122 L 70 90 L 38 80 L 70 70 Z" fill="#100e0c" opacity="0.9" />
  </g>

  <!-- Wordmark Text "glaze" -->
  <text x="250" y="152" 
        fill="url(#wordmark-dark-grad)" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif" 
        font-size="112" 
        font-weight="700" 
        letter-spacing="-0.04em">glaze</text>
</svg>`;

// 3. Full Horizontal Logo (Light Theme) SVG (800x240)
const glazeLogoFullLightSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 240" width="800" height="240">
  <defs>
    <linearGradient id="light-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffa5d0"/>
      <stop offset="45%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#60a5fa"/>
    </linearGradient>
    
    <linearGradient id="wordmark-light-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="50%" stop-color="#6b21a8"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>

    <linearGradient id="sheen-light" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.1"/>
    </linearGradient>
  </defs>

  <!-- Background (Light preview) -->
  <rect width="800" height="240" rx="24" fill="#f8fafc"/>

  <!-- Icon Mark -->
  <g transform="translate(50, 40)">
    <circle cx="80" cy="80" r="76" fill="#ffffff" stroke="rgba(0,0,0,0.08)" stroke-width="2" />
    <circle cx="80" cy="80" r="56" fill="url(#light-grad)" />
    <path d="M 12 80 A 68 68 0 0 1 148 80 A 68 50 0 0 0 12 80 Z" fill="url(#sheen-light)" opacity="0.8" />
    <path d="M 80 38 L 90 70 L 122 80 L 90 90 L 80 122 L 70 90 L 38 80 L 70 70 Z" fill="#0f172a" opacity="0.95" />
  </g>

  <!-- Wordmark Text "glaze" -->
  <text x="250" y="152" 
        fill="url(#wordmark-light-grad)" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif" 
        font-size="112" 
        font-weight="700" 
        letter-spacing="-0.04em">glaze</text>
</svg>`;

// 4. Stacked Centered Logo (Dark) (512x512)
const glazeLogoStackedDarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="stacked-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd6e8"/>
      <stop offset="45%" stop-color="#c9b6ff"/>
      <stop offset="100%" stop-color="#9ad4ff"/>
    </linearGradient>

    <linearGradient id="stacked-wordmark-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#ffd6e8"/>
      <stop offset="70%" stop-color="#c9b6ff"/>
      <stop offset="100%" stop-color="#9ad4ff"/>
    </linearGradient>

    <linearGradient id="stacked-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="32" fill="#0b0914"/>

  <!-- Centered Icon Mark -->
  <g transform="translate(144, 50)">
    <circle cx="112" cy="112" r="108" fill="#161224" stroke="rgba(255,255,255,0.3)" stroke-width="3" />
    <circle cx="112" cy="112" r="80" fill="url(#stacked-grad)" />
    <path d="M 16 112 A 96 96 0 0 1 208 112 A 96 70 0 0 0 16 112 Z" fill="url(#stacked-sheen)" opacity="0.7" />
    <path d="M 112 52 L 126 98 L 172 112 L 126 126 L 112 172 L 98 126 L 52 112 L 98 98 Z" fill="#100e0c" opacity="0.9" />
  </g>

  <!-- Centered Wordmark Text -->
  <text x="256" y="380" 
        text-anchor="middle"
        fill="url(#stacked-wordmark-grad)" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif" 
        font-size="96" 
        font-weight="700" 
        letter-spacing="-0.04em">glaze</text>
</svg>`;

// 5. Wordmark Only SVG (600x200)
const glazeWordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="600" height="200">
  <defs>
    <linearGradient id="wm-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#ffd6e8"/>
      <stop offset="70%" stop-color="#c9b6ff"/>
      <stop offset="100%" stop-color="#9ad4ff"/>
    </linearGradient>
  </defs>

  <rect width="600" height="200" rx="20" fill="#0d0b14"/>

  <text x="300" y="135" 
        text-anchor="middle"
        fill="url(#wm-grad)" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif" 
        font-size="140" 
        font-weight="800" 
        letter-spacing="-0.045em">glaze</text>
</svg>`;

// Save files to exports/ and frontend/public/
const files = [
    { name: 'glaze-icon.svg', content: glazeIconSvg },
    { name: 'glaze-logo-full-dark.svg', content: glazeLogoFullDarkSvg },
    { name: 'glaze-logo-full-light.svg', content: glazeLogoFullLightSvg },
    { name: 'glaze-logo-stacked-dark.svg', content: glazeLogoStackedDarkSvg },
    { name: 'glaze-wordmark.svg', content: glazeWordmarkSvg }
];

files.forEach(f => {
    fs.writeFileSync(path.join(exportsDir, f.name), f.content, 'utf8');
    fs.writeFileSync(path.join(publicDir, f.name), f.content, 'utf8');
    console.log(`Saved: ${f.name}`);
});

console.log('All Glaze logo SVG assets successfully exported!');
