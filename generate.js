/**
 * 【全文コード】API不要・完全自動SEO記事生成システム（パワーアップ版）
 * 常に全文で出力し、細部まで調整を行っています。
 */
const fs = require('fs');
const https = require('https');

// トレンド取得元（Googleトレンド RSS）
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
    console.log('トレンドデータを取得中...');
    const rssData = await fetch(RSS_URL);
    
    // RSSからトレンドワードと詳細を抽出
    const items = rssData.match(/<item>([\s\S]*?)<\/item>/g) || [];
    const articles = items.slice(0, 10).map(item => {
        const title = item.match(/<title>([\s\S]*?)<\/title>/)[1];
        const description = item.match(/<description>([\s\S]*?)<\/description>/)[1];
        const approxTraffic = item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || '多数';
        return { title, description, approxTraffic };
    });

    const now = new Date();
    const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;

    // SEOと利便性を両立した最強テンプレート
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>【最新】今話題のトレンドまとめ - ${timeStr}更新</title>
    <meta name="description" content="${articles.slice(0, 3).map(a => a.title).join('、')}などの急上昇ワードを解説。">
    <style>
        :root { --primary: #1a73e8; --bg: #f8f9fa; }
        body { font-family: "Segoe UI", Meiryo, sans-serif; line-height: 1.8; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: var(--bg); }
        header { background: white; padding: 30px; border-radius: 20px; text-align: center; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        h1 { color: var(--primary); font-size: 1.8rem; margin: 0; }
        .card { background: white; padding: 25px; margin-bottom: 25px; border-radius: 20px; box-shadow: 0 2px 15px rgba(0,0,0,0.05); transition: 0.3s; }
        .card:hover { transform: translateY(-5px); }
        h2 { color: var(--primary); font-size: 1.4rem; border-left: 5px solid var(--primary); padding-left: 15px; }
        .traffic-badge { background: #e8f0fe; color: #1967d2; padding: 4px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: bold; }
        .btn { display: inline-block; padding: 10px 20px; background: var(--primary); color: white; text-decoration: none; border-radius: 10px; font-size: 0.9rem; margin-top: 15px; }
        footer { text-align: center; font-size: 0.8rem; color: #999; margin-top: 50px; }
    </style>
</head>
<body>
    <header>
        <h1>📈 リアルタイム・トレンド・アーカイブ</h1>
        <p>自動更新時刻: ${timeStr}</p>
    </header>

    <main>
        ${articles.map((a, i) => `
            <section class="card">
                <span class="traffic-badge">検索数: ${a.approxTraffic}回以上</span>
                <h2>${i + 1}. ${a.title}</h2>
                <p>${a.description}</p>
                <div class="analysis" style="font-size: 0.9rem; color: #666; background: #fffde7; padding: 10px; border-radius: 10px;">
                    <strong>SEO分析:</strong> 「${a.title}」は今、最も注目されているキーワードです。関連情報をチェックしましょう。
                </div>
                <a href="https://www.google.com/search?q=${encodeURIComponent(a.title)}" target="_blank" class="btn">Googleで詳しく調べる</a>
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title + 'について詳しく知る ' + 'https://' + (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : ''))}" target="_blank" class="btn" style="background: #000;">Xでシェア</a>
            </section>
        `).join('')}
    </main>

    <footer>
        <p>このサイトはAPIを一切使用せず、パブリックデータをGitHub Actionsで1時間ごとに再構築しています。</p>
        <p>&copy; 2026 Auto Trend System</p>
    </footer>
</body>
</html>
    `;

    fs.writeFileSync('index.html', html);
    console.log('記事が正常に生成されました。');
}

main().catch(console.error);