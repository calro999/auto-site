const fs = require('fs');
const https = require('https');
const path = require('path');

const DATA_FILE = './intelligence_db.json';
const LOGS_DIR = './logs';
// 過去ログ保存用のディレクトリがなければ作成（資産化）
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);

const SOURCES = [
    { name: 'Google', url: 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP&hl=ja' },
    { name: 'Yahoo', url: 'https://news.yahoo.co.jp/rss/categories/domestic.xml' }
];

const SERIOUS_WORDS = ['事故', '事件', '死亡', '逮捕', '火災', '地震', '不倫', '死去', '容疑', '被害', '遺体', '衝突', '刺', '殺', '判決', '倒産', 'ミサイル', '引退', '辞任', '震災', '追悼', '犠牲', '避難', '不明', '遺族', '訃報', '被災'];

// タイトルをギャル風にリライト
const VIBES_REWRITE = [
    { target: '、', replace: '✨ ' }, { target: '。', replace: '！' },
    { target: '発表', replace: 'キタこれ発表' }, { target: '決定', replace: 'ガチ決定' },
    { target: '開始', replace: '始まって草' }, { target: '懸念', replace: 'ヤバみが深い' },
    { target: '検討', replace: '考えてるなう' }, { target: '判明', replace: 'マジか判明' },
    { target: '公開', replace: '解禁されて沸いた' }
];

function rewriteTitle(title) {
    let t = title;
    VIBES_REWRITE.forEach(rule => t = t.split(rule.target).join(rule.replace));
    return t;
}

const MEMO_TEMPLATES = {
    HOT: ["日本中の視線集中。もはや義務教育レベル。🔥", "検索数エグすぎて草。これ知らないと会話詰む。", "熱狂度MAX。ネットの海がこの話題で溢れかえってるよ。", "圧倒的注目度。インテリジェンス高めたいならこれ。"],
    NEW: ["今ネットで一番アツい産まれたての話題✨", "検知した瞬間に震えた。最速で掴む快感🚀", "情報の産声をキャッチ。ここからどう拡散されるか楽しみ。", "鮮度が命のニュース。一秒でも早く頭に入れておくのが吉。⏱️"],
    ARCHIVE: ["これは超重要。しっかり自分事として捉えよう👁️", "記憶に刻むべき大切なこと。真摯に向き合う時間🕰️", "忘れてはいけない大切な記録。インテリジェンスの本質がここに。", "社会全体で共有すべき事実。これを知ることが未来への一歩。"],
    NORMAL: ["世の中のリアルがここに。落ち着いて整理🍵", "派手じゃないけど、地味に生活に響くやつ。✨", "知ってると得する大人のインテリジェンス。さりげなく把握。💎", "今の空気感を映し出す鏡。多角的な視点でチェック。"]
};

function fetch(url) {
    return new Promise((resolve, reject) => {
        const options = { headers: { 'User-Agent': 'Mozilla/5.0' } };
        https.get(url, options, (res) => {
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

async function main() {
    try {
        let allNewTrends = [];
        let tagsSet = new Set();
        for (const source of SOURCES) {
            const rssData = await fetch(source.url);
            const items = rssData.split(/<item>/i).slice(1);
            items.forEach(item => {
                const title = getBetween(item, '<title>', '</title>');
                const desc = getBetween(item, '<description>', '</description>');
                const trafficRaw = getBetween(item, '<ht:approx_traffic>', '</ht:approx_traffic>') || '10,000+';
                if (!title || title.length < 2) return;
                
                const isSerious = SERIOUS_WORDS.some(w => title.includes(w) || desc.includes(w));
                const trafficNum = parseInt(trafficRaw.replace(/[^0-9]/g, '')) || 10000;
                
                // 検索用キーワード（Amazon用）：記号で区切った最初の有効な単語
                const searchKey = title.split(/[ 　,、。!！「」]/).filter(s => s.length > 0)[0];
                
                allNewTrends.push({ 
                    title: title, 
                    searchKey: searchKey || title,
                    desc: desc, 
                    traffic: trafficRaw, 
                    trafficNum: trafficNum, 
                    isSerious: isSerious 
                });
                title.split(/[ 　]/).filter(w => w.length >= 2).slice(0, 3).forEach(tag => tagsSet.add(tag));
            });
        }

        let db = { current: [], graveyard: [], tags: [], lastUpdate: "" };
        if (fs.existsSync(DATA_FILE)) {
            try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = now.toLocaleString('ja-JP');

        const finalTrends = allNewTrends.slice(0, 15).map(nt => {
            const theme = nt.isSerious ? 'ARCHIVE' : (nt.trafficNum >= 500000 ? 'HOT' : 'NORMAL');
            const label = nt.isSerious ? 'ARCHIVE' : (nt.trafficNum >= 500000 ? 'FLASH' : 'REAL');
            return {
                ...nt,
                vibesTitle: rewriteTitle(nt.title),
                label: label,
                firstSeen: displayTime,
                memo: MEMO_TEMPLATES[theme][Math.floor(Math.random() * MEMO_TEMPLATES[theme].length)]
            };
        });

        let newGrave = (db.graveyard || []);
        db.current.forEach(old => {
            if (!finalTrends.some(f => f.title === old.title) && !newGrave.some(g => g.title === old.title)) {
                newGrave.unshift({ title: old.title, diedAt: displayTime });
            }
        });

        db.current = finalTrends;
        db.graveyard = newGrave.slice(0, 30);
        db.tags = Array.from(tagsSet).slice(0, 30);
        db.lastUpdate = displayTime;

        // ログ保存
        const dateKey = now.toISOString().split('T')[0];
        fs.writeFileSync(path.join(LOGS_DIR, `${dateKey}.json`), JSON.stringify(db, null, 2));
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log(`[SUCCESS] SYNC DONE`);
    } catch (err) { console.error(err); process.exit(1); }
}
main();