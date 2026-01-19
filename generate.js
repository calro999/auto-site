const fs = require('fs');
const https = require('https');
const path = require('path');
const { createCanvas } = require('canvas');

const DATA_FILE = './intelligence_db.json';
const INDEX_PATH = './index.html';
const ARCHIVE_DIR = './archive';
const IMAGE_DIR = './images';

if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR);

const FORBIDDEN_WORDS = [
    '事故','事件','死','亡','逮捕','火災','地震','不倫','容疑','被害','遺体','衝突','殺','判決','震災','訃報','黙とう','犠牲',
    '重体','負傷','強盗','窃盗','摘発','送検','被疑','不祥事','倒産','破産','解雇','ミサイル','爆発','テロ','拉致','監禁',
    '虐待','毒','薬物','大麻','覚醒剤','脱税','横領','汚職','墜落','転落','漂流','行方不明','捜索','津波','噴火','豪雨',
    '土砂崩れ','浸水','竜巻','雷雨','デモ','暴動','紛争','戦争','空爆','侵攻','核','被爆','病','癌','腫瘍','感染','クラスター'
];

const VIBES_MEMOS = {
    GENERAL: ["これ知らんとマジで時代遅れ感あるよね✨", "ニュースの勢いエグくて草ｗ", "バイブスぶち上げ案件キタこれ！", "マジで神展開すぎて震えるｗ"],
    SUB_CULTURE: ["これ界隈で絶対バズるやつじゃん！💖", "センス良すぎてバイブス伝わるわ〜", "推し活捗りすぎて幸せ案件", "世界観強すぎて語彙力失ったｗ"],
    FLASH: ["待って、速報すぎて思考停止したんだがｗ🚨", "今すぐチェックしないと置いてかれるよ！", "爆速すぎてバイブス追いつかないｗ"]
};

// 【強化版】HTMLタグを徹底的に除去する関数
function cleanText(text) {
    if (!text) return "";
    let cleaned = text.replace(/<[^>]*>?/gm, ''); // タグを削除
    cleaned = cleaned.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/[\r\n]+/g, ' '); // 改行をスペースに
    return cleaned.replace(/\s+/g, ' ').trim(); // 余分な空白を削除
}

function createSlug(text) {
    // 英語・数字のみのスラッグ
    let slug = text.replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 0).slice(0, 5).join('-').toLowerCase();
    return slug || Date.now().toString();
}

async function generateVibeImage(title, slug) {
    try {
        const canvas = createCanvas(1200, 630);
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 1200, 630);
        grad.addColorStop(0, '#FF0080'); grad.addColorStop(1, '#7928CA');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 1200, 630);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title.substring(0, 20), 600, 315);
        ctx.font = 'bold 25px sans-serif';
        ctx.fillText('GAL-INTEL v2 VERIFIED VIBE', 600, 560);
        const buffer = canvas.toBuffer('image/png');
        const fileName = `${slug}.png`;
        fs.writeFileSync(path.join(IMAGE_DIR, fileName), buffer);
        return `https://raw.githubusercontent.com/calro999/auto-site/main/images/${fileName}`;
    } catch (e) {
        console.error("Image gen error:", e);
        return "";
    }
}

async function main() {
    try {
        let oldDb = { current: [], graveyard: [], tags: [], archiveList: [], dictionary: [] };
        if (fs.existsSync(DATA_FILE)) {
            try { oldDb = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e){}
        }

        const SOURCES = [
            { name: 'GNews', url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', genre: 'GENERAL' },
            { name: 'Gizmodo', url: 'https://www.gizmodo.jp/index.xml', genre: 'SUB_CULTURE' }
        ];

        let allTrends = [];
        const rssFetch = (url) => new Promise((res, rej) => {
            https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
                let d = ''; r.on('data', chunk => d += chunk); r.on('end', () => res(d));
            }).on('error', rej);
        });

        for (const s of SOURCES) {
            try {
                const rss = await rssFetch(s.url);
                const items = rss.split('<item>').slice(1, 15);
                for (const item of items) {
                    let rawTitle = item.split('<title>')[1]?.split('</title>')[0] || "";
                    let rawDesc = item.split('<description>')[1]?.split('</description>')[0] || "";
                    let title = cleanText(rawTitle);
                    let desc = cleanText(rawDesc);
                    if (!title || FORBIDDEN_WORDS.some(w => title.includes(w))) continue;
                    allTrends.push({ title, desc, genre: s.genre });
                }
            } catch (e) { console.error(e); }
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const dateKey = now.toISOString().split('T')[0].replace(/-/g, '');
        
        let processed = [];
        for (let t of allTrends.slice(0, 10)) {
            const slug = createSlug(t.title);
            const aiImage = await generateVibeImage(t.title, slug);
            const memos = VIBES_MEMOS[t.genre] || VIBES_MEMOS.GENERAL;
            processed.push({
                ...t, slug, aiImage,
                memo: memos[Math.floor(Math.random() * memos.length)],
                aiSummary: `${t.title}についてのまとめ。今の時代に絶対知っておきたいアツい話題だよ✨`,
            });
        }

        const db = {
            current: processed,
            graveyard: (oldDb.current || []).concat(oldDb.graveyard || []).slice(0, 40),
            tags: Array.from(new Set(processed.map(p => p.title.split(/[ 　]/)[0]))).slice(0, 15),
            dictionary: processed.slice(0, 6).map(p => ({ word: p.title.split(/[ 　]/)[0], mean: "今注目されてるアツいキーワード。" })),
            archiveList: oldDb.archiveList || [],
            lastUpdate: now.toLocaleString('ja-JP')
        };

        if (now.getHours() === 23) {
            const template = fs.readFileSync(INDEX_PATH, 'utf8');
            fs.writeFileSync(path.join(ARCHIVE_DIR, `${dateKey}.html`), template);
            if (!db.archiveList.includes(dateKey)) db.archiveList.unshift(dateKey);
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
        console.log("v2 DB & Images Updated Successfully.");
    } catch (e) { console.error(e); }
}
main();