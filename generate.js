const fs = require('fs');
const https = require('https');
const path = require('path');

const RSS_URL = 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP';
const DATA_FILE = './intelligence_db.json';
const ARCHIVE_DIR = './archive';

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
        console.log('--- ギャルの熱狂インテリジェンス：スキャン開始 ---');
        const rssData = await fetch(RSS_URL);
        const items = rssData.split('<item>').slice(1);
        
        let db = { current: [], graveyard: [], total_heat: 0 };
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

        db.current.forEach(old => {
            if (!newTrends.some(n => n.title === old.title) && !old.isSerious) {
                db.graveyard.unshift({ title: old.title, diedAt: displayTime });
            }
        });
        db.graveyard = db.graveyard.slice(0, 15);
        db.current = newTrends;

        const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ギャルの熱狂インテリジェンス</title>
    <style>
        :root { --neon-blue: #00d4ff; --neon-pink: #ff007f; --serious-gray: #444; }
        body { background: #050505; color: #fff; font-family: 'Helvetica Neue', sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid var(--neon-pink); padding-bottom: 10px; margin-bottom: 30px; }
        .hero-title { font-size: 2rem; color: var(--neon-pink); text-shadow: 0 0 10px var(--neon-pink); }
        .trend-card { background: #111; border: 1px solid #333; padding: 20px; border-radius: 15px; margin-bottom: 20px; position: relative; }
        .trend-card.serious { border-left: 10px solid var(--serious-gray); opacity: 0.8; }
        .trend-card.hot { border-left: 10px solid var(--neon-blue); }
        .label { font-size: 0.7rem; font-weight: bold; padding: 3px 8px; border-radius: 5px; margin-bottom: 10px; display: inline-block; }
        .label.serious { background: var(--serious-gray); }
        .label.hot { background: var(--neon-blue); color: #000; }
        .bet-btn { float: right; background: none; border: 1px solid var(--neon-pink); color: var(--neon-pink); padding: 5px 15px; border-radius: 20px; text-decoration: none; font-size: 0.8rem; }
        .graveyard { background: #000; border: 2px dashed #222; padding: 20px; border-radius: 15px; margin-top: 50px; }
        .grave-item { display: inline-block; background: #1a1a1a; padding: 10px; margin: 5px; border-radius: 5px; font-size: 0.8rem; color: #666; }
        h2 { color: var(--neon-blue); font-size: 1.2rem; }
    </style>
</head>
<body>
    <div class="header">
        <div class="hero-title">ギャルの熱狂インテリジェンス</div>
        <p style="font-size: 0.8rem; color: #888;">日本の「今」をハックする観測儀 / Sync: ${displayTime}</p>
    </div>
    <h2>🔥 今、日本がアツくなってるやつ</h2>
    ${db.current.map(t => `
        <div class="trend-card ${t.isSerious ? 'serious' : 'hot'}">
            <span class="label ${t.isSerious ? 'serious' : 'hot'}">${t.isSerious ? 'SERIOUS MODE' : 'INTELLIGENCE'}</span>
            ${!t.isSerious ? `<a href="#" class="bet-btn">これ次くる！予言する🔥</a>` : ''}
            <h3 style="margin: 10px 0;">${t.title}</h3>
            <p style="font-size: 0.9rem; color: #ccc;">${t.desc}</p>
            <div style="font-size: 0.7rem; color: #666;">検索ボリューム: ${t.traffic}以上 / 観測開始: ${t.firstSeen}</div>
        </div>
    `).join('')}
    <div class="graveyard">
        <h2 style="color: #444; margin-top: 0;">💀 トレンドの墓場 (The Graveyard)</h2>
        ${db.graveyard.map(g => `
            <div class="grave-item">† ${g.title} <span style="font-size: 0.6rem;">(${g.diedAt} 永眠)</span></div>
        `).join('')}
    </div>
</body>
</html>`;

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        fs.writeFileSync('index.html', html);
        console.log('--- 同期完了 ---');
    } catch (err) {
        console.error(err);
    }
}
main();