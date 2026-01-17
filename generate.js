const fs = require('fs');
const https = require('https');

const DATA_FILE = './intelligence_db.json';
const ARCHIVE_DIR = './archive';

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

function cleanText(text) {
    if (!text) return "";
    return text
        .replace(/&amp;nbsp;/g, ' ').replace(/&nbsp;/g, ' ')
        .replace(/&lt;.*?&gt;/g, '').replace(/<.*?>/g, '')
        .replace(/Photo:.*?\s/g, '').replace(/Image:.*?\s/g, '')
        .replace(/.*?のニュースを編集して再掲載しています。/g, '')
        .replace(/Google ニュースですべての記事を見る/g, '')
        .replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
    try {
        // --- 1. 既存のデータを読み込む (墓場を救出) ---
        let oldDb = { current: [], graveyard: [], tags: [], archiveList: [] };
        if (fs.existsSync(DATA_FILE)) {
            try { oldDb = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e){}
        }

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
                const items = rss.split('<item>').slice(1, 12);
                for (const item of items) {
                    let rawTitle = item.split('<title>')[1]?.split('</title>')[0] || "";
                    let rawDesc = item.split('<description>')[1]?.split('</description>')[0] || "";
                    let title = cleanText(rawTitle);
                    let desc = cleanText(rawDesc);
                    if (desc.startsWith(title)) desc = desc.replace(title, '').trim();

                    if (!title) continue;
                    const isSerious = SERIOUS_WORDS.some(w => title.includes(w));
                    allNewTrends.push({
                        title,
                        searchKey: title.split(/[ 　,]/)[0],
                        desc: desc.substring(0, 90) || "詳細はリンク先でチェック！",
                        genre: isSerious ? 'ARCHIVE' : source.genre,
                        label: isSerious ? 'ARCHIVE' : (Math.random() > 0.7 ? 'FLASH' : 'REAL'),
                        traffic: (Math.floor(Math.random() * 900) + 100) + "℃",
                        trafficNum: Math.floor(Math.random() * 1000000)
                    });
                    title.split(/[ 　]/).filter(w => w.length >= 2).forEach(t => tagsSet.add(t));
                }
            } catch (e) { console.error(`ERR: ${source.name}`); }
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = now.toLocaleString('ja-JP');

        // --- 2. データのマージ (古い現在の記事は墓場へ) ---
        let db = {
            current: allNewTrends.slice(0, 15).map(t => {
                let vt = t.title;
                VIBES_REWRITE.forEach(r => vt = vt.split(r.target).join(r.replace));
                return { ...t, vibesTitle: vt, firstSeen: displayTime, memo: "最新バイブス爆上がり中🔥" };
            }),
            // 前回のcurrentを墓場の先頭に追加し、30件までに制限
            graveyard: [...(oldDb.current || []), ...(oldDb.graveyard || [])].slice(0, 30),
            tags: Array.from(tagsSet).slice(0, 15),
            archiveList: [],
            lastUpdate: displayTime
        };

        if (fs.existsSync(ARCHIVE_DIR)) {
            db.archiveList = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.html')).map(f => f.replace('.html', '')).sort((a, b) => b - a);
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log("SUCCESS: DB UPDATED (Graveyard preserved)");
    } catch (e) { console.error(e); }
}
main();