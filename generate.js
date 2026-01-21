/**
 * GAL-INTEL generate.js v3.8 - UNBREAKABLE_LINK_SYSTEM
 * 修正: 動的生成されるGRAVEYARDリンクの404（二重階層）を完全に封殺。
 * ページ監視(MutationObserver)により、リンクが作成された瞬間にパスを修正します。
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

const FORBIDDEN_WORDS = ['事故','事件','死','亡','逮捕','火災','火事','地震','不倫','容疑','被害','遺体','衝突','殺','判決','震災','訃報','黙とう','犠牲','重体','負傷','強盗','窃盗','摘発','送検','被疑','不祥事','倒産','破産','解雇','ミサイル','爆発','テロ','拉致','監禁','虐待','毒','薬物','大麻','覚醒剤','脱税','横領','汚職','墜落','転落','漂流','行方不明','捜索','津波','噴火','豪雨','土砂崩れ','浸水','竜巻','雷雨','デモ','暴動','紛争','戦争','空爆','侵攻','核','被爆'];

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
    return text.replace(/[／＼＼：＊？＂＜＞｜]/g, '').replace(/[\/:*?"<>|]/g, '').replace(/\s+/g, '_').substring(0, 80);
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
    console.log("🚀 GAL-INTEL v3.8: Deploying Unbreakable Link System...");
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
            const items = xml.split('<item>').slice(1, 15);
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
                title: t.title, desc: t.desc, slug: slug, aiImage: aiImage, memo: "バイブス最高✨", aiSummary: `「${t.title}」解析完了。`
            });
            
            // 【404解決の最終回答】監視型スクリプト + Vercel Analytics
            const observerScript = `
            <script>
            (function() {
                const isArchive = window.location.pathname.includes('/archive/');
                if (!isArchive) return;

                const fix = () => {
                    document.querySelectorAll('a').forEach(a => {
                        const h = a.getAttribute('href');
                        if (h && h.startsWith('archive/')) {
                            a.setAttribute('href', h.replace('archive/', './'));
                        }
                    });
                };

                // 1. 初回実行
                fix();

                // 2. DOMの変更を監視して、新しいカードが追加された瞬間に実行
                const observer = new MutationObserver(fix);
                observer.observe(document.body, { childList: true, subtree: true });
                
                // 3. 念押し（データ取得の遅延対策）
                [500, 1000, 2000, 5000].forEach(ms => setTimeout(fix, ms));
            })();
            </script>

            <!-- Vercel Web Analytics -->
            <script>
                window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
            </script>
            <script defer src="/_vercel/insights/script.js"></script>
            </body>`;
            
            let specialPageHTML = templateHTML
                .replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json')
                .replace(/href=["']index.html["']/g, 'href="../index.html"')
                .replace(/src=["']images\//g, 'src="../images/')
                .replace('</body>', observerScript);

            fs.writeFileSync(path.join(ARCHIVE_DIR, `${slug}.html`), specialPageHTML);
        }

        db.current = processedCurrent;
        db.graveyard = [...processedCurrent, ...(db.graveyard || [])].slice(0, 100);
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
        
        // 日付アーカイブも同様
        const dateArchiveHTML = templateHTML
            .replace('https://raw.githubusercontent.com/calro999/auto-site/main/intelligence_db.json', '../intelligence_db.json')
            .replace(/href=["']index.html["']/g, 'href="../index.html"')
            .replace(/src=["']images\//g, 'src="../images/')
            .replace('</body>', observerScript);
        fs.writeFileSync(path.join(ARCHIVE_DIR, `${dateKey}.html`), dateArchiveHTML);

        console.log("✅ Build Complete: Unbreakable Observer Injected.");
    } catch (e) { console.error(e); }
}

main();