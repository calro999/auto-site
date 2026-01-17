const fs = require('fs');
const https = require('https');

const SOURCES = [
    { name: 'Google', url: 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP&hl=ja' },
    { name: 'Yahoo', url: 'https://news.yahoo.co.jp/rss/categories/domestic.xml' }
];

const DATA_FILE = './intelligence_db.json';
const SERIOUS_WORDS = ['事故', '事件', '死亡', '逮捕', '火災', '地震', '不倫', '死去', '容疑', '被害', '遺体', '衝突', '刺', '殺', '判決', '倒産', 'ミサイル'];

// ギャル語変換用
const GYARU_SUFFIX = ['すぎｗ', '最高かよ', 'ヤバすぎ', 'マジかｗ', '神展開', '案件なんだけどｗ', '草', '泣いた', '優勝', 'えぐいて'];

function fetch(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        };
        https.get(url, options, (res) => {
            // 文字化け対策: バイナリで受け取ってからUTF-8に変換
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        }).on('error', (err) => reject(err));
    });
}

function getBetween(text, startTag, endTag) {
    const parts = text.split(startTag);
    if (parts.length < 2) return '';
    const subParts = parts[1].split(endTag);
    return subParts[0].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

// ニュースをギャル風に要約
function gyaruize(title) {
    // 【】などの記号を消す
    let clean = title.replace(/【.*?】/g, '').replace(/\(.*?\)/g, '').trim();
    // 長すぎる場合はカット
    if (clean.length > 25) clean = clean.substring(0, 25) + '...';
    // ランダムでギャル語を足す
    const suffix = GYARU_SUFFIX[Math.floor(Math.random() * GYARU_SUFFIX.length)];
    return `${clean} ${suffix}`;
}

async function main() {
    try {
        console.log('--- ギャルの熱狂インテリジェンス：ギャル化同期 ---');
        let allNewTrends = [];

        for (const source of SOURCES) {
            const rssData = await fetch(source.url);
            if (!rssData) continue;

            const items = rssData.split(/<item>/i).slice(1);
            items.forEach(item => {
                const rawTitle = getBetween(item, '<title>', '</title>');
                if (!rawTitle || rawTitle.length < 2) return;

                const isSerious = SERIOUS_WORDS.some(w => rawTitle.includes(w));
                
                // 真面目系ワードが入ってなければギャル化
                const finalTitle = isSerious ? rawTitle : gyaruize(rawTitle);

                allNewTrends.push({
                    title: finalTitle,
                    source: source.name,
                    desc: getBetween(item, '<description>', '</description>').substring(0, 60),
                    isSerious,
                    traffic: getBetween(item, '<ht:approx_traffic>', '</ht:approx_traffic>') || '🔥HOT'
                });
            });
        }

        // DB処理（既存のコードと同じ）
        let db = { current: [], graveyard: [], lastUpdate: "" };
        if (fs.existsSync(DATA_FILE)) {
            try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = now.toLocaleString('ja-JP');
        const mergedTrends = [];
        const seenTitles = new Set();

        allNewTrends.forEach(nt => {
            if (seenTitles.has(nt.title)) return;
            seenTitles.add(nt.title);
            const existing = (db.current || []).find(ct => ct.title === nt.title);
            if (existing && existing.firstSeen) {
                const diffMins = Math.floor((now - new Date(existing.firstSeen.replace(/\//g, '-'))) / (1000 * 60));
                mergedTrends.push({ ...nt, firstSeen: existing.firstSeen, duration: Math.max(0, diffMins) });
            } else {
                mergedTrends.push({ ...nt, firstSeen: displayTime, duration: 0 });
            }
        });

        db.current = mergedTrends.slice(0, 30);
        db.graveyard = (db.graveyard || []).slice(0, 25);
        db.lastUpdate = displayTime;

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log(`[DONE] ${db.current.length}件をギャル化保存！`);
    } catch (err) {
        console.error('[FATAL]', err.message);
        process.exit(1);
    }
}
main();