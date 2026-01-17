const fs = require('fs');
const https = require('https');

// 取得先：Googleトレンド ＋ Yahoo!ニュース（速報）
const SOURCES = [
    { name: 'Google', url: 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP' },
    { name: 'Yahoo', url: 'https://news.yahoo.co.jp/rss/topics/top-pickups.xml' }
];

const DATA_FILE = './intelligence_db.json';
const SERIOUS_WORDS = ['事故', '事件', '死亡', '逮捕', '火災', '地震', '不倫', '死去', '容疑', '被害', '遺体', '衝突', '刺', '殺', '判決', '倒産', 'ミサイル'];

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

async function main() {
    try {
        console.log('--- ギャルの熱狂インテリジェンス：マルチソース同期開始 ---');
        
        let allNewTrends = [];
        for (const source of SOURCES) {
            try {
                const rssData = await fetch(source.url);
                const items = rssData.split('<item>').slice(1, 15); // 各ソース上位15件程度
                
                items.forEach(item => {
                    const getTag = (t) => (item.split(`<${t}>`)[1] || '').split(`</${t}>`)[0].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                    const title = getTag('title');
                    if (!title) return;

                    const isSerious = SERIOUS_WORDS.some(w => title.includes(w));
                    allNewTrends.push({
                        title,
                        source: source.name,
                        desc: getTag('description').substring(0, 80) + '...',
                        isSerious,
                        traffic: getTag('ht:approx_traffic') || 'Rising'
                    });
                });
            } catch (e) {
                console.error(`Error fetching ${source.name}:`, e);
            }
        }

        // DB読み込み
        let db = { current: [], graveyard: [], lastUpdate: "" };
        if (fs.existsSync(DATA_FILE)) {
            db = JSON.parse(fs.readFileSync(DATA_FILE));
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = now.toLocaleString('ja-JP');

        // 重複排除 ＋ 継続時間の計算
        const mergedTrends = [];
        const seenTitles = new Set();

        allNewTrends.forEach(nt => {
            if (seenTitles.has(nt.title)) return;
            seenTitles.add(nt.title);

            const existing = db.current.find(ct => ct.title === nt.title);
            if (existing) {
                // 継続中のワード
                const startTime = new Date(existing.firstSeen.replace(/\//g, '-'));
                const diffMs = now - startTime;
                const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
                
                mergedTrends.push({
                    ...nt,
                    firstSeen: existing.firstSeen,
                    duration: diffMins
                });
            } else {
                // 新規ワード
                mergedTrends.push({ ...nt, firstSeen: displayTime, duration: 0 });
            }
        });

        // 墓場ロジック：リストから消えたエンタメワードを墓場へ
        db.current.forEach(old => {
            if (!mergedTrends.some(n => n.title === old.title) && !old.isSerious) {
                db.graveyard.unshift({ title: old.title, diedAt: displayTime });
            }
        });

        db.current = mergedTrends.slice(0, 30); // 上位30件に絞る
        db.graveyard = db.graveyard.slice(0, 20); // 墓標は20件まで
        db.lastUpdate = displayTime;

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log(`--- 同期完了: ${db.current.length}件をアクティブ化 ---`);
    } catch (err) {
        console.error('Fatal Error:', err);
    }
}
main();