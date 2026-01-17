const fs = require('fs');
const https = require('https');

const DATA_FILE = './intelligence_db.json';
const SOURCES = [
    { name: 'Google', url: 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP&hl=ja' },
    { name: 'Yahoo', url: 'https://news.yahoo.co.jp/rss/categories/domestic.xml' }
];

// シリアス判定ワード（不謹慎防止ガードレール）
const SERIOUS_WORDS = ['事故', '事件', '死亡', '逮捕', '火災', '地震', '不倫', '死去', '容疑', '被害', '遺体', '衝突', '刺', '殺', '判決', '倒産', 'ミサイル', '引退', '辞任', '震災', '追悼', '犠牲', '避難', '不明', '遺族', '訃報', '被災'];

// バイブス・メモ：各10パターン
const MEMO_TEMPLATES = {
    HOT: [
        "日本中の視線がここに集中してる。もはや義務教育レベルで知っとくべき。🔥",
        "検索数エグすぎて草。これ知らないと明日の会話についていけないかも？",
        "熱狂度MAX。ネットの海がこの話題で溢れかえってるよ、マジで。🚀",
        "今のトレンドの中心地は間違いなくここ。バイブスぶち上がり中！",
        "誰もがこの件について語りたがってる。時代の節目、感じない？✨",
        "情報の濁流がすごい。これぞ『今』って感じのビッグウェーブ。🌊",
        "全人類チェック推奨。今の日本の空気感がここに詰まってる。🏆",
        "この数字が物語ってる。みんなが気になって夜も眠れないやつ。👀",
        "社会現象一歩手前。ここからどう転がるか、見守るしかない。🔥",
        "圧倒的注目度。インテリジェンス高めたいなら、これは外せない。"
    ],
    NEW: [
        "これ、今ネットで一番アツい産まれたての話題。乗り遅れ厳禁案件✨",
        "検知した瞬間に震えた。最速で情報を掴む快感、味わって。🚀",
        "まだ誰も知らない、ここだけの初出し感。鮮度100%のインテル。💎",
        "たった今、世界が動き出した音がした。速報中の速報。⚡",
        "情報の産声をキャッチ。ここからどう拡散されるか、楽しみすぎ。",
        "誰よりも早く知ってるっていう優越感。これぞ最速バイブス変換。✨",
        "今の今までノーマークだった。いきなり飛び込んできた注目株。📈",
        "まだ情報の断片。でも、ここから大きなうねりになる予感。🌱",
        "鮮度が命のニュース。一秒でも早く頭に入れておくのが吉。⏱️",
        "爆速で解析中。このスピード感についてこれる？"
    ],
    ARCHIVE: [
        "これは超重要。しっかり中身を確認して、自分事として捉えよう。👁️",
        "記憶に刻むべき大切なこと。静かに中身を読み解いて。🕯️",
        "ニュースの重みを感じる。軽々しく扱えない、私たちの歴史の一部。",
        "背景までしっかり理解したい。事実に真摯に向き合う時間。🕰️",
        "忘れてはいけない大切な記録。インテリジェンスの本質がここに。",
        "社会全体で共有すべき事実。これを知ることが、未来への第一歩。",
        "言葉を失うような重厚なニュース。しっかりと見届けるのが務め。👁️",
        "派手さはないけれど、決して見逃してはいけない本質的な話題。",
        "私たちの生きる社会の、一つの側面。真面目に読み解いていこう。",
        "この情報は、知っておかなければならない。真剣に向き合うべし。"
    ],
    NORMAL: [
        "世の中のリアルがここに。落ち着いて情報を整理するのが賢い。🍵",
        "派手じゃないけど、地味に生活に響くやつ。チェックしとこ。✨",
        "知ってると得する、大人のインテリジェンス。さりげなく把握。💎",
        "情報の質がいい感じ。こういうのをコツコツ追うのが大事ってコト。",
        "日常の裏側に潜むニュース。私たちの生活と地続きなんだよね。🏠",
        "安定の注目度。こういう話題を抑えておくのが、真のギャル。💄",
        "議論の余地あり。自分ならどう考えるか、脳トレ感覚で読んで。🧠",
        "情報密度が高め。一息つきながら、じっくり中身を味わって。☕",
        "世間のスタンダードはこれ。常識としてアップデートしとこう。📚",
        "今の空気感を映し出す鏡。多角的な視点でチェックするのが正解。"
    ]
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

function getClassification(title, desc, isSerious, trafficNum, duration) {
    if (isSerious) return { label: 'ARCHIVE', theme: 'serious' };
    if (trafficNum >= 500000) return { label: 'FLASH', theme: 'hot' };
    if (duration < 30) return { label: 'FLASH', theme: 'new' };
    
    const text = (title + desc).toLowerCase();
    if (text.match(/株|円安|経済|予算|税|市場|物価|値上げ/)) return { label: 'REAL', theme: 'normal' };
    if (text.match(/ドラマ|映画|放送|タレント|歌手|アイドル|推し|主演/)) return { label: 'CULTURAL', theme: 'normal' };
    
    return { label: 'CRITICAL', theme: 'normal' };
}

function getMemo(theme) {
    const list = MEMO_TEMPLATES[theme.toUpperCase()] || MEMO_TEMPLATES.NORMAL;
    return list[Math.floor(Math.random() * list.length)];
}

async function main() {
    try {
        console.log('--- インテリジェンス・バイブス同期開始 ---');
        let allNewTrends = [];
        let tagsSet = new Set();

        for (const source of SOURCES) {
            const rssData = await fetch(source.url);
            const items = rssData.split(/<item>/i).slice(1);
            items.forEach(item => {
                const title = getBetween(item, '<title>', '</title>');
                const desc = getBetween(item, '<description>', '</description>');
                const trafficRaw = getBetween(item, '<ht:approx_traffic>', '</ht:approx_traffic>') || '10,000+';
                if (!title || title.length < 5) return;

                const isSerious = SERIOUS_WORDS.some(w => title.includes(w) || desc.includes(w));
                const trafficNum = parseInt(trafficRaw.replace(/[^0-9]/g, '')) || 10000;
                
                const potentialTags = title.replace(/[【】（）()「」]/g, ' ').split(/[ 　]/).filter(w => w.length >= 2 && w.length <= 8);
                potentialTags.slice(0, 3).forEach(tag => tagsSet.add(tag));
                
                allNewTrends.push({ title, desc, traffic: trafficRaw, trafficNum, isSerious });
            });
        }

        let db = { current: [], graveyard: [], tags: [], lastUpdate: "" };
        if (fs.existsSync(DATA_FILE)) {
            try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
        }

        const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = now.toLocaleString('ja-JP');
        const seenTitles = new Set();
        const finalTrends = [];

        allNewTrends.forEach(nt => {
            if (seenTitles.has(nt.title)) return;
            seenTitles.add(nt.title);
            const existing = (db.current || []).find(ct => ct.title === nt.title);
            const firstSeen = existing ? existing.firstSeen : displayTime;
            const duration = existing ? Math.floor((now - new Date(firstSeen.replace(/\//g, '-'))) / (1000 * 60)) : 0;
            
            const classInfo = getClassification(nt.title, nt.desc, nt.isSerious, nt.trafficNum, duration);
            
            // 判定に基づいたメモの選択
            let theme = classInfo.theme;
            if (nt.isSerious) theme = 'ARCHIVE';
            else if (nt.trafficNum >= 500000) theme = 'HOT';
            else if (duration < 30) theme = 'NEW';

            finalTrends.push({
                ...nt,
                firstSeen,
                duration,
                label: classInfo.label,
                memo: getMemo(theme)
            });
        });

        // 墓場
        let newGrave = [...(db.graveyard || [])];
        if (db.current.length > 0) {
            db.current.forEach(old => { if (!seenTitles.has(old.title)) newGrave.unshift({ title: old.title, diedAt: displayTime }); });
        }

        db.current = finalTrends.sort((a,b) => b.trafficNum - a.trafficNum).slice(0, 15);
        db.graveyard = newGrave.slice(0, 25);
        db.tags = Array.from(tagsSet).slice(0, 30);
        db.lastUpdate = displayTime;

        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
        console.log(`[SUCCESS] ALL SYNCED`);
    } catch (err) {
        console.error('[FATAL]', err.message);
        process.exit(1);
    }
}
main();