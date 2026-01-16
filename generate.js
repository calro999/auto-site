/**
 * 【全文コード】自己増殖型アーカイブシステム
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

        const jstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const displayTime = jstNow.toLocaleString('ja-JP');
        const fileSafeTime = jstNow.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `${fileSafeTime}.html`;

        if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);

        const articleHtml = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${displayTime}</title><style>body{font-family:sans-serif;background:#0d1117;color:#c9d1d9;max-width:800px;margin:0 auto;padding:20px;}.card{background:#161b22;border:1px solid #30363d;padding:20px;margin-bottom:15px;border-radius:8px;}h1{color:#58a6ff;}a{color:#58a6ff;text-decoration:none;}</style></head><body><h1>🚀 アーカイブ: ${displayTime}</h1><p><a href="../index.html">← トップに戻る</a></p>${articles.map(a => `<div class="card"><h2>${a.title}</h2><p>${a.description}</p></div>`).join('')}</body></html>`;
        fs.writeFileSync(path.join(ARCHIVE_DIR, fileName), articleHtml);

        const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.html')).sort().reverse().slice(0, 10);

        const indexHtml = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>爆速トレンド・ポータル</title><style>body{font-family:sans-serif;background:#0d1117;color:#c9d1d9;max-width:800px;margin:0 auto;padding:40px 20px;}h1{color:#58a6ff;}.box{background:#161b22;border:2px solid #238636;padding:20px;border-radius:12px;margin-bottom:40px;}ul{list-style:none;padding:0;}li{margin-bottom:12px;padding:10px;background:#161b22;border-radius:6px;border:1px solid #30363d;}a{color:#58a6ff;text-decoration:none;font-weight:bold;}</style></head><body><h1>🚀 トレンド自動解析ポータル</h1><div class="box"><h2>NOW TRENDING (${displayTime})</h2><p>最新の詳細はアーカイブリンクから確認できます。</p></div><div><h2>過去のアーカイブ (最新10件)</h2><ul>${files.map(file => `<li><a href="./archive/${file}">${file.replace('.html', '').replace('T', ' ')} のデータ</a></li>`).join('')}</ul></div></body></html>`;

        fs.writeFileSync('index.html', indexHtml);
        console.log(`[成功] 更新完了：${displayTime}`);
    } catch (err) {
        console.error(err);
    }
}
main();