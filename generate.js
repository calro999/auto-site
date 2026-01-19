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

const FORBIDDEN_WORDS = ['事故','事件','死','亡','逮捕','火災','地震','不倫','容疑','被害','遺体','衝突','殺','判決','震災','訃報','黙とう','犠牲','重体','負傷','強盗','窃盗','摘発','送検','被疑','不祥事','倒産','破産','解雇','ミサイル','爆発','テロ','拉致','監禁','虐待','毒','薬物','大麻','覚醒剤','脱税','横領','汚職','墜落','転落','漂流','行方不明','捜索','津波','噴火','豪雨','土砂崩れ','浸水','竜巻','雷雨','デモ','暴動','紛争','戦争','空爆','侵攻','核','被爆','病','癌','腫瘍','感染','クラスター'];

const VIBES_MEMOS = {
    GENERAL: ["これ知らんとマジで時代遅れ感あるよね✨", "ニュースの勢いエグくて草ｗ", "バイブスぶち上げ案件キタこれ！", "マジで神展開すぎて震えるｗ"],
    SUB_CULTURE: ["これ界隈で絶対バズるやつじゃん！💖", "センス良すぎてバイブス伝わるわ〜", "推し活捗りすぎて幸せ案件", "世界観強すぎて語彙力失ったｗ"],
    FLASH: ["待って、速報すぎて思考停止したんだがｗ🚨", "今すぐチェックしないと置いてかれるよ！", "爆速すぎてバイブス追いつかないｗ"]
};

// 【重要】HTMLタグを完全に排除する関数
function cleanText(text) {
    if (!text) return "";
    // 1. タグを消す 2. 実体参照(amp等)を戻す 3. 複数の空白を1つに 4. ニュースソース名以降(RSSゴミ)をカット
    let cleaned = text.replace(/<[^>]*>?/gm, '');
    cleaned = cleaned.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    // ニュースリンクの残骸を消す（日経新聞などのソース名で切る工夫）
    const sources = ["日本経済新聞", "Reuters", "AFPBB", "CNN", "WSJ", "Yahoo"];
    sources.forEach(s => {
        if(cleaned.includes(s)) cleaned = cleaned.split(s)[0];
    });
    return cleaned.trim();
}

function createSlug(text) {
    return text.replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 0).slice(0, 5).join('-').toLowerCase() || Date.now().toString();
}

async function generateVibeImage(title, slug) {
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    grad.addColorStop(0, '#FF0080'); grad.addColorStop(1, '#7928CA');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 50px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(title.substring(0, 22), 600, 315);
    ctx.font = 'bold 25px sans-serif'; ctx.fillText('GAL-INTEL VERIFIED VIBE', 600, 560);
    const fileName = `${slug}.png`;
    fs.writeFileSync(path.join(IMAGE_DIR, fileName), canvas.toBuffer('image/png'));
    return `https://raw.githubusercontent.com/calro999/auto-site/main/images/${fileName}`;
}

async function main() {
    try {
        let oldDb = { current: [], graveyard: [], tags: [], archiveList: [], dictionary: [] };
        if (fs.existsSync(DATA_FILE)) oldDb = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        const SOURCES = [
            { name: 'GNews', url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', genre: 'GENERAL' },
            { name: 'Gizmodo', url: 'https://www.gizmodo.jp/index.xml', genre: 'SUB_CULTURE' }
        ];

        let trends = [];
        const fetchRSS = (url) => new Promise((res) => https.get(url, (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); }));

        for (const s of SOURCES) {
            const xml = await fetchRSS(s.url);
            const items = xml.split('<item>').slice(1, 15);
            for (const item of items) {
                let title = cleanText(item.split('<title>')[1]?.split('</title>')[0] || "");
                let desc = cleanText(item.split('<description>')[1]?.split('</description>')[0] || "");
                if (!title || FORBIDDEN_WORDS.some(w => title.includes(w))) continue;
                trends.push({ title, desc, genre: s.genre });
            }
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        let processed = [];
        const template = fs.readFileSync(INDEX_PATH, 'utf8');

        for (let t of trends.slice(0, 10)) {
            const slug = createSlug(t.title);
            const aiImage = await generateVibeImage(t.title, slug);
            const item = { ...t, slug, aiImage, memo: VIBES_MEMOS[t.genre][Math.floor(Math.random() * VIBES_MEMOS[t.genre].length)], aiSummary: `${t.title}のバイブスまとめ。今これを知らないのはマジでもったいないレベル。` };
            processed.push(item);
            // 物理特設ページの生成
            fs.writeFileSync(path.join(ARCHIVE_DIR, `${slug}.html`), template.replace('intelligence_db.json', '../intelligence_db.json'));
        }

        const db = {
            current: processed,
            graveyard: (oldDb.current || []).concat(oldDb.graveyard || []).slice(0, 50),
            tags: Array.from(new Set(processed.map(p => p.title.split(/[ 　]/)[0]))).slice(0, 15),
            dictionary: processed.slice(0, 8).map(p => ({ word: p.title.split(/[ 　]/)[0], mean: "今注目されている最先端ワード。" })),
            lastUpdate: now.toLocaleString('ja-JP')
        };

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
        console.log("v2 COMPLETE_UPDATE: Designs, Images, and Archives ready.");
    } catch (e) { console.error(e); }
}
main();