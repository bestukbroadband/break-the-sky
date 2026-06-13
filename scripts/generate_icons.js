import fs from 'fs';
import path from 'path';

// Self-contained generator for beautiful, crisp, valid PWA app icons (Break the Sky)
export function ensureIcons() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. Write the vector SVG icon
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <!-- Background -->
  <rect width="512" height="512" fill="#07111f" rx="112" />
  
  <g stroke="#1e293b" stroke-width="1.5" opacity="0.35">
    <line x1="64" y1="0" x2="64" y2="512" />
    <line x1="128" y1="0" x2="128" y2="512" />
    <line x1="192" y1="0" x2="192" y2="512" />
    <line x1="256" y1="0" x2="256" y2="512" />
    <line x1="320" y1="0" x2="320" y2="512" />
    <line x1="384" y1="0" x2="384" y2="512" />
    <line x1="448" y1="0" x2="448" y2="512" />
    
    <line x1="0" y1="64" x2="512" y2="64" />
    <line x1="0" y1="128" x2="512" y2="128" />
    <line x1="0" y1="192" x2="512" y2="192" />
    <line x1="0" y1="256" x2="512" y2="256" />
    <line x1="0" y1="320" x2="512" y2="320" />
    <line x1="0" y1="384" x2="512" y2="384" />
    <line x1="0" y1="448" x2="512" y2="448" />
  </g>

  <!-- Horizon Curved Glow -->
  <path d="M 0 420 Q 256 340 512 420 L 512 512 L 0 512 Z" fill="url(#horizonGrad)" />
  
  <circle cx="256" cy="220" r="140" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0.12" />
  <circle cx="256" cy="220" r="180" fill="none" stroke="#0ea5e9" stroke-width="1" opacity="0.08" />

  <line x1="256" y1="380" x2="256" y2="300" stroke="#0ea5e9" stroke-width="2.5" opacity="0.5" stroke-dasharray="8,8" />
  <line x1="140" y1="310" x2="200" y2="270" stroke="#38bdf8" stroke-width="1.5" opacity="0.25" />
  <line x1="372" y1="310" x2="312" y2="270" stroke="#38bdf8" stroke-width="1.5" opacity="0.25" />

  <g stroke="#38bdf8" stroke-width="1.5" opacity="0.4" fill="none">
    <circle cx="256" cy="220" r="50" stroke-dasharray="10, 8" />
    <line x1="250" y1="220" x2="262" y2="220" />
    <line x1="256" y1="214" x2="256" y2="226" />
  </g>

  <!-- Jet Fighter Silhouette -->
  <g fill="url(#jetGrad)" filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.65))">
    <path d="M 256 100 L 263 150 L 265 240 L 260 310 L 256 325 L 252 310 L 247 240 L 249 150 Z" />
    <path d="M 252 190 L 142 300 L 146 322 L 248 290 Z" />
    <path d="M 260 190 L 370 300 L 366 322 L 264 290 Z" />
    <path d="M 251 285 L 216 325 L 219 335 L 250 318 Z" />
    <path d="M 261 285 L 296 325 L 293 335 L 262 318 Z" />
    <ellipse cx="251" cy="326" rx="2.5" ry="1.5" fill="#f97316" />
    <ellipse cx="261" cy="326" rx="2.5" ry="1.5" fill="#f97316" />
  </g>

  <defs>
    <radialGradient id="horizonGrad" cx="50%" cy="100%" r="90%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.28" />
      <stop offset="40%" stop-color="#0ea5e9" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#07111f" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="jetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="45%" stop-color="#e2e8f0" />
      <stop offset="70%" stop-color="#94a3b8" />
      <stop offset="100%" stop-color="#475569" />
    </linearGradient>
  </defs>
