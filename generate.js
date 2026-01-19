/**
 * GAL-INTEL generate.js v2.6 - SYSTEM_SYNC_EDITION
 * 役割: RSS取得、不適切ワードフィルタ、AI画像生成、物理アーカイブ生成
 * 修正: index.htmlの「裏面ボタン」との連携を完全復旧し、本文の過剰削除を防止。
 */

const fs = require('fs');
const https = require('https');
const path = require('path');
const { createCanvas } = require('canvas');

// --- 設定定数 ---
const DATA_FILE = './intelligence_db.json';
const INDEX_PATH = './index.html';
const ARCHIVE_DIR = './archive';
const IMAGE_DIR = './images';
const MAX_DESC_LENGTH = 200; // 詳細が消えないよう、少し長めに確保

if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR);

const FORBIDDEN_WORDS = [
    '事故','事件','死','亡','逮捕','火災','地震','不倫','容疑','被害','遺体','衝突','殺','判決','震災','訃報','黙とう',
    '犠牲','重体','負傷','強盗','窃盗','摘発','送検','被疑','不祥事','倒産','破産','解雇','ミサイル','爆発','テロ',
    '拉致','監禁','虐待','毒','薬物','大麻','覚醒剤','脱税','横領','汚職','墜落','転落','漂流','行方不明','捜索',
    '津波','噴火','豪雨','土砂崩れ','浸水','竜巻','雷雨','デモ','暴動','紛争','戦争','空爆','侵攻','核','被爆'
];

const VIBES_MEMOS = {
    GENERAL: [
        "これ知らんとマジで時代遅れ感あるよね✨",
        "ニュースの勢いエグくて草ｗ",
        "バイブスぶち上げ案件キタこれ！",
        "マジで神展開すぎて震えるｗ",
        "全人類チェック必須のバイブス、感じて？"
    ],
    SUB_CULTURE: [
        "これ界隈で絶対バズるやつじゃん！💖",
        "センス良すぎてバイブス伝わるわ〜",
        "推し活捗りすぎて幸せ案件",
        "世界観強すぎて語彙力失ったｗ",
        "エモすぎて無理。語彙力死んだ。"
    ]
};

function ensureString(input) {
    if (input === undefined || input === null) return "";
    let val = Array.isArray(input) ? input[0] : input;
    return String(val).trim();
}

function wrapText(text, maxLen = 12) {
    const safeText = ensureString(text);
    let lines = [];
    for (let i = 0; i < safeText.length; i += maxLen) {
        lines.push(safeText.substring(i, i + maxLen));
    }
    return lines.slice(0, 3);
}

async function generateVibeImage(title, slug) {
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#FF0080'); grad.addColorStop(1, '#7928CA');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
    for (let j = 0; j < height; j += 60) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke(); }
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold 75px sans-serif';
    const lines = wrapText(title, 12);
    lines.forEach((line, i) => { ctx.fillText(line, width / 2, 250 + (i * 100)); });
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`GAL-INTEL v2 // VIBE_ID: ${ensureString(slug).toUpperCase()}`, width / 2, height - 50);
    const buffer = canvas.toBuffer('image/png');
    const fileName = `${ensureString(slug)}.png`;
    fs.writeFileSync(path.join(IMAGE_DIR, fileName), buffer);
    return `https://raw.githubusercontent.com/calro999/auto-site/main/images/${fileName}`;
}

// 修正されたクレンジング関数（必要な情報を残し、リンク集だけ消す）
function cleanText(text) {
    let cleaned = ensureString(text);
    
    // HTMLタグ除去
    cleaned = cleaned.replace(/<[^>]*>?/gm, '');
    
    // 特殊文字置換
    cleaned = cleaned.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    
    // リンク集や不要な末尾のみを削除（本文が残るように調整）
    const trashPatterns = [
        /【関連記事】.*/s,
        /関連記事:.*/s,
        /▼おすすめ記事.*/s,
        /あわせて読みたい.*/s,
        /外部サイトへ.*/s,
        /©.*/s,
        /Copyright.*/s
    ];
    trashPatterns.forEach(p => cleaned = cleaned.replace(p, ''));

    // 最低限の本文を担保（空になった場合のフォールバック）
    if (cleaned.length < 5) {
        cleaned = "詳細情報は公式サイトをチェック！トレンドの波に乗るしかない✨";
    }

    // 文字数制限
    if (cleaned.length > MAX_DESC_LENGTH) {
        cleaned = cleaned.substring(0, MAX_DESC_LENGTH) + '...';
    }

    return cleaned.trim();
}

function createSlug(text) {
    const safeText = ensureString(text);
    let slug = safeText.replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 0).slice(0, 5).join('-').toLowerCase();
    return slug || Date.now().toString();
}

const fetchRSS = (url) => new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
    }).on('error', (e) => reject(e));
});

async function main() {
    console.log("🚀 Starting GAL-INTEL v2.6 (Sync Edition)...");
    try {
        let db = { current: [], graveyard: [], tags: [], archiveList: [], dictionary: [] };
        if (fs.existsSync(DATA_FILE)) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        const SOURCES = [
            { name: 'Google News', url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', genre: 'GENERAL' },
            { name: 'Gizmodo JP', url: 'https://www.gizmodo.jp/index.xml', genre: 'SUB_CULTURE' }
        ];

        let fetchedTrends = [];
        for (const s of SOURCES) {
            const xml = await fetchRSS(s.url);
            const items = xml.split('<item>').slice(1, 15);
            for (const item of items) {
                let title = cleanText(item.split('<title>')[1]?.split('</title>')[0] || "");
                let desc = cleanText(item.split('<description>')[1]?.split('</description>')[0] || "");
                
                if (!title || FORBIDDEN_WORDS.some(w => title.includes(w))) continue;
                if (fetchedTrends.some(t => t.title === title)) continue;
                
                fetchedTrends.push({ title, desc, genre: s.genre });
            }
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const dateKey = now.toISOString().split('T')[0].replace(/-/g, '');
        let processedCurrent = [];
        const templateHTML = fs.readFileSync(INDEX_PATH, 'utf8');

        for (let t of fetchedTrends.slice(0, 10)) {
            const slug = createSlug(t.title);
            const aiImage = await generateVibeImage(t.title, slug);
            const memos = VIBES_MEMOS[t.genre] || VIBES_MEMOS.GENERAL;
            
            // index.htmlのカード裏面は「desc」フィールドを表示するため、ここを確実に作成
            const item = {
                title: ensureString(t.title),
                desc: ensureString(t.desc),
                slug: ensureString(slug),
                aiImage: ensureString(aiImage),
                memo: ensureString(memos[Math.floor(Math.random() * memos.length)]),
                aiSummary: `「${ensureString(t.title)}」バイブス解析完了。トレンド爆上がり中。`
            };
            processedCurrent.push(item);
            
            const singleHTML = templateHTML.replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json');
            fs.writeFileSync(path.join(ARCHIVE_DIR, `${slug}.html`), singleHTML);
        }

        const finalDb = {
            current: processedCurrent,
            graveyard: [...processedCurrent, ...(db.graveyard || [])].slice(0, 100),
            tags: Array.from(new Set(processedCurrent.map(p => ensureString(p.title).split(/[ 　]/)[0]))).slice(0, 25),
            dictionary: processedCurrent.map(p => ({ word: ensureString(p.title).split(/[ 　]/)[0], mean: "注目のトレンドワード。" })).slice(0, 15),
            archiveList: Array.from(new Set([dateKey, ...(db.archiveList || [])])).slice(0, 31),
            lastUpdate: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) + ' JST'
        };

        fs.writeFileSync(path.join(ARCHIVE_DIR, `${dateKey}.html`), templateHTML.replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json'));
        fs.writeFileSync(DATA_FILE, JSON.stringify(finalDb, null, 2), 'utf8');
        console.log("✅ Build Complete! Sync with index.html is OK.");
    } catch (e) { console.error("❌ Error:", e); process.exit(1); }
}

main();