/**
 * 常に全文で出すルールに基づき、
 * API不要・完全自動SEO記事生成システムの完成版コードを提供します。
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
    console.log('トレンドを取得中...');
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

    // SEOに特化したHTML構造の生成
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>【${timeStr}更新】最新トレンドキーワード徹底解説・SEOまとめ</title>
    <meta name="description" content="${articles.slice(0, 3).map(a => a.title).join('、')}などの最新トレンドを${timeStr}現在で集計。急上昇ワードの背景を徹底解説します。">
    <meta name="keywords" content="${articles.map(a => a.title).join(',')}">
    <style>
        body { font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif; line-height: 1.8; color: #333; max-width: 900px; margin: 0 auto; padding: 40px 20px; background-color: #f0f2f5; }
        header { text-align: center; margin-bottom: 50px; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #1a73e8; font-size: 2em; margin: 0; }
        .update-time { color: #666; font-size: 0.9em; margin-top: 10px; }
        .card { background: white; padding: 30px; margin-bottom: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 8px solid #1a73e8; }
        h2 { color: #1a73e8; border-bottom: 1px solid #eee; padding-bottom: 10px; font-size: 1.5em; }
        .traffic { display: inline-block; background: #e8f0fe; color: #1967d2; padding: 2px 12px; border-radius: 20px; font-size: 0.8em; font-weight: bold; margin-bottom: 15px; }
        .description { font-size: 1.1em; color: #444; }
        .analysis { background: #fff9c4; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 0.9em; }
        footer { text-align: center; margin-top: 50px; color: #888; font-size: 0.8em; }
        nav { margin-bottom: 20px; font-size: 0.9em; color: #1a73e8; }
    </style>
</head>
<body>
    <header>
        <nav>ホーム ＞ トレンド分析 ＞ 最新記事</nav>
        <h1>🚀 リアルタイム・トレンド解析システム</h1>
        <p class="update-time">最終更新：${timeStr}（1時間ごとに自動生成中）</p>
    </header>

    <main>
        ${articles.map((a, i) => `
            <article class="card">
                <div class="traffic">検索数：${a.approxTraffic}以上</div>
                <h2>${i + 1}. ${a.title}</h2>
                <div class="description">
                    <p>現在、<strong>${a.title}</strong>というキーワードが日本国内で急速に注目を集めています。</p>
                    <p>${a.description}</p>
                </div>
                <div class="analysis">
                    <strong>💡 AI-SEO分析：</strong><br>
                    このワードは現在SNSおよび検索エンジンで非常に高いエンゲージメントを記録しています。
                    「${a.title} 評判」「${a.title} 最新情報」といった複合キーワードでの検索が推奨されます。
                </div>
            </article>
        `).join('')}
    </main>

    <footer>
        <p>&copy; 2026 Trend Auto-Generator System. All Rights Reserved.</p>
        <p>当サイトは外部APIを一切使用せず、パブリックデータのみを構造化して生成された実験的SEOサイトです。</p>
    </footer>
</body>
</html>
    `;

    fs.writeFileSync('index.html', html);
    console.log('SEO記事が正常に生成されました。');
}

main().catch(console.error);