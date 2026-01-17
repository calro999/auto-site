const fs = require('fs');
const https = require('https');

const SOURCES = [
    { name: 'Google', url: 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP' },
    { name: 'Yahoo', url: 'https://news.yahoo.co.jp/rss/topics/top-pickups.xml' }
];

const DATA_FILE = './intelligence_db.json';
const SERIOUS_WORDS = ['事故', '事件', '死亡', '逮捕', '火災', '地震', '不倫', '死去', '容疑', '被害', '遺体', '衝突', '刺', '殺', '判決', '倒産', 'ミサイル'];

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

async function main() {
    try {
        console.log('--- ギャルの熱狂インテリジェンス：同期開始 ---');
        let allNewTrends = [];

        for (const source of SOURCES) {
            console.log(`Fetching from ${source.name}...`);
            const rssData = await fetch(source.url);
            
            // 正規表現でitemタグの中身を確実に抽出
            const items = rssData.match(/<item>([\s\S]*?)<\/item>/g) || [];
            console.log(`Found ${items.length} items in ${source.name}`);

            items.forEach(item => {
                const extract = (tag) => {
                    const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
                    return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
                };

                const title = extract('title');
                if (!title) return;

                const isSerious = SERIOUS_WORDS.some(w => title.includes(w));
                allNewTrends.push({
                    title,
                    source: source.name,
                    desc: extract('description').substring(0, 100),
                    isSerious,
                    traffic: extract('ht:approx_traffic') || 'Rising'
                });
            });
        }

        if (allNewTrends.length === 0) {
            throw new Error('トレンドが1件も取得できませんでした。RSSの構造が変わった可能性があります。');
        }

        let db = { current: [], graveyard: [], lastUpdate: "" };
        if (fs.existsSync(DATA_FILE)) {
            try {
                db = JSON.parse(fs.readFileSync(DATA_FILE));
            } catch(e) { console.log('JSON read error, reset db'); }
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = now.toLocaleString('ja-JP');

        const mergedTrends = [];
        const seenTitles = new Set();

        allNewTrends.forEach(nt => {
            if (seenTitles.has(nt.title)) return;
            seenTitles.add(nt.title);

            const existing = db.current.find(ct => ct.title === nt.title);
            if (existing) {
                const startTime = new Date(existing.firstSeen.replace(/\//g, '-'));
                const diffMins = Math.max(0, Math.floor((now - startTime) / (1000 * 60)));
                mergedTrends.push({ ...nt, firstSeen: existing.firstSeen, duration: diffMins });
            } else {
                mergedTrends.push({ ...nt, firstSeen: displayTime, duration: 0 });
            }
        });

        // 墓場
        db.current.forEach(old => {
            if (!mergedTrends.some(n => n.title === old.title) && !old.isSerious) {
                db.graveyard.unshift({ title: old.title, diedAt: displayTime });
            }
        });

        db.current = mergedTrends.slice(0, 30);
        db.graveyard = db.graveyard.slice(0, 20);
        db.lastUpdate = displayTime;

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log(`Successfully updated with ${db.current.length} trends!`);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1); // 失敗をActionsに知らせる
    }
}
main();