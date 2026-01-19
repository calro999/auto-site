/**
 * GAL-INTEL generate.js v3.6 - ABSOLUTE_LINK_FIX
 * 修正: ブラウザ上での archive/archive/ 二重階層を物理的に阻止。
 * リンク生成ロジックに「現在のURL階層チェック」を強制注入します。
 */

const fs = require('fs');
const https = require('https');
const path = require('path');
const { createCanvas } = require('canvas');

const DATA_FILE = './intelligence_db.json';
const INDEX_PATH = './index.html';
const ARCHIVE_DIR = './archive';
const IMAGE_DIR = './images';
const MAX_DESC_LENGTH = 180; 

if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR);

const FORBIDDEN_WORDS = ['事故','事件','死','亡','逮捕','火災','地震','不倫','容疑','被害','遺体','衝突','殺','判決','震災','訃報','黙とう','犠牲','重体','負傷','強盗','窃盗','摘発','送検','被疑','不祥事','倒産','破産','解雇','ミサイル','爆発','テロ','拉致','監禁','虐待','毒','薬物','大麻','覚醒剤','脱税','横領','汚職','墜落','転落','漂流','行方不明','捜索','津波','噴火','豪雨','土砂崩れ','浸水','竜巻','雷雨','デモ','暴動','紛争','戦争','空爆','侵攻','核','被爆'];

function ultimateClean(text) {
    if (!text) return "";
    let cleaned = String(text);
    cleaned = cleaned.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
    cleaned = cleaned.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/<[^>]*>?/gm, ' ');
    cleaned = cleaned.replace(/https?:\/\/[\x21-\x7e]+/gi, ''); 
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (cleaned.length > MAX_DESC_LENGTH) cleaned = cleaned.substring(0, MAX_DESC_LENGTH) + '...';
    return cleaned;
}

function createSafeSlug(text) {
    return text.replace(/[／＼＼：＊？＂＜＞｜]/g, '').replace(/[\/:*?"<>|]/g, '').replace(/\s+/g, '_').substring(0, 50);
}

async function generateVibeImage(title, slug) {
    const width = 1200, height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#FF0080'); grad.addColorStop(1, '#7928CA');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
    for (let j = 0; j < height; j += 60) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke(); }
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.font = 'bold 70px sans-serif';
    const lines = [title.substring(0, 12), title.substring(12, 24)];
    lines.forEach((line, i) => { ctx.fillText(line, width / 2, 300 + (i * 90)); });
    const fileName = `${Date.now()}.png`;
    fs.writeFileSync(path.join(IMAGE_DIR, fileName), canvas.toBuffer('image/png'));
    return `https://raw.githubusercontent.com/calro999/auto-site/main/images/${fileName}`;
}

const fetchRSS = (url) => new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
    }).on('error', (e) => reject(e));
});

async function main() {
    console.log("🚀 GAL-INTEL v3.6: Starting Absolute Link Fix...");
    try {
        if (!fs.existsSync(INDEX_PATH)) throw new Error("index.htmlが見つかりません。");
        const templateHTML = fs.readFileSync(INDEX_PATH, 'utf8');

        let db = { current: [], graveyard: [], tags: [], archiveList: [], dictionary: [] };
        if (fs.existsSync(DATA_FILE)) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        const SOURCES = [
            { name: 'Google News', url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', genre: 'GENERAL' },
            { name: 'Gizmodo JP', url: 'https://www.gizmodo.jp/index.xml', genre: 'SUB_CULTURE' }
        ];

        let fetchedTrends = [];
        for (const s of SOURCES) {
            const xml = await fetchRSS(s.url);
            const items = xml.split('<item>').slice(1, 12);
            for (const item of items) {
                let title = ultimateClean(item.split('<title>')[1]?.split('</title>')[0] || "");
                let desc = ultimateClean(item.split('<description>')[1]?.split('</description>')[0] || "");
                if (!title || FORBIDDEN_WORDS.some(w => title.includes(w))) continue;
                fetchedTrends.push({ title, desc, genre: s.genre });
            }
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const dateKey = now.toISOString().split('T')[0].replace(/-/g, '');
        let processedCurrent = [];

        for (let t of fetchedTrends.slice(0, 10)) {
            const slug = createSafeSlug(t.title);
            const aiImage = await generateVibeImage(t.title, slug);
            processedCurrent.push({
                title: t.title,
                desc: t.desc,
                slug: slug,
                aiImage: aiImage,
                memo: "バイブス最高✨",
                aiSummary: `「${t.title}」解析完了。`
            });
            
            // 【解決策の核心】JavaScript内のパス生成を「動的判定型」に強制置換
            // 既に /archive/ にいる場合は archive/ を付けず、ルートにいる場合のみ付ける
            const pathScript = "(window.location.pathname.includes('/archive/') ? '' : 'archive/')";
            
            let specialPageHTML = templateHTML
                .replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json')
                // 記事リンクの全パターンをカバーする置換
                .replace(/'archive\/' \+ item\.slug \+ '\.html'/g, `${pathScript} + item.slug + '.html'`)
                .replace(/'archive\/' \+ item\.slug/g, `${pathScript} + item.slug + '.html'`)
                .replace(/'archive\/' \+ p\.slug \+ '\.html'/g, `${pathScript} + p.slug + '.html'`)
                .replace(/'archive\/' \+ p\.slug/g, `${pathScript} + p.slug + '.html'`)
                // 静的リンクの補正
                .replace(/href=["']archive\//g, 'href="./')
                .replace(/src=["']images\//g, 'src="../images/')
                .replace(/href=["']index.html["']/g, 'href="../index.html"');

            fs.writeFileSync(path.join(ARCHIVE_DIR, `${slug}.html`), specialPageHTML);
        }

        db.current = processedCurrent;
        db.graveyard = [...processedCurrent, ...(db.graveyard || [])].slice(0, 100);
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');

        // 日付アーカイブも同様に
        const pathScript = "(window.location.pathname.includes('/archive/') ? '' : 'archive/')";
        const dateArchiveHTML = templateHTML
            .replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json')
            .replace(/'archive\/' \+ item\.slug \+ '\.html'/g, `${pathScript} + item.slug + '.html'`)
            .replace(/'archive\/' \+ item\.slug/g, `${pathScript} + item.slug + '.html'`)
            .replace(/href=["']archive\//g, 'href="./')
            .replace(/src=["']images\//g, 'src="../images/')
            .replace(/href=["']index.html["']/g, 'href="../index.html"');
        fs.writeFileSync(path.join(ARCHIVE_DIR, `${dateKey}.html`), dateArchiveHTML);

        console.log(`✅ Fixed! Absolute path detection script injected.`);
    } catch (e) { console.error(e); }
}

main();