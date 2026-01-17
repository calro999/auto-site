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

const SERIOUS_WORDS = ['事故', '事件', '死亡', '逮捕', '火災', '地震', '不倫', '死去', '容疑', '被害', '遺体', '衝突', '殺', '判決', '震災', '訃報', '黙とう', '犠牲'];

const VIBES_REWRITE = [
    { target: '、', replace: '✨ ' }, { target: '。', replace: '！' },
    { target: '発表', replace: 'キタこれ発表' }, { target: '決定', replace: 'ガチ決定' }
];

// 強力なクリーンアップ関数
function cleanText(text) {
    if (!text) return "";
    return text
        .replace(/&nbsp;/g, ' ')                        // 空白ゴミ除去
        .replace(/&lt;.*?&gt;/g, '')                    // エスケープされたHTMLタグ除去
        .replace(/<.*?>/g, '')                          // 通常のHTMLタグ除去
        .replace(/Photo:.*?\s/g, '')                    // 「Photo:名前」を除去
        .replace(/Image:.*?\s/g, '')                    // 「Image:名前」を除去
        .replace(/.*?再掲載しています。/g, '')           // 再掲載の定型文を一行まるごと消去
        .replace(/Google ニュースですべての記事を見る/g, '') // Googleニュースの末尾ゴミ
        .replace(/\s+/g, ' ')                           // 連続する空白を一つに
        .trim();
}

async function main() {
    try {
        let allNewTrends = [];
        let tagsSet = new Set();
        const rssFetch = (url) => new Promise((res, rej) => {
            https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
                let d = ''; r.on('data', chunk => d += chunk); r.on('end', () => res(d));
            }).on('error', rej);
        });

        for (const source of SOURCES) {
            try {
                const rss = await rssFetch(source.url);
                const items = rss.split('<item>').slice(1, 10);
                for (const item of items) {
                    let title = cleanText(item.split('<title>')[1]?.split('</title>')[0] || "");
                    let desc = cleanText(item.split('<description>')[1]?.split('</description>')[0] || "");
                    
                    if (!title) continue;
                    
                    const isSerious = SERIOUS_WORDS.some(w => title.includes(w));
                    allNewTrends.push({
                        title,
                        searchKey: title.split(/[ 　,]/)[0],
                        desc: desc.substring(0, 80) + (desc.length > 80 ? '...' : ''),
                        genre: isSerious ? 'ARCHIVE' : source.genre,
                        label: isSerious ? 'ARCHIVE' : (Math.random() > 0.7 ? 'FLASH' : 'REAL'),
                        traffic: (Math.floor(Math.random() * 900) + 100) + "℃",
                        trafficNum: Math.floor(Math.random() * 1000000)
                    });
                    title.split(/[ 　]/).filter(w => w.length >= 2).forEach(t => tagsSet.add(t));
                }
            } catch (e) { console.error(`Error fetching ${source.name}`); }
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = now.toLocaleString('ja-JP');
        const dateKey = now.toISOString().split('T')[0].replace(/-/g, '');

        let db = { current: allNewTrends.slice(0, 15), tags: Array.from(tagsSet).slice(0, 15), archiveList: [], lastUpdate: displayTime };

        // アーカイブフォルダをスキャンしてリスト化
        if (fs.existsSync(ARCHIVE_DIR)) {
            db.archiveList = fs.readdirSync(ARCHIVE_DIR)
                .filter(f => f.endsWith('.html'))
                .map(f => f.replace('.html', ''))
                .sort((a, b) => b - a);
        }

        // バイブス変換の適用
        db.current = db.current.map(t => {
            let vt = t.title;
            VIBES_REWRITE.forEach(r => vt = vt.split(r.target).join(r.replace));
            return { ...t, vibesTitle: vt, firstSeen: displayTime, memo: "最新バイブス爆上がり中🔥" };
        });

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log("SUCCESS: JSON UPDATED");
    } catch (e) { console.error(e); }
}
main();