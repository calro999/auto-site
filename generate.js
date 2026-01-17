const fs = require('fs');
const https = require('https');

const RSS_URL = 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP';
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
        console.log('--- ギャルの熱狂インテリジェンス：データ同期 ---');
        const rssData = await fetch(RSS_URL);
        const items = rssData.split('<item>').slice(1);
        
        let db = { current: [], graveyard: [], lastUpdate: "" };
        if (fs.existsSync(DATA_FILE)) {
            db = JSON.parse(fs.readFileSync(DATA_FILE));
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = now.toLocaleString('ja-JP');

        const newTrends = items.map(item => {
            const getTag = (t) => (item.split(`<${t}>`)[1] || '').split(`</${t}>`)[0].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
            const title = getTag('title');
            const isSerious = SERIOUS_WORDS.some(w => title.includes(w));
            return {
                title,
                traffic: getTag('ht:approx_traffic'),
                desc: getTag('description'),
                isSerious,
                firstSeen: displayTime
            };
        });

        // 墓場ロジック
        db.current.forEach(old => {
            if (!newTrends.some(n => n.title === old.title) && !old.isSerious) {
                db.graveyard.unshift({ title: old.title, diedAt: displayTime });
            }
        });
        db.graveyard = db.graveyard.slice(0, 20);
        db.current = newTrends;
        db.lastUpdate = displayTime;

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log('--- JSONデータ更新完了 ---');
    } catch (err) {
        console.error(err);
    }
}
main();