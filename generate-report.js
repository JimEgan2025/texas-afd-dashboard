const fetch = require('node-fetch');
const fs = require('fs-extra');
const cheerio = require('cheerio');
const path = require('path');

const offices = [
  {code: 'AMA', region: 'Panhandle/Plains', name: 'Amarillo'},
  {code: 'LUB', region: 'South Plains', name: 'Lubbock'},
  {code: 'MAF', region: 'Permian Basin', name: 'Midland/Odessa'},
  {code: 'EPZ', region: 'West Texas/El Paso', name: 'El Paso'},
  {code: 'SJT', region: 'Concho Valley', name: 'San Angelo'},
  {code: 'GRK', region: 'Central Texas', name: 'Fort Hood'},
  {code: 'EWX', region: 'South Central/Austin', name: 'New Braunfels'},
  {code: 'FWD', region: 'North Texas/Dallas', name: 'Fort Worth'},
  {code: 'SHV', region: 'East Texas', name: 'Shreveport'},
  {code: 'HGX', region: 'Houston/Gulf Coast', name: 'Houston/Galveston'},
  {code: 'CRP', region: 'Coastal Bend', name: 'Corpus Christi'},
  {code: 'BRO', region: 'Rio Grande Valley', name: 'Brownsville'},
  {code: 'LCH', region: 'SE Texas', name: 'Lake Charles'}
];

async function fetchKeyMessages(code) {
  try {
    const url = `https://forecast.weather.gov/product.php?site=NWS&issuedby=${code}&product=AFD`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TexasWeatherHub/1.0' }
    });
    const text = await response.text();
    const $ = cheerio.load(text);
    const afdText = $('#currentbodytext').text() || text;

    const match = afdText.match(/\.KEY MESSAGES\.\.\.([\s\S]*?)(?=\n\.\w|\n&&|$)/i);
    return match ? match[1].trim().replace(/\n/g, '<br>') : 'No key messages found.';
  } catch (e) {
    return `<span style="color:red">Error: ${e.message}</span>`;
  }
}

async function generate() {
  let allThemes = new Set();
  let sections = [];
  let successCount = 0;

  for (const office of offices) {
    const keyMsg = await fetchKeyMessages(office.code);
    const themes = keyMsg.toLowerCase().match(/\b(dry|warm|front|rain|fire|severe|wind|drought|heat|flood)\b/g) || [];
    themes.forEach(t => allThemes.add(t));

    if (!keyMsg.includes('Error') && !keyMsg.includes('No key messages')) successCount++;

    sections.push(`
      <div style="background:white;margin:15px 0;padding:20px;border-radius:8px;box-shadow:0 2px 4px #ccc;">
        <h2 style="color:#dc2626;margin-top:0;">${office.region} - ${office.name} (${office.code})</h2>
        <div style="line-height:1.6;white-space:pre-wrap;">${keyMsg}</div>
      </div>`);
  }

  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const themesHtml = Array.from(allThemes).sort().map(t => `<li>${t.charAt(0).toUpperCase() + t.slice(1)}</li>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Texas AFD Key Messages Report</title>
  <style>
    body{font-family:Arial,sans-serif;margin:20px;background:#f0f8ff;color:#333;line-height:1.6}
    h1{text-align:center;color:#1e40af}
    h2{color:#dc2626;border-bottom:2px solid #1e40af;padding-bottom:5px}
    #summary{background:#d1fae5;padding:20px;border-radius:8px;margin:20px 0}
    ul{columns:2}
  </style>
</head>
<body>
  <h1>Texas NWS AFD Key Messages Report</h1>
  <p style="text-align:center;color:#666">Generated: ${timestamp} | ${successCount}/13 offices</p>
  <div id="summary">
    <h2>Statewide Themes</h2>
    ${themesHtml ? `<ul>${themesHtml}</ul>` : '<p>No common themes detected</p>'}
  </div>
  ${sections.join('')}
</body>
</html>`;

  await fs.ensureDir('output');
  await fs.writeFile(path.join('output', 'texas-afd-report.html'), html);
  console.log('Saved to output/texas-afd-report.html');
}

generate().catch(console.error);
