const fs = require('fs');
const https = require('https');

const SOURCES = [
    { name: 'Google', url: 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP&hl=ja' },
    { name: 'Yahoo', url: 'https://news.yahoo.co.jp/rss/categories/domestic.xml' }
];

const DATA_FILE = './intelligence_db.json';
const SERIOUS_WORDS = ['事故', '事件', '死亡', '逮捕', '火災', '地震', '不倫', '死去', '容疑', '被害', '遺体', '衝突', '刺', '殺', '判決', '倒産', 'ミサイル', '引退', '辞任'];
const GYARU_SUFFIX = ['すぎｗ', '最高かよ', 'マジでアツい', '神展開', '草', '泣いた', '優勝', 'えぐいて'];

function fetch(url) {
    return new Promise((resolve, reject) => {
        const options = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } };
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

function getGenre(title, desc) {
    const text = (title + desc).toLowerCase();
    if (text.match(/株|円安|経済|倒産|予算|税|市場/)) return { label: 'ECONOMY', icon: '💰' };
    if (text.match(/結婚|離婚|熱愛|不倫|側|密着/)) return { label: 'LOVE', icon: '💘' };
    if (text.match(/首相|総理|政府|選挙|辞任|政治/)) return { label: 'POLITICS', icon: '⚖️' };
    if (text.match(/ドラマ|映画|放送|タレント|歌手|アイドル/)) return { label: 'ENTAME', icon: '📺' };
    if (text.match(/試合|勝利|優勝|引退|選手|ゴール/)) return { label: 'SPORTS', icon: '👟' };
    return { label: 'CULTURE', icon: '✨' };
}

function getVibes(isSerious, traffic) {
    if (isSerious) return 'CONFIRMED 👁️';
    if (traffic.includes('万') || parseInt(traffic) > 50000) return '神VIBES 🔥';
    const vibes = ['沼確定 🕳️', '優勝 🏆', '安定の極み 🍵', '次くる 🚀', '眼福 👀'];
    return vibes[Math.floor(Math.random() * vibes.length)];
}

function smartGyaruize(text, type = 'title') {
    let clean = text.replace(/【.*?】/g, '').replace(/\(.*?\)/g, '').replace(/（.*?）/g, '').replace(/ - .*?$/, '').trim();
    if (type === 'title') {
        if (clean.length > 40) clean = clean.substring(0, 38) + '..';
        const suffix = GYARU_SUFFIX[Math.floor(Math.random() * GYARU_SUFFIX.length)];
        return `${clean} ${suffix}`;
    } else {
        const firstSentence = clean.split(/[。！？]/)[0];
        return `${firstSentence}ってコト。マジでチェックしとこ✨`;
    }
}

async function main() {
    try {
        console.log('--- 最終世代インテリジェンス・同期開始 ---');
        let allNewTrends = [];
        let tagsSet = new Set();

        for (const source of SOURCES) {
            const rssData = await fetch(source.url);
            const items = rssData.split(/<item>/i).slice(1);
            items.forEach(item => {
                const rawTitle = getBetween(item, '<title>', '</title>');
                const rawDesc = getBetween(item, '<description>', '</description>');
                const traffic = getBetween(item, '<ht:approx_traffic>', '</ht:approx_traffic>') || 'HOT';
                if (!rawTitle || rawTitle.length < 5) return;

                const isSerious = SERIOUS_WORDS.some(w => rawTitle.includes(w));
                const genre = getGenre(rawTitle, rawDesc);
                const vibes = getVibes(isSerious, traffic);

                // タグ抽出（固有名詞っぽいやつを簡易的に）
                const potentialTags = rawTitle.replace(/[【】（）()「」]/g, ' ').split(' ').filter(w => w.length >= 2 && w.length <= 8);
                potentialTags.slice(0, 2).forEach(tag => tagsSet.add(tag));
                
                allNewTrends.push({
                    title: isSerious ? rawTitle : smartGyaruize(rawTitle, 'title'),
                    source: source.name,
                    desc: isSerious ? rawDesc : smartGyaruize(rawDesc, 'desc'),
                    isSerious,
                    traffic,
                    genre,
                    vibes
                });
            });
        }

        let db = { current: [], graveyard: [], tags: [], lastUpdate: "" };
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
        db.graveyard = (db.graveyard || []).slice(0, 20);
        db.tags = Array.from(tagsSet).slice(0, 15); // 上位15タグ
        db.lastUpdate = displayTime;

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log(`[SUCCESS] ${db.current.length}件、${db.tags.length}タグを保存。`);
    } catch (err) {
        console.error('[FATAL]', err.message);
        process.exit(1);
    }
}
main();