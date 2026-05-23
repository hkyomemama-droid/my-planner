// SVGをPNGに変換するスクリプト
import { writeFileSync } from 'fs';

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="30%" cy="30%">
      <stop offset="0%" stop-color="#FFE4EE"/>
      <stop offset="100%" stop-color="#F5EEF8"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size*0.22}" fill="url(#bg)"/>
  <text x="50%" y="54%" font-size="${size*0.52}" text-anchor="middle" dominant-baseline="middle">✿</text>
  <text x="50%" y="83%" font-size="${size*0.16}" text-anchor="middle" dominant-baseline="middle" fill="#FFB7C5" font-weight="bold" font-family="sans-serif">Planner</text>
</svg>`;

writeFileSync('public/icon-192.svg', svg(192));
writeFileSync('public/icon-512.svg', svg(512));
console.log('SVG icons created');
