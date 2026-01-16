/**
 * 常に全文で出すルールに基づき、
 * Vercel公開・匿名性重視・最強SEO自動生成システムの完成版を提供します。
 */
const fs = require('fs');
const https = require('https');

const RSS_URL = 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP';

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function main() {
    console.log('--- トレンド集計開始 ---');
    try {
        const rssData = await fetch(RSS_URL);
        const items = rssData.match(/<item>([\s\S]*?)<\/item>/g) || [];
        
        const articles = items.slice(0, 15).map(item => {
            const title = item.match(/<title>([\s\S]*?)<\/title>/)[1];
            const description = item.match(/<description>([\s\S]*?)<\/description>/)[1];
            const approxTraffic = item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || '多数';
            return { title, description, approxTraffic };
        });

        const now = new Date();
        const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}時`;

        const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>【最新】急上昇トレンドキーワードまとめ - ${timeStr}更新</title>
    <meta name="description" content="${articles.slice(0, 5).map(a => a.title).join(', ')}など、今話題のニュースを徹底網羅。">
    <style>
        :root { --main: #0070f3; --text: #333; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #fafafa; color: var(--text); line-height: 1.6; margin: 0; padding: 0; }
        .container { max-width: 800px; margin: 40px auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        h1 { font-size: 24px; color: var(--main); border-left: 8px solid var(--main); padding-left: 15px; margin-bottom: 10px; }
        .timestamp { font-size: 14px; color: #888; margin-bottom: 30px; }
        .item { border-bottom: 1px solid #eee; padding: 25px 0; }
        .item:last-child { border: none; }
        .traffic-count { font-size: 12px; font-weight: bold; color: white; background: #ff4d4d; padding: 2px 10px; border-radius: 10px; margin-bottom: 10px; display: inline-block; }
        h2 { font-size: 20px; margin: 10px 0; color: #111; }
        .desc { color: #666; font-size: 16px; }
        .link { display: inline-block; margin-top: 15px; color: var(--main); text-decoration: none; font-weight: bold; }
        footer { text-align: center; padding: 40px; font-size: 12px; color: #aaa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 爆速トレンド解析アーカイブ</h1>
        <div class="timestamp">更新時刻: ${timeStr} (1時間自動更新システム稼働中)</div>
        
        ${articles.map((a, i) => `
            <div class="item">
                <div class="traffic-count">検索数: ${a.approxTraffic}回以上</div>
                <h2>${i + 1}. ${a.title}</h2>
                <p class="desc">${a.description}</p>
                <a class="link" href="https://www.google.com/search?q=${encodeURIComponent(a.title)}" target="_blank">このキーワードの背景を調べる ＞</a>
            </div>
        `).join('')}
    </div>
    <footer>
        <p>当サイトはAPIを使用せず、最新トレンドを構造化して提供する検証サイトです。</p>
        <p>&copy; 2026 Trend System</p>
    </footer>
</body>
</html>`;

        fs.writeFileSync('index.html', html);
        console.log('記事の生成に成功しました！');
    } catch (e) {
        console.error('エラー:', e);
    }
}

main();