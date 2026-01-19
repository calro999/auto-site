/**
 * GAL-INTEL generate.js v2 - FULL_SPEC_EDITION
 * 役割: RSS取得、不適切ワードフィルタ、データクレンジング、AI画像生成、物理アーカイブ生成
 */

const fs = require('fs');
const https = require('https');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');

// --- 設定定数 ---
const DATA_FILE = './intelligence_db.json';
const INDEX_PATH = './index.html';
const ARCHIVE_DIR = './archive';
const IMAGE_DIR = './images';

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR);

// ネガティブ・不祥事ワードフィルタ（V1の安全基準を継承）
const FORBIDDEN_WORDS = [
    '事故','事件','死','亡','逮捕','火災','地震','不倫','容疑','被害','遺体','衝突','殺','判決','震災','訃報','黙とう',
    '犠牲','重体','負傷','強盗','窃盗','摘発','送検','被疑','不祥事','倒産','破産','解雇','ミサイル','爆発','テロ',
    '拉致','監禁','虐待','毒','薬物','大麻','覚醒剤','脱税','横領','汚職','墜落','転落','漂流','行方不明','捜索',
    '津波','噴火','豪雨','土砂崩れ','浸水','竜巻','雷雨','デモ','暴動','紛争','戦争','空爆','侵攻','核','被爆',
    '病','癌','腫瘍','感染','クラスター'
];

// ジャンル別バイブスメモ（V1のデザイン魂を継承）
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
    ],
    FLASH: [
        "待って、速報すぎて思考停止したんだがｗ🚨",
        "今すぐチェックしないと置いてかれるよ！",
        "爆速すぎてバイブス追いつかないｗ",
        "全米が泣くレベルの衝撃展開キタ！"
    ]
};

/**
 * テキストクレンジング関数
 * HTMLタグの除去、実体参照の復元、ニュースソースのゴミ取り
 */
function cleanText(text) {
    if (!text) return "";
    // HTMLタグを完全に除去
    let cleaned = text.replace(/<[^>]*>?/gm, '');
    // 実体参照をデコード
    cleaned = cleaned.replace(/&amp;/g, '&')
                     .replace(/&nbsp;/g, ' ')
                     .replace(/&quot;/g, '"')
                     .replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>');
    
    // 特定のニュースソース名以降をカットして詳細欄を綺麗にする
    const sources = ["日本経済新聞", "Reuters", "AFPBB", "CNN", "WSJ", "Yahoo", "ロイター", "時事通信"];
    sources.forEach(s => {
        if (cleaned.includes(s)) {
            cleaned = cleaned.split(s)[0];
        }
    });
    
    // 複数の空白を1つにまとめ、前後の空白を削除
    return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * スラッグ作成（URL用）
 */
function createSlug(text) {
    let slug = text.replace(/[^\w\s]/gi, '')
                   .split(/\s+/)
                   .filter(w => w.length > 0)
                   .slice(0, 5)
                   .join('-')
                   .toLowerCase();
    return slug || Date.now().toString();
}

/**
 * AI Vibe Image 生成 (v2の重要機能)
 * Canvasを使用して、デザイン性の高い画像を動的に生成
 */
async function generateVibeImage(title, slug) {
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // グラデーション背景
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#FF0080');
    grad.addColorStop(1, '#7928CA');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // オーバーレイ装飾（V1のグリッド感）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let j = 0; j < height; j += 50) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
    }

    // テキスト描画
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    
    // メインタイトル
    ctx.font = 'bold 55px sans-serif';
    const displayTitle = title.length > 25 ? title.substring(0, 25) + '...' : title;
    ctx.fillText(displayTitle, width / 2, height / 2);

    // 装飾テキスト
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('GAL-INTEL VERIFIED VIBES // SYSTEM v2', width / 2, height / 2 + 80);
    
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`ID: ${slug.toUpperCase()}`, width / 2, height - 50);

    const buffer = canvas.toBuffer('image/png');
    const fileName = `${slug}.png`;
    const filePath = path.join(IMAGE_DIR, fileName);
    fs.writeFileSync(filePath, buffer);
    
    return `https://raw.githubusercontent.com/calro999/auto-site/main/images/${fileName}`;
}

