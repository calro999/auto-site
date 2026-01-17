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
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

// シンプルにタグに挟まれた文字を抜く関数
function getBetween(text, startTag, endTag) {
    const parts = text.split(startTag);
    if (parts.length < 2) return '';
    const subParts = parts[1].split(endTag);
    return subParts[0].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

async function main() {
    try {
        console.log('--- ギャルの熱狂インテリジェンス：最終手段同期 ---');
        let allNewTrends = [];

        for (const source of SOURCES) {
            console.log(`[ACCESS] ${source.name} ...`);
            const rssData = await fetch(source.url);
            
            // <item>タグでぶった切る
            const items = rssData.split(/<item>/i).slice(1);
            console.log(`[INFO] 分割されたアイテム数: ${items.length}`);

            items.forEach(item => {
                const title = getBetween(item, '<title>', '</title>');
                const desc = getBetween(item, '<description>', '</description>');
                const traffic = getBetween(item, '<ht:approx_traffic>', '</ht:approx_traffic>') || 'Rising';

                if (title) {
                    const isSerious = SERIOUS_WORDS.some(w => title.includes(w));
                    allNewTrends.push({
                        title,
                        source: source.name,
                        desc: desc.substring(0, 80),
                        isSerious,
                        traffic: traffic
                    });
                }
            });
            console.log(`[SUCCESS] ${source.name} から抽出完了`);
        }

        if (allNewTrends.length === 0) {
            console.log('--- RSS生データ(最初の500文字) ---');
            // 失敗した時のために中身を一部ログに出す
            const debugRss = await fetch(SOURCES[0].url);
            console.log(debugRss.substring(0, 500));
            throw new Error('データが1件も抽出できませんでした。');
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

        db.current = mergedTrends.slice(0, 30);
        db.graveyard = (db.graveyard || []).slice(0, 25);
        db.lastUpdate = displayTime;

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log(`[DONE] ${db.current.length}件保存。`);
    } catch (err) {
        console.error('[FATAL ERROR]', err.message);
        process.exit(1);
    }
}
main();