/**
 * 【全文コード】記事蓄積型・最強SEO自動生成システム
 * 1. 常に最新の index.html を更新
 * 2. 過去のトレンドも archive/ フォルダに自動保存
 */
const fs = require('fs');
const https = require('https');
const path = require('path');

const RSS_URL = 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP';

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
        const rssData = await fetch(RSS_URL);
        const items = rssData.match(/<item>([\s\S]*?)<\/item>/g) || [];
        const articles = items.slice(0, 15).map(item => {
            const title = (item.match(/<title>([\s\S]*?)<\/title>/) || [null, "トレンド"])[1];
            const description = (item.match(/<description>([\s\S]*?)<\/description>/) || [null, "最新情報"])[1];
            return { title, description };
        });

        const now = new Date();
        const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        const dateStr = jstNow.toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, '-'); // ファイル名用
        const displayTime = jstNow.toLocaleString('ja-JP');

        // HTML生成
        const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>トレンド解析ポータル - ${displayTime}</title>
    <style>
        body { font-family: sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; }
        .card { background: #161b22; border: 1px solid #30363d; padding: 15px; margin-bottom: 10px; border-radius: 8px; }
        h1 { color: #58a6ff; }
        h2 { color: #fff; font-size: 1.1rem; }
        .time { font-size: 0.8rem; color: #8b949e; }
    </style>
</head>
<body>
    <h1>🚀 爆速トレンド解析</h1>
    <p class="time">同期時刻: ${displayTime}</p>
    ${articles.map(a => `<div class="card"><h2>${a.title}</h2><p>${a.description}</p></div>`).join('')}
    <hr>
    <footer><a href="./archive/" style="color:#58a6ff;">過去のアーカイブを見る</a></footer>
</body>
</html>`;

        // 1. 最新版として index.html を保存
        fs.writeFileSync('index.html', htmlContent);

        // 2. 過去ログとして archive フォルダに保存
        const archiveDir = './archive';
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);
        fs.writeFileSync(path.join(archiveDir, `${dateStr}.html`), htmlContent);

        console.log(`[Success] ページ生成完了: ${displayTime}`);
    } catch (err) {
        console.error(err);
    }
}
main();