</svg>
`;

  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf-8');

  // Try to locate generated high contrast aircraft shadow icon JPEG
  const generatedImgDir = path.join(process.cwd(), 'src', 'assets', 'images');
  let selectedIconSource = null;

  if (fs.existsSync(generatedImgDir)) {
    const files = fs.readdirSync(generatedImgDir);
    const matchedIconFile = files.find(file => file.startsWith('break_the_sky_icon_') && file.endsWith('.jpg'));
    if (matchedIconFile) {
      selectedIconSource = path.join(generatedImgDir, matchedIconFile);
      console.log('Found source aircraft shadow icon to propagate PWA targets:', selectedIconSource);
    }
  }

  if (selectedIconSource && fs.existsSync(selectedIconSource)) {
    // Copy the generated icon to all required standard targets
    fs.copyFileSync(selectedIconSource, path.join(process.cwd(), 'public', 'favicon.png'));
    fs.copyFileSync(selectedIconSource, path.join(iconsDir, 'icon-192.png'));
    fs.copyFileSync(selectedIconSource, path.join(iconsDir, 'icon-512.png'));
    fs.copyFileSync(selectedIconSource, path.join(iconsDir, 'apple-touch-icon.png'));
    console.log('Successfully copied aircraft shadow icon to PWA targets.');
  } else {
    // Standard fallbacks if image is missing
    const base64_192 = 'iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlSCSmAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAXVBQTFRFDBEfEBMfERQfExUeFBceFhgcGRkcGxobHBwbHRwaHh0aHx4aIB8ZICEYISIZIiMZJCQYJSQXJyMWKCIWKiIVLCMVLSIVLSMVLiIVLyIVMCIWMCEWMSEWMyEWMyEX////0w4J8AAAAGHRSTlMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADq0tUAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfoBgcNDgXb8XQOAAABWklEQVR42u3TuU4CQRBAwZkBQQREQAUEBfX//8KAsWpM9VbY6qR9K5m8pE+6CgAAAAAAAAAAAAAAAAAAgC/p8Xm8d6V6ObyNnZ3C+7Y7VbV+v9S3sP64XWscHj9YfR37t0fU20I9rrYOf6Eed6uN6uPwZ7mHeh1W69XH4eNqu3od6vX25/gO9fjcO83Z27WfAAAAAAAAAAAAAAAAAAAAAJgD6664XqfubPZucN8N6X6N9N069G9H+u7Tffdpv/vs9m6f3b7Z7XvH9g9r99P95p7dZrt3u8/uO/fsPrvPbu+6vfvve0a/v+6nfHevSgAAAAAAAAAAAAAAAAAAAAAAnvS8G5zZ3exu1O5m926zu/+0bK/YvX63WvefrFesX+/2vXfscv96v91PfctmSgAAAAAAAAAAAAAAAAAAAAD4nI/XfSXuXpWeDu8AAAD5elW57A4AAAAldEVYdGRhdGU6Y3JlYXRlPTIwMjYtMDYtMTNUMTM6MTQ6MDUrMDA6MDBL7oN6AAAAJXRFWHRkYXRlOm1vZGlmeT0yMDI2LTA2LTEzVDEzOjE0OjA1KzAwOjAwv4b7ogAAAABJRU5ErkJggg==';
    const base64_512 = 'iVBORw0KGgoAAAANSUhEUgAAAgAAAAICCAMAAAL7uCGoAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAXVBQTFRFDBEfEBMfERQfExUeFBceFhgcGRkcGxobHBwbHRwaHh0aHx4aIB8ZICEYISIZIiMZJCQYJSQXJyMWKCIWKiIVLCMVLSIVLSMVLiIVLyIVMCIWMCEWMSEWMyEWMyEX////0w4J8AAAAGHRSTlMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADq0tUAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfoBgcNDgXb8XQOAAACZElEQVR42u3cy26CQBRFUZaKICCtCOr//8OEmTbpSptpiz4Yztp7H6Ozk8bHRAAAAAAAAAAAAAAAAAAAgC8bFtu7f6Txdv07DuuL3tX6cRxXUuPLZunxdn+pXjL2g8XWeO2feEn0Z+rYjxZbg9f+EepZox5T+zZ4rT9QPevVffvR1v4D6vGpe3un7vS63f0d//vO6vHpePqHfvPZfZgBAAAAAAAAAAAAAAAAAAAAAAAAsG/D9bI7m7Pbnv2fXv77hT37vbt/qNnz/vGZvfvs9u9q+z809/v2H+7Zbeas+85mrvYfmrr6L/fsNrPr9q6yZ08AAAAAAAAAAAAAAAAAAAAAAPCSfXunbN8eY3uXbu8e27unZvfW7N7as/usZ9eY3TWm95vdm+U+9rtdY6fveNrtsttO989O3m3ZfrPd/XfvVvdW9rve9tPu/tv+/7bbfGf3+b/u9vluu6W7u8tud/v8pvuu2+/2387uPrN72+9+u+/Y/Xbb+8Xu8/+6veZ7/f96v+72+ezv762eP+/71b697UvvbXfcl959+9L/+7v79nbG7vOzM3bf3s7Yv+9X+2u95mPf7t/VPrX/2I8Z+8Z+7EfrXfsxY/++fWrv2o99u3/W6L79qGP/SXtH9e99exYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPDvfPscb+/+kfHl+nkcu9P4urn4uLhYP6Tx6ubidby6aezTfXz5bZ8AAAAAAAAAAAAAAAAAAAAAAAAsZf8HAAD//wMA1WML/sId2iUAAAAldEVYdGRhdGU6Y3JlYXRlPTIwMjYtMDYtMTNUMTM6MTQ6MDUrMDA6MDBL7oN6AAAAJXRFWHRkYXRlOm1vZGlmeT0yMDI2LTA2LTEzVDEzOjE0OjA1KzAwOjAwv4b7ogAAAABJRU5ErkJggg==';

    fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), Buffer.from(base64_192, 'base64'));
    fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), Buffer.from(base64_512, 'base64'));
    fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), Buffer.from(base64_192, 'base64'));
    fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.png'), Buffer.from(base64_192, 'base64'));
  }
}
