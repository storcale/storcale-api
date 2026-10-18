const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const URL = 'https://swords-net.com/api/cheaters/badges/check/';
const FONT_PATH = path.join(global.__basedir, 'assets/fonts/Inter-Regular.ttf');

const W = 1000, H = 620;
const M = { l: 64, r: 28 };
const COLORS = { bg: '#0b0f14', grid: '#232c38', text: '#e7ebf0', muted: '#8996a6', line: '#e8a33d', bar: '#4d9de5' };

async function getBadges(userId) {
    const response = await axios.get(URL + encodeURIComponent(userId), { timeout: 15000 });
    const pages = Array.isArray(response.data) ? response.data : [response.data];
    const byId = new Map();
    for (const page of pages) {
        if (!page || page.type !== 'badges') continue;
        for (const b of page.badges || []) byId.set(b.id, b);
    }
    return [...byId.values()];
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function niceMax(n) {
    if (n <= 0) return 1;
    const p = 10 ** Math.floor(Math.log10(n));
    const f = n / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function buildSvg(userId, badges) {
    const times = badges
        .map((b) => b.awardedAt * 1000)
        .filter((t) => Number.isFinite(t))
        .sort((a, b) => a - b);
    if (!times.length) throw new Error('No badges with an award date');

    const firstYear = new Date(times[0]).getUTCFullYear();
    const lastYear = new Date(times[times.length - 1]).getUTCFullYear();
    const x0 = Date.UTC(firstYear, 0, 1);
    const x1 = Date.UTC(lastYear + 1, 0, 1);
    const xFor = (t) => M.l + ((t - x0) / (x1 - x0)) * (W - M.l - M.r);

    // panels
    const top = { y: 70, h: 300 };
    const bot = { y: 440, h: 110 };

    // cumulative 
    const total = times.length;
    const maxY = niceMax(total);
    const yTop = (v) => top.y + top.h - (v / maxY) * top.h;

    let linePath = `M ${xFor(x0).toFixed(1)} ${yTop(0).toFixed(1)}`;
    times.forEach((t, i) => {
        const x = xFor(t).toFixed(1);
        linePath += ` L ${x} ${yTop(i).toFixed(1)} L ${x} ${yTop(i + 1).toFixed(1)}`; // step line
    });
    linePath += ` L ${xFor(x1).toFixed(1)} ${yTop(total).toFixed(1)}`;
    const areaPath = `${linePath} L ${xFor(x1).toFixed(1)} ${yTop(0).toFixed(1)} Z`;

    //monthly
    const monthly = new Map();
    for (const t of times) {
        const d = new Date(t);
        const k = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
        monthly.set(k, (monthly.get(k) || 0) + 1);
    }
    const maxM = niceMax(Math.max(...monthly.values()));
    const yBot = (v) => bot.y + bot.h - (v / maxM) * bot.h;

    const bars = [...monthly.entries()].map(([k, v]) => {
        const d = new Date(k);
        const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
        const x = xFor(k);
        const w = Math.max(1, xFor(next) - x - 0.5);
        return `<rect x="${x.toFixed(1)}" y="${yBot(v).toFixed(1)}" width="${w.toFixed(1)}" height="${(bot.y + bot.h - yBot(v)).toFixed(1)}" fill="${COLORS.bar}"/>`;
    }).join('');

    // grid
    const gridFor = (panel, max, scale) => [0, 0.25, 0.5, 0.75, 1].map((f) => {
        const v = Math.round(max * f);
        const y = scale(max * f);
        return `<line x1="${M.l}" y1="${y.toFixed(1)}" x2="${W - M.r}" y2="${y.toFixed(1)}" stroke="${COLORS.grid}"/>
<text x="${M.l - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="${COLORS.muted}">${v}</text>`;
    }).join('');

    const yearStep = Math.max(1, Math.ceil((lastYear - firstYear + 1) / 10));
    let xTicks = '';
    for (let y = firstYear; y <= lastYear + 1; y += yearStep) {
        const x = xFor(Date.UTC(y, 0, 1)).toFixed(1);
        xTicks += `<line x1="${x}" y1="${top.y}" x2="${x}" y2="${bot.y + bot.h}" stroke="${COLORS.grid}" stroke-dasharray="2 4"/>
<text x="${x}" y="${bot.y + bot.h + 20}" text-anchor="middle" font-size="12" fill="${COLORS.muted}">${y}</text>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter, sans-serif">
<rect width="${W}" height="${H}" fill="${COLORS.bg}"/>
<text x="${M.l}" y="34" font-size="20" font-weight="700" fill="${COLORS.text}">Badges for ${esc(userId)}</text>
<text x="${M.l}" y="54" font-size="13" fill="${COLORS.muted}">${total} badges · ${firstYear}–${lastYear}</text>

<text x="${M.l}" y="${top.y - 8}" font-size="12" fill="${COLORS.muted}">Cumulative</text>
${gridFor(top, maxY, yTop)}
<path d="${areaPath}" fill="${COLORS.line}" fill-opacity="0.12"/>
<path d="${linePath}" fill="none" stroke="${COLORS.line}" stroke-width="2"/>

<text x="${M.l}" y="${bot.y - 8}" font-size="12" fill="${COLORS.muted}">Per month</text>
${gridFor(bot, maxM, yBot)}
${bars}
${xTicks}
</svg>`;
}

function renderPng(svg) {
    const hasFont = fs.existsSync(FONT_PATH);
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: W * 2 }, 
        font: {
            fontFiles: hasFont ? [FONT_PATH] : [],
            loadSystemFonts: !hasFont,
            defaultFontFamily: 'Inter',
        },
    });
    return Buffer.from(resvg.render().asPng());
}

module.exports = { getBadges, buildSvg, renderPng };