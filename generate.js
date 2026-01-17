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
        // ここで「普通のブラウザ」だと偽装する
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/xml,application/xml,application/xhtml+xml',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

async function main() {
    try {
        console.log('--- ギャルの熱狂インテリジェンス：人間偽装同期 ---');
        let allNewTrends = [];

        for (const source of SOURCES) {
            console.log(`[TRY] ${source.name} のデータを取得中...`);
            const rssData = await fetch(source.url);
            
            // <item>タグを正規表現で切り出し
            const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
            let match;
            let count = 0;

            while ((match = itemRegex.exec(rssData)) !== null) {
                const itemContent = match[1];
                
                const extract = (tag) => {
                    const tRegex = new RegExp(`<${tag}[^>]*?>([\\s\\S]*?)<\\/${tag}>`, 'i');
                    const tMatch = itemContent.match(tRegex);
                    return tMatch ? tMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
                };

                const title = extract('title');
                if (title) {
                    const isSerious = SERIOUS_WORDS.some(w => title.includes(w));
                    allNewTrends.push({
                        title,
                        source: source.name,
                        desc: extract('description').substring(0, 80),
                        isSerious,
                        traffic: extract('ht:approx_traffic') || 'Rising'
                    });
                    count++;
                }
            }
            console.log(`[SUCCESS] ${source.name} から ${count} 件ゲット！`);
        }

        if (allNewTrends.length === 0) {
            throw new Error('全ソースから1件も取れませんでした。ブロックされている可能性があります。');
        }

        // DB処理
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

            const existing = db.current.find(ct => ct.title === nt.title);
            if (existing) {
                const startStr = existing.firstSeen.replace(/\//g, '-');
                const diffMins = Math.floor((now - new Date(startStr)) / (1000 * 60));
                mergedTrends.push({ ...nt, firstSeen: existing.firstSeen, duration: Math.max(0, diffMins) });
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
        db.graveyard = db.graveyard.slice(0, 25);
        db.lastUpdate = displayTime;

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log(`[DONE] 最新インテリジェンス ${db.current.length} 件を保存しました。`);
    } catch (err) {
        console.error('[FATAL ERROR]', err.message);
        process.exit(1);
    }
}
main();