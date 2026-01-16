const fs = require('fs');
const https = require('https');

// 1. Googleトレンド（RSS）から最新キーワードを取得
const RSS_URL = 'https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP';

https.get(RSS_URL, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        // 簡易的な正規表現によるパース（XML解析ライブラリすら使わない無料・軽量化）
        const items = data.match(/<item>([\s\S]*?)<\/item>/g) || [];
        const topNews = items.slice(0, 5).map(item => {
            const title = item.match(/<title>([\s\S]*?)<\/title>/)[1];
            const description = item.match(/<description>([\s\S]*?)<\/description>/)[1];
            return { title, description };
        });

        generateStaticSite(topNews);
    });
});

function generateStaticSite(news) {
    const now = new Date().toLocaleString('ja-JP');
    
    // 2. SEO最強テンプレートへの流し込み
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>【最新】今話題のトレンドまとめ - ${now}更新</title>
    <meta name="description" content="${news.map(n => n.title).join(', ')}など、今この瞬間に検索されているトレンドワードを徹底解説。">
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { color: #0056b3; border-bottom: 2px solid #0056b3; }
        .article { background: #f9f9f9; padding: 15px; margin-bottom: 20px; border-radius: 8px; border-left: 5px solid #0056b3; }
        .footer { font-size: 0.8em; color: #777; text-align: center; }
    </style>
</head>
<body>
    <h1>🚀 爆速トレンドニュース (自動更新中)</h1>
    <p>更新時刻: ${now}</p>
    
    ${news.map(n => `
        <div class="article">
            <h2>${n.title} とは？なぜ今検索されているのか</h2>
            <p>${n.description}</p>
            <p><strong>SEOキーワード:</strong> ${n.title}, 最新, 評判, まとめ</p>
        </div>
    `).join('')}

    <hr>
    <div class="footer">
        <p>このサイトはAPIを一切使わず、GitHub Actionsによって1時間に1回自動生成されています。</p>
    </div>
</body>
</html>
    `;

    fs.writeFileSync('index.html', html);
    console.log('記事が生成されました！');
}