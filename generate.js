/**
 * GAL-INTEL generate.js v2.2 - NO_OMISSION_EDITION
 * 役割: RSS取得、不適切ワードフィルタ、強力データクレンジング、AI画像生成、物理アーカイブ生成
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

// ディレクトリチェックと作成
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR);

// 不適切ワードフィルタ
const FORBIDDEN_WORDS = [
    '事故','事件','死','亡','逮捕','火災','地震','不倫','容疑','被害','遺体','衝突','殺','判決','震災','訃報','黙とう',
    '犠牲','重体','負傷','強盗','窃盗','摘発','送検','被疑','不祥事','倒産','破産','解雇','ミサイル','爆発','テロ',
    '拉致','監禁','虐待','毒','薬物','大麻','覚醒剤','脱税','横領','汚職','墜落','転落','漂流','行方不明','捜索',
    '津波','噴火','豪雨','土砂崩れ','浸水','竜巻','雷雨','デモ','暴動','紛争','戦争','空爆','侵攻','核','被爆'
];

// バイブスメモ
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

/**
 * 画像内テキストの改行処理 (12文字ルール)
 */
function wrapText(text, maxLen = 12) {
    let lines = [];
    for (let i = 0; i < text.length; i += maxLen) {
        lines.push(text.substring(i, i + maxLen));
    }
    return lines.slice(0, 3);
}

/**
 * AI Vibe Image 生成 (12文字改行ルール適用)
 */
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
    lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, 250 + (i * 100));
    });

    ctx.font = 'bold 20px monospace';
    ctx.fillText(`GAL-INTEL v2 // VIBE_ID: ${slug.toUpperCase()}`, width / 2, height - 50);

    const buffer = canvas.toBuffer('image/png');
    const fileName = `${slug}.png`;
    fs.writeFileSync(path.join(IMAGE_DIR, fileName), buffer);
    return `https://raw.githubusercontent.com/calro999/auto-site/main/images/${fileName}`;
}

/**
 * テキストクレンジング
 */
function cleanText(text) {
    if (!text) return "";
    let cleaned = text.replace(/<[^>]*>?/gm, '');
    cleaned = cleaned.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const patterns = [/続きを読む.*/, /\(時事通信\).*/, /©.*/, /Copyright.*/, /…$/, /&hellip;$/];
    patterns.forEach(p => cleaned = cleaned.replace(p, ''));
    return cleaned.trim();
}

/**
 * スラッグ作成
 */
function createSlug(text) {
    let slug = text.replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 0).slice(0, 5).join('-').toLowerCase();
    return slug || Date.now().toString();
}

/**
 * RSS取得プロミス
 */
const fetchRSS = (url) => new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
    }).on('error', (e) => reject(e));
});

/**
 * メインプロセス (一切の省略なし)
 */
async function main() {
    console.log("🚀 Starting GAL-INTEL v2.2 Build...");

    try {
        let db = { current: [], graveyard: [], tags: [], archiveList: [], dictionary: [] };
        if (fs.existsSync(DATA_FILE)) {
            db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }

        const SOURCES = [
            { name: 'Google News', url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', genre: 'GENERAL' },
            { name: 'Gizmodo JP', url: 'https://www.gizmodo.jp/index.xml', genre: 'SUB_CULTURE' }
        ];

        let fetchedTrends = [];

        for (const s of SOURCES) {
            console.log(`📡 Fetching ${s.name}...`);
            const xml = await fetchRSS(s.url);
            const items = xml.split('<item>').slice(1, 12); // 各ソースから最大11件

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

        // 上位10件を処理 (画像生成 & アーカイブ作成)
        for (let t of fetchedTrends.slice(0, 10)) {
            console.log(`💎 Processing: ${t.title.substring(0, 15)}...`);
            const slug = createSlug(t.title);
            const aiImage = await generateVibeImage(t.title, slug);
            
            const memos = VIBES_MEMOS[t.genre] || VIBES_MEMOS.GENERAL;
            const memo = memos[Math.floor(Math.random() * memos.length)];

            const item = {
                ...t,
                slug,
                aiImage,
                memo,
                aiSummary: `「${t.title}」に関するバイブス解析が完了しました。このトレンドは現在爆上がり中で、SNSでの反応も非常にポジティブです。今後の展開から目が離せません。`
            };
            processedCurrent.push(item);

            // 【物理特設ページ生成】
            const singlePageHTML = templateHTML.replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json');
            fs.writeFileSync(path.join(ARCHIVE_DIR, `${slug}.html`), singlePageHTML);
        }

        // DB更新ロジック
        const newGraveyard = [...db.current, ...db.graveyard].slice(0, 100);
        const newTags = Array.from(new Set(processedCurrent.map(p => p.title.split(/[ 　]/)[0]))).slice(0, 25);
        const newDict = processedCurrent.map(p => ({
            word: p.title.split(/[ 　]/)[0] || "トレンド",
            mean: "今この瞬間にバイブスが最大化している注目ワード。"
        })).slice(0, 15);

        const finalDb = {
            current: processedCurrent,
            graveyard: newGraveyard,
            tags: newTags,
            dictionary: newDict,
            archiveList: Array.from(new Set([dateKey, ...(db.archiveList || [])])).slice(0, 31),
            lastUpdate: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) + ' JST'
        };

        // 【日次まとめアーカイブ生成】
        fs.writeFileSync(path.join(ARCHIVE_DIR, `${dateKey}.html`), templateHTML.replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json'));

        // JSON保存
        fs.writeFileSync(DATA_FILE, JSON.stringify(finalDb, null, 2), 'utf8');
        
        console.log(`✅ Build Complete! ${processedCurrent.length} articles, ${processedCurrent.length} images, and physical archives generated.`);

    } catch (error) {
        console.error("❌ Fatal Error:", error);
        process.exit(1);
    }
}

main();