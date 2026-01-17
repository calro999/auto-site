const fs = require('fs');
const https = require('https');
const path = require('path');

const DATA_FILE = './intelligence_db.json';
const LOGS_DIR = './logs';
const ARCHIVE_DIR = './archive';

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);

const SOURCES = [
    { name: 'GoogleNews_Top', url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', genre: 'GENERAL' },
    { name: 'GoogleNews_Ent', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ja&gl=JP&ceid=JP:ja', genre: 'SUB_CULTURE' },
    { name: 'Musicman', url: 'https://www.musicman.co.jp/feed/', genre: 'SUB_CULTURE' },
    { name: 'Gizmodo', url: 'https://www.gizmodo.jp/index.xml', genre: 'SUB_CULTURE' },
    { name: 'PR_TIMES', url: 'https://prtimes.jp/index.rdf', genre: 'GENERAL' }
];

const SERIOUS_WORDS = ['事故', '事件', '死亡', '逮捕', '火災', '地震', '不倫', '死去', '容疑', '被害', '遺体', '衝突', '殺', '判決', '倒産', 'ミサイル', '震災', '訃報'];

const VIBES_REWRITE = [
    { target: '、', replace: '✨ ' }, { target: '。', replace: '！' },
    { target: '発表', replace: 'キタこれ発表' }, { target: '決定', replace: 'ガチ決定' },
    { target: '開始', replace: '始まって草' }, { target: '公開', replace: '解禁されて沸いた' },
    { target: '発売', replace: 'リリースされて神' }
];

const MEMO_TEMPLATES = {
    GENERAL: ["日本中の視線集中。もはや義務教育レベル。🔥", "検索数エグすぎて草。これ知らないと会話詰む。", "圧倒的注目度。インテリジェンス高めたいならこれ。"],
    SUB_CULTURE: ["推し活の呼吸。供給過多で死ぬ。💖", "全人類見て。ビジュが良すぎて語彙力消失。", "尊すぎて無理。語彙力がログアウトしました。"],
    ARCHIVE: ["これは超重要。しっかり自分事として捉えよう👁️", "忘れてはいけない大切な記録。"]
};

function fetch(url) {
    return new Promise((resolve, reject) => {
        const options = { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

function getBetween(text, start, end) {
    const p = text.split(start);
    if (p.length < 2) return '';
    return p[1].split(end)[0].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

async function main() {
    try {
        let allNewTrends = [];
        let tagsSet = new Set();
        
        for (const source of SOURCES) {
            console.log(`FETCH: ${source.name}`);
            try {
                const rss = await fetch(source.url);
                rss.split('<item>').slice(1, 15).forEach(item => {
                    const title = getBetween(item, '<title>', '</title>');
                    let desc = getBetween(item, '<description>', '</description>');
                    
                    if (!title) return;
                    
                    // 【重要】HTMLタグを完全に排除し、実体参照（&nbsp;等）も解除
                    desc = desc.replace(/<[^>]*>/g, '') 
                               .replace(/&nbsp;/g, ' ')
                               .replace(/\n/g, '')
                               .substring(0, 100);

                    const isSerious = SERIOUS_WORDS.some(w => title.includes(w));
                    allNewTrends.push({
                        title,
                        searchKey: title.split(/[ 　,]/)[0],
                        desc: desc || "詳細はリンク先をチェック！",
                        genre: isSerious ? 'ARCHIVE' : source.genre,
                        label: isSerious ? 'ARCHIVE' : (Math.random() > 0.8 ? 'FLASH' : 'REAL'),
                        traffic: (Math.floor(Math.random() * 900) + 100) + "℃",
                        trafficNum: Math.floor(Math.random() * 1000000)
                    });
                    title.split(/[ 　]/).filter(w => w.length >= 2).slice(0, 3).forEach(t => tagsSet.add(t));
                });
            } catch (e) { console.error(`ERR: ${source.name}`); }
        }

        let db = { current: [], graveyard: [], tags: [], archiveList: [], lastUpdate: "" };
        if (fs.existsSync(DATA_FILE)) {
            try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e){}
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = now.toLocaleString('ja-JP');
        const dateKey = now.toISOString().split('T')[0].replace(/-/g, '');

        const finalTrends = allNewTrends.slice(0, 20).map(t => {
            let vt = t.title;
            VIBES_REWRITE.forEach(r => vt = vt.split(r.target).join(r.replace));
            const temps = MEMO_TEMPLATES[t.genre] || MEMO_TEMPLATES.GENERAL;
            return { ...t, vibesTitle: vt, firstSeen: displayTime, memo: temps[Math.floor(Math.random() * temps.length)] };
        });

        db.current = finalTrends;
        db.graveyard = (db.graveyard || []).slice(0, 30);
        db.tags = Array.from(tagsSet).slice(0, 20);
        db.lastUpdate = displayTime;

        // アーカイブ一覧の取得をより確実に
        if (fs.existsSync(ARCHIVE_DIR)) {
            db.archiveList = fs.readdirSync(ARCHIVE_DIR)
                .filter(f => f.endsWith('.html'))
                .map(f => f.replace('.html', ''))
                .sort((a, b) => b - a);
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log("DONE");
    } catch (e) { console.error(e); }
}
main();