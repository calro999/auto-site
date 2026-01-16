/**
 * 【全文コード】自己増殖型アーカイブシステム
 * 1. 実行のたびに archive フォルダへ記事を保存
 * 2. index.html に最新10件のリンクを自動リストアップ
 */
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
        console.log('--- トレンドデータ取得中 ---');
        const rssData = await fetch(RSS_URL);
        const items = rssData.match(/<item>([\s\S]*?)<\/item>/g) || [];
        const articles = items.slice(0, 15).map(item => {
            const title = (item.match(/<title>([\s\S]*?)<\/title>/) || [null, "トレンド"])[1];
            const description = (item.match(/<description>([\s\S]*?)<\/description>/) || [null, "詳細なし"])[1];
            return { title, description };
        });

        // 日本時間の取得
        const jstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = jstNow.toLocaleString('ja-JP');
        // ファイル名用に「:」などを除外
        const fileSafeTime = jstNow.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `${fileSafeTime}.html`;

        // 1. archiveディレクトリがなければ作成
        if (!fs.existsSync(ARCHIVE_DIR)) {
            fs.mkdirSync(ARCHIVE_DIR);
        }

        // 2. 個別のアーカイブHTMLを生成して保存
        const articleHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${displayTime} のトレンド解析</title>
    <style>
        body { font-family: sans-serif; background: #0d1117; color: #c9d1d9; max-width: 800px; margin: 0 auto; padding: 20px; }
        .card { background: #161b22; border: 1px solid #30363d; padding: 20px; margin-bottom: 15px; border-radius: 8px; }
        h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
        h2 { color: #fff; margin-top: 0; }
        a { color: #58a6ff; text-decoration: none; }
    </style>
</head>
<body>
    <h1>🚀 アーカイブ: ${displayTime}</h1>
    <p><a href="../index.html">← トップページへ戻る</a></p>
    ${articles.map(a => `<div class="card"><h2>${a.title}</h2><p>${a.description}</p></div>`).join('')}
</body>
</html>`;
        fs.writeFileSync(path.join(ARCHIVE_DIR, fileName), articleHtml);

        // 3. archiveフォルダ内の全ファイルを読み込み、最新10件のリストを作る
        const files = fs.readdirSync(ARCHIVE_DIR)
            .filter(file => file.endsWith('.html'))
            .sort()
            .reverse() // 新しい順に並べる
            .slice(0, 10);

        // 4. index.html (メインのポータル画面) を生成
        const indexHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>爆速トレンド・自動解析ポータル</title>
    <style>
        body { font-family: -apple-system, sans-serif; background: #0d1117; color: #c9d1d9; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        header { text-align: center; margin-bottom: 40px; }
        h1 { color: #58a6ff; font-size: 2rem; }
        .latest-box { background: #161b22; border: 2px solid #238636; padding: 20px; border-radius: 12px; margin-bottom: 40px; }
        .archive-section { border-top: 1px solid #30363d; padding-top: 30px; }
        ul { list-style: none; padding: 0; }
        li { margin-bottom: 12px; padding: 10px; background: #161b22; border-radius: 6px; border: 1px solid #30363d; }
        a { color: #58a6ff; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
        .time-badge { font-size: 0.7rem; color: #8b949e; display: block; }
    </style>
</head>
<body>
    <header>
        <h1>🚀 トレンド自動解析ポータル</h1>
        <p>5分おきにインターネットの流行を自動収集しています。</p>
    </header>

    <div class="latest-box">
        <h2 style="color: #238636; margin-top:0;">NOW TRENDING (${displayTime})</h2>
        <p>最新のトレンドは ${files.length > 0 ? `<a href="./archive/${files[0]}">こちらの個別ページ</a>` : '生成中'} で確認できます。</p>
        <div style="font-size: 0.9rem;">
            ${articles.slice(0, 5).map(a => `・ ${a.title}`).join('<br>')}
        </div>
    </div>

    <div class="archive-section">
        <h2>過去のアーカイブ (最新10件)</h2>
        <ul>
            ${files.map(file => {
                const prettyName = file.replace('.html', '').replace(/-/g, '/').replace('T', ' ');
                return `<li><a href="./archive/${file}">${prettyName} のデータ</a></li>`;
            }).join('')}
        </ul>
    </div>

    <footer style="text-align:center; margin-top:60px; font-size:10px; color:#444;">
        SERVERLESS TREND ENGINE / UPDATING EVERY 5 MIN
    </footer>
</body>
</html>`;

        fs.writeFileSync('index.html', indexHtml);
        console.log(`[成功] 全行程完了：${displayTime}`);
    } catch (err) {
        console.error('[エラー]', err);
    }
}

main();