/**
 * メイン処理
 */
async function main() {
    console.log("Starting GAL-INTEL v2 Build System...");

    try {
        // 既存データの読み込み
        let db = { current: [], graveyard: [], tags: [], archiveList: [], dictionary: [] };
        if (fs.existsSync(DATA_FILE)) {
            db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }

        const SOURCES = [
            { name: 'Google News', url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', genre: 'GENERAL' },
            { name: 'Gizmodo JP', url: 'https://www.gizmodo.jp/index.xml', genre: 'SUB_CULTURE' }
        ];

        let fetchedTrends = [];

        // RSS取得プロミス
        const fetchRSS = (url) => new Promise((resolve, reject) => {
            https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });

        for (const s of SOURCES) {
            console.log(`Fetching from ${s.name}...`);
            const xml = await fetchRSS(s.url);
            const items = xml.split('<item>').slice(1, 15);

            for (const item of items) {
                let title = cleanText(item.split('<title>')[1]?.split('</title>')[0] || "");
                let desc = cleanText(item.split('<description>')[1]?.split('</description>')[0] || "");
                
                // フィルタリング
                if (!title || FORBIDDEN_WORDS.some(w => title.includes(w))) continue;
                if (fetchedTrends.some(t => t.title === title)) continue;

                fetchedTrends.push({ title, desc, genre: s.genre });
            }
        }

        // 現在時刻（JST）
        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const dateKey = now.toISOString().split('T')[0].replace(/-/g, '');
        
        let processedCurrent = [];
        const templateHTML = fs.readFileSync(INDEX_PATH, 'utf8');

        // 上位10件を処理
        for (let t of fetchedTrends.slice(0, 10)) {
            const slug = createSlug(t.title);
            const aiImage = await generateVibeImage(t.title, slug);
            
            // ジャンル別メモの選択
            const memos = VIBES_MEMOS[t.genre] || VIBES_MEMOS.GENERAL;
            const memo = memos[Math.floor(Math.random() * memos.length)];

            const item = {
                ...t,
                slug,
                aiImage,
                memo,
                aiSummary: `「${t.title}」について、AIがバイブス解析を完了しました。このトレンドは今後さらに加速する可能性が高く、情報のキャッチアップが重要です。AI検索エンジンを活用した深掘りを推奨します。`
            };
            processedCurrent.push(item);

            // 【物理アーカイブ生成】各ニュースごとの個別ページ
            // 特設ページ用に、DBのパスを1階層上に修正
            const singlePageHTML = templateHTML.replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json');
            fs.writeFileSync(path.join(ARCHIVE_DIR, `${slug}.html`), singlePageHTML);
        }

        // 墓場（過去ログ）の更新
        const newGraveyard = [...db.current, ...db.graveyard].slice(0, 60);

        // タグの抽出
        const newTags = Array.from(new Set(processedCurrent.map(p => p.title.split(/[ 　]/)[0]))).slice(0, 18);

        // 用語集の生成
        const newDict = processedCurrent.slice(0, 10).map(p => ({
            word: p.title.split(/[ 　]/)[0],
            mean: "今この瞬間、最もバイブスが上がっている注目ワード。"
        }));

        // DBオブジェクトの構築
        const finalDb = {
            current: processedCurrent,
            graveyard: newGraveyard,
            tags: newTags,
            dictionary: newDict,
            archiveList: Array.from(new Set([dateKey, ...(db.archiveList || [])])).slice(0, 30),
            lastUpdate: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) + ' JST'
        };

        // 【1日まとめアーカイブ生成】
        fs.writeFileSync(path.join(ARCHIVE_DIR, `${dateKey}.html`), templateHTML.replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json'));

        // ファイル書き出し
        fs.writeFileSync(DATA_FILE, JSON.stringify(finalDb, null, 2), 'utf8');
        
        console.log(`Build Complete! ${processedCurrent.length} trends processed.`);
        console.log(`Images saved to ${IMAGE_DIR}`);
        console.log(`Archives saved to ${ARCHIVE_DIR}`);

    } catch (error) {
        console.error("Critical Build Error:", error);
        process.exit(1);
    }
}

main();