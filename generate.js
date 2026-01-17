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
        const options = {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
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
        console.log('--- ギャルの熱狂インテリジェンス：強制同期開始 ---');
        let allNewTrends = [];

        for (const source of SOURCES) {
            console.log(`[ACCESS] ${source.name} に接続中...`);
            const rssData = await fetch(source.url);
            
            // アイテム抽出をより柔軟に (大文字小文字無視、改行対応)
            const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
            const items = rssData.match(itemRegex) || [];
            console.log(`[INFO] ${source.name} から ${items.length} 件見つかりました。`);

            items.forEach(item => {
                const extract = (tag) => {
                    const regex = new RegExp(`<${tag}[^>]*?>([\\s\\S]*?)<\\/${tag}>`, 'i');
                    const match = item.match(regex);
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
                    traffic: extract('ht:approx_traffic') || 'Rising',
                    firstSeen: "" // 後で設定
                });
            });
        }

        if (allNewTrends.length === 0) {
            console.error('[ERROR] トレンドが0件です。RSSの内容を確認してください。');
            process.exit(1);
        }

        // DB読み込み
        let db = { current: [], graveyard: [], lastUpdate: "" };
        if (fs.existsSync(DATA_FILE)) {
            try {
                const raw = fs.readFileSync(DATA_FILE, 'utf8');
                if (raw) db = JSON.parse(raw);
            } catch(e) { console.log('[WARN] JSONパース失敗、リセットします'); }
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
                const diffMins = Math.max(0, Math.floor((now - new Date(startStr)) / (1000 * 60)));
                mergedTrends.push({ ...nt, firstSeen: existing.firstSeen, duration: diffMins || 0 });
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
        console.log(`[SUCCESS] 全 ${db.current.length} 件をデプロイ可能状態にしました。`);
    } catch (err) {
        console.error('[FATAL] 実行エラー:', err);
        process.exit(1);
    }
}
main();