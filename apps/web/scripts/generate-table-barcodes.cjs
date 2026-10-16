const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const outputDir = path.resolve('D:/Work/Programming/PZ/table-barcodes');
const artifactDir = path.resolve('C:/Users/HP/.gemini/antigravity-ide/brain/32c4f52f-2441-4244-9c1a-2ac76b64306d');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

const networkIp = '172.16.0.148';
const port = '3001';
const facilityId = 14; // ProjectZ Flagship Cafe & Store
const facilityName = 'ProjectZ Flagship Cafe & Store';
const facilityAddress = 'Jl. Senopati No. 45, Kebayoran Baru';

const tables = [
  { id: '1', label: 'TABLE 1', code: 'T-01' },
  { id: '2', label: 'TABLE 2', code: 'T-02' },
  { id: '3', label: 'TABLE 3', code: 'T-03' },
  { id: '4', label: 'TABLE 4', code: 'T-04' },
  { id: '5', label: 'TABLE 5', code: 'T-05' },
  { id: '6', label: 'TABLE 6', code: 'T-06' },
  { id: '7', label: 'TABLE 7', code: 'T-07' },
  { id: '8', label: 'TABLE 8', code: 'T-08' },
];

async function generate() {
  console.log('Generating QR barcodes for tables...');
  const placards = [];

  for (const t of tables) {
    const networkUrl = `http://${networkIp}:${port}/order/table?facilityId=${facilityId}&tableNumber=${encodeURIComponent(t.code)}`;
    const localUrl = `http://localhost:${port}/order/table?facilityId=${facilityId}&tableNumber=${encodeURIComponent(t.code)}`;

    // High-res PNG for mobile Wi-Fi scan
    const networkFile = path.join(outputDir, `table-${t.code}-wifi.png`);
    await QRCode.toFile(networkFile, networkUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    // Copy to artifacts for embedding
    const artifactFile = path.join(artifactDir, `table_${t.code}_wifi.png`);
    fs.copyFileSync(networkFile, artifactFile);

    // Data URL for self-contained HTML
    const dataUrl = await QRCode.toDataURL(networkUrl, {
      width: 320,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });

    placards.push({
      ...t,
      networkUrl,
      localUrl,
      dataUrl,
    });
  }

  // Generate beautiful self-contained HTML placard printable file
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Table Barcodes Placards - ProjectZ</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: #0f172a;
      color: #1e293b;
      padding: 2rem;
    }

    .toolbar {
      max-width: 1000px;
      margin: 0 auto 2rem auto;
      display: flex;
      justifyContent: space-between;
      align-items: center;
      background: #1e293b;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      color: #f8fafc;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    .btn-print {
      background: #6366f1;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.5rem;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-print:hover { background: #4f46e5; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .card {
      background: #ffffff;
      border-radius: 20px;
      padding: 2rem 1.5rem;
      text-align: center;
      border: 3px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
      align-items: center;
      page-break-inside: avoid;
    }

    .logo-badge {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #6366f1;
      text-transform: uppercase;
      margin-bottom: 0.25rem;
    }

    .store-name {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0f172a;
    }

    .store-address {
      font-size: 0.72rem;
      color: #64748b;
      margin-top: 0.15rem;
      max-width: 220px;
    }

    .qr-box {
      margin: 1.25rem 0 1rem 0;
      padding: 0.75rem;
      background: #f8fafc;
      border-radius: 16px;
      border: 2px solid #e2e8f0;
    }

    .qr-box img {
      width: 190px;
      height: 190px;
      display: block;
    }

    .table-title {
      font-size: 1.6rem;
      font-weight: 900;
      letter-spacing: -0.03em;
      color: #0f172a;
    }

    .scan-label {
      font-size: 0.85rem;
      font-weight: 700;
      color: #475569;
      margin-top: 0.35rem;
    }

    .instruction {
      font-size: 0.72rem;
      color: #94a3b8;
      margin-top: 0.25rem;
      line-height: 1.3;
      max-width: 220px;
    }

    .url-tag {
      margin-top: 0.75rem;
      font-size: 0.65rem;
      color: #94a3b8;
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
      word-break: break-all;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .toolbar { display: none; }
      .grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5cm;
      }
      .card {
        box-shadow: none;
        border: 2px solid #cbd5e1;
        break-inside: avoid;
        margin-bottom: 1cm;
      }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <div>
      <h2 style="font-size: 1.15rem; font-weight: 800;">Project Z Table Barcode Placards</h2>
      <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.2rem;">
        Print these cards for dining tables. Diners scan with their smartphone camera to order.
      </p>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Print All Placards</button>
  </div>

  <div class="grid">
    ${placards
      .map(
        (p) => `
    <div class="card">
      <div class="logo-badge">✦ PROJECT Z CAFE ✦</div>
      <div class="store-name">${facilityName}</div>
      <div class="store-address">${facilityAddress}</div>

      <div class="qr-box">
        <img src="${p.dataUrl}" alt="QR Code for Table ${p.code}" />
      </div>

      <div class="table-title">TABLE ${p.id}</div>
      <div class="scan-label">Scan Camera to Order</div>
      <div class="instruction">Point your mobile phone camera at the code above to view the digital menu & place your order.</div>

      <div class="url-tag">${p.networkUrl}</div>
    </div>
    `
      )
      .join('\n')}
  </div>

</body>
</html>`;

  const htmlFile = path.join(outputDir, 'print-table-placards.html');
  fs.writeFileSync(htmlFile, htmlContent, 'utf-8');

  console.log('Successfully generated:');
  console.log(`- ${placards.length} high-res PNG barcodes in: ${outputDir}`);
  console.log(`- Printable HTML placards in: ${htmlFile}`);
  console.log(`- Artifacts copied to: ${artifactDir}`);
}

generate().catch(console.error);
