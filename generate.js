/**
 * GAL-INTEL generate.js v2.1 - DESIGN_RESTORE_EDITION
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

// 必要なディレクトリの作成
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR);

// ネガティブ・不祥事ワードフィルタ（V1からの魂）
const FORBIDDEN_WORDS = [
    '事故','事件','死','亡','逮捕','火災','地震','不倫','容疑','被害','遺体','衝突','殺','判決','震災','訃報','黙とう',
    '犠牲','重体','負傷','強盗','窃盗','摘発','送検','被疑','不祥事','倒産','破産','解雇','ミサイル','爆発','テロ',
    '拉致','監禁','虐待','毒','薬物','大麻','覚醒剤','脱税','横領','汚職','墜落','転落','漂流','行方不明','捜索',
    '津波','噴火','豪雨','土砂崩れ','浸水','竜巻','雷雨','デモ','暴動','紛争','戦争','空爆','侵攻','核','被爆'
];

// バイブスメモのバリエーション
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
 * 強力テキストクレンジング関数
 * HTMLタグの除去に加え、RSS特有のゴミ（続きを読む... 等）を排除
 */
function cleanText(text) {
    if (!text) return "";
    
    // 1. HTMLタグを完全に除去
    let cleaned = text.replace(/<[^>]*>?/gm, '');
    
    // 2. 特殊文字の復元
    cleaned = cleaned.replace(/&amp;/g, '&')
                     .replace(/&nbsp;/g, ' ')
                     .replace(/&quot;/g, '"')
                     .replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>')
                     .replace(/&copy;/g, '©');
    
    // 3. ニュースソース特有の末尾ゴミをカット
    const junkPatterns = [
        /続きを読む.*/,
        /\(時事通信\).*/,
        /©.*/,
        /Copyright.*/,
        /…$/,
        /&hellip;$/
    ];
    
    junkPatterns.forEach(p => {
        cleaned = cleaned.replace(p, '');
    });

    // 4. 改行をスペースに変換して1行にまとめる
    return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * URL用スラッグ生成
 */
function createSlug(text) {
    return text.replace(/[^\w\s]/gi, '')
               .split(/\s+/)
               .filter(w => w.length > 0)
               .slice(0, 5)
               .join('-')
               .toLowerCase() || Date.now().toString();
}

/**
 * AI Vibe Image 生成ロジック
 * Canvasを使用し、V1のデザインに合うリッチな画像を生成
 */
async function generateVibeImage(title, slug) {
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 背景グラデーション
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#FF0080');
    grad.addColorStop(1, '#7928CA');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // V1スタイルのグリッド装飾
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let j = 0; j < height; j += 60) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
    }

    // テキスト描画
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold 50px sans-serif';
    
    const displayTitle = title.length > 25 ? title.substring(0, 25) + '...' : title;
    ctx.fillText(displayTitle, width / 2, height / 2);

    ctx.font = 'bold 18px monospace';
    ctx.fillText(`GAL-INTEL v2 // VIBE_ID: ${slug.toUpperCase()}`, width / 2, height - 60);

    const buffer = canvas.toBuffer('image/png');
    const fileName = `${slug}.png`;
    const filePath = path.join(IMAGE_DIR, fileName);
    fs.writeFileSync(filePath, buffer);
    
    return `https://raw.githubusercontent.com/calro999/auto-site/main/images/${fileName}`;
}

/**
 * メインビルドプロセス
 */
async function main() {
    console.log("GAL-INTEL Build System v2.1 Starting...");

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

        const fetchRSS = (url) => new Promise((resolve, reject) => {
            https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });

        for (const s of SOURCES) {
            const xml = await fetchRSS(s.url);
            // RSSのパース（簡易）
            const items = xml.split('<item>').slice(1, 15);

            for (const item of items) {
                let rawTitle = item.split('<title>')[1]?.split('</title>')[0] || "";
                let rawDesc = item.split('<description>')[1]?.split('</description>')[0] || "";
                
                let title = cleanText(rawTitle);
                let desc = cleanText(rawDesc);
                
                if (!title || FORBIDDEN_WORDS.some(w => title.includes(w))) continue;
                if (fetchedTrends.some(t => t.title === title)) continue;

                fetchedTrends.push({ title, desc, genre: s.genre });
            }
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const dateKey = now.toISOString().split('T')[0].replace(/-/g, '');
        
        let processedCurrent = [];
        const templateHTML = fs.readFileSync(INDEX_PATH, 'utf8');

        // 上位10件を処理
        for (let t of fetchedTrends.slice(0, 10)) {
            const slug = createSlug(t.title);
            const aiImage = await generateVibeImage(t.title, slug);
            
            const memos = VIBES_MEMOS[t.genre] || VIBES_MEMOS.GENERAL;
            const memo = memos[Math.floor(Math.random() * memos.length)];

            const item = {
                ...t,
                slug,
                aiImage,
                memo,
                aiSummary: `AIによる解析の結果、このトレンドは現在最高潮のバイブスに達しています。${t.title}に関する議論は、SNSを中心に今後も拡大が予想されます。`
            };
            processedCurrent.push(item);

            // 【特設ページ生成】
            // JSONのパスを親ディレクトリ階層に修正して保存
            const singlePageHTML = templateHTML.replace(
                'https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', 
                '../intelligence_db.json'
            );
            fs.writeFileSync(path.join(ARCHIVE_DIR, `${slug}.html`), singlePageHTML);
        }

        // 墓場・タグ・用語集の更新
        const newGraveyard = [...db.current, ...db.graveyard].slice(0, 60);
        const newTags = Array.from(new Set(processedCurrent.map(p => p.title.split(/[ 　]/)[0]))).slice(0, 20);
        const newDict = processedCurrent.slice(0, 10).map(p => ({
            word: p.title.split(/[ 　]/)[0] || "不明",
            mean: "今この瞬間にバイブスが高まっている注目のパワーワード。"
        }));

        const finalDb = {
            current: processedCurrent,
            graveyard: newGraveyard,
            tags: newTags,
            dictionary: newDict,
            archiveList: Array.from(new Set([dateKey, ...(db.archiveList || [])])).slice(0, 30),
            lastUpdate: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) + ' JST'
        };

        // 【日次アーカイブ生成】
        fs.writeFileSync(
            path.join(ARCHIVE_DIR, `${dateKey}.html`), 
            templateHTML.replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json')
        );

        // ファイル書き出し
        fs.writeFileSync(DATA_FILE, JSON.stringify(finalDb, null, 2), 'utf8');
        
        console.log(`Build Success! ${processedCurrent.length} trends alive.`);

    } catch (error) {
        console.error("Build Failed:", error);
        process.exit(1);
    }
}

main();