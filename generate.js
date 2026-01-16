const fs = require('fs');
const https = require('https');
const path = require('path');

const RSS_URL = 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP';
const ARCHIVE_DIR = './archive';

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
        console.log('--- 起動：トレンド解析エンジン ---');
        const rssData = await fetch(RSS_URL);
        const items = rssData.match(/<item>([\s\S]*?)<\/item>/g) || [];
        const articles = items.slice(0, 15).map(item => {
            const title = (item.match(/<title>([\s\S]*?)<\/title>/) || [null, "取得失敗"])[1];
            const description = (item.match(/<description>([\s\S]*?)<\/description>/) || [null, "詳細なし"])[1];
            const traffic = (item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/) || [null, "不明"])[1];
            return { title, description, traffic };
        });

        const jstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = jstNow.toLocaleString('ja-JP');
        const fileSafeTime = jstNow.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `${fileSafeTime}.html`;

        if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);

        // 1. 個別アーカイブの生成
        const articleHtml = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${displayTime}</title><style>body{font-family:sans-serif;background:#0d1117;color:#c9d1d9;max-width:800px;margin:0 auto;padding:20px;}.card{background:#161b22;border:1px solid #30363d;padding:20px;margin-bottom:15px;border-radius:8px;}h1{color:#58a6ff;}span{color:#ff4d4d;font-weight:bold;}</style></head><body><h1>📈 解析ログ: ${displayTime}</h1><p><a href="../index.html" style="color:#58a6ff;">← 戻る</a></p>${articles.map(a => `<div class="card"><span>注目度: ${a.traffic}</span><h2>${a.title}</h2><p>${a.description}</p></div>`).join('')}</body></html>`;
        fs.writeFileSync(path.join(ARCHIVE_DIR, fileName), articleHtml);

        // 2. アーカイブ一覧の取得
        const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.html')).sort().reverse().slice(0, 15);

        // 3. index.html の生成（SEOメタタグ自動埋め込み）
        const topTrend = articles[0]?.title || "最新ニュース";
        const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>【${topTrend}】急上昇トレンド解析ポータル</title>
    <meta name="description" content="${topTrend}など、${displayTime}現在の最新トレンド15選を自動解析中。">
    <style>
        body{font-family:-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;max-width:800px;margin:0 auto;padding:40px 20px;}
        h1{color:#58a6ff;text-align:center;}
        .latest{background:linear-gradient(45deg, #161b22, #0d1117);border:2px solid #58a6ff;padding:20px;border-radius:15px;margin-bottom:40px;}
        .archive-item{display:block;background:#161b22;padding:15px;margin-bottom:10px;border-radius:8px;text-decoration:none;color:#c9d1d9;border:1px solid #30363d;}
        .archive-item:hover{border-color:#58a6ff;}
        .tag{background:#238636;color:white;padding:2px 8px;border-radius:4px;font-size:12px;margin-right:10px;}
    </style>
</head>
<body>
    <h1>🚀 トレンド Intelligence</h1>
    <div class="latest">
        <h2>TOPIC: ${topTrend}</h2>
        <p>現在、日本で最も検索されているワードです。詳細はアーカイブを確認してください。</p>
        <p>同期時刻: ${displayTime}</p>
    </div>
    <h2>過去の解析ログ</h2>
    ${files.map(f => `<a href="./archive/${f}" class="archive-item"><span class="tag">LOG</span> ${f.replace('.html', '').replace('T', ' ')}</a>`).join('')}
</body>
</html>`;

        fs.writeFileSync('index.html', indexHtml);
        console.log(`[DONE] ${displayTime}`);
    } catch (err) {
        console.error(err);
    }
}
main();