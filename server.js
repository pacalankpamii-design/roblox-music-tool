require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

// ---------------------------------------------------------
// 1) PRE-CHECK COPYRIGHT (pakai AudD.io)
//    Mengirim file audio ke AudD untuk dicocokkan dengan
//    database lagu ber-hak cipta. Hasil ini HANYA perkiraan,
//    bukan jaminan lolos/tidaknya di moderasi Roblox.
// ---------------------------------------------------------
app.post('/api/precheck', upload.array('files'), async (req, res) => {
  const results = [];

  for (const file of req.files) {
    try {
      const form = new FormData();
      form.append('api_token', process.env.AUDD_API_TOKEN);
      form.append('file', fs.createReadStream(file.path));
      form.append('return', 'apple_music,spotify');

      const response = await fetch('https://api.audd.io/', {
        method: 'POST',
        body: form,
      });
      const data = await response.json();

      const matched = data.status === 'success' && data.result;

      results.push({
        filename: file.originalname,
        tempPath: file.path,
        risky: !!matched,
        matchInfo: matched
          ? { title: data.result.title, artist: data.result.artist }
          : null,
      });
    } catch (err) {
      results.push({
        filename: file.originalname,
        tempPath: file.path,
        error: 'Gagal cek: ' + err.message,
      });
    }
  }

  res.json({ results });
});

// ---------------------------------------------------------
// 2) UPLOAD KE ROBLOX (Open Cloud Assets API)
//    Dipanggil per-file setelah user memilih mana yang mau
//    di-upload dari hasil precheck.
//    Docs resmi (cek lagi kalau ada perubahan):
//    https://create.roblox.com/docs/cloud/reference/Asset
// ---------------------------------------------------------
app.post('/api/upload', async (req, res) => {
  const { tempPath, displayName } = req.body;

  if (!tempPath || !fs.existsSync(tempPath)) {
    return res.status(400).json({ error: 'File tidak ditemukan di server' });
  }

  try {
    const requestPayload = {
      assetType: 'Audio',
      displayName: displayName || path.basename(tempPath),
      description: 'Uploaded via bulk music tool',
      creationContext: {
        creator:
          process.env.ROBLOX_CREATOR_TYPE === 'Group'
            ? { groupId: process.env.ROBLOX_CREATOR_ID }
            : { userId: process.env.ROBLOX_CREATOR_ID },
      },
    };

    const form = new FormData();
    form.append('request', JSON.stringify(requestPayload));
    form.append('fileContent', fs.createReadStream(tempPath), {
      filename: displayName || path.basename(tempPath),
      contentType: 'audio/mpeg',
    });

    const response = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ROBLOX_API_KEY,
      },
      body: form,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    // data berisi operationId untuk polling status moderasi.
    res.json({ success: true, operation: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 3) CEK STATUS OPERASI UPLOAD (moderasi Roblox butuh waktu)
// ---------------------------------------------------------
app.get('/api/upload-status/:operationId', async (req, res) => {
  try {
    const response = await fetch(
      `https://apis.roblox.com/assets/v1/operations/${req.params.operationId}`,
      { headers: { 'x-api-key': process.env.ROBLOX_API_KEY } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 4) CEK STATUS MODERASI ASSET (setelah upload selesai)
//    Beda dengan /api/upload-status: itu ngecek proses UPLOAD-nya
//    selesai atau belum. Ini ngecek hasil MODERASI Roblox terhadap
//    asset yang sudah jadi (moderationResult.moderationState).
//    Nilai dari Roblox: MODERATION_STATE_REVIEWING,
//    MODERATION_STATE_APPROVED, MODERATION_STATE_REJECTED
//    (kita sederhanakan jadi Reviewing / Approved / Rejected).
// ---------------------------------------------------------
app.get('/api/asset-moderation/:assetId', async (req, res) => {
  try {
    const response = await fetch(
      `https://apis.roblox.com/assets/v1/assets/${req.params.assetId}?readMask=moderationResult`,
      { headers: { 'x-api-key': process.env.ROBLOX_API_KEY } }
    );
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const rawState =
      (data.moderationResult && data.moderationResult.moderationState) || '';

    let status = 'Reviewing';
    if (rawState.includes('APPROVED')) status = 'Approved';
    else if (rawState.includes('REJECTED')) status = 'Rejected';

    res.json({ status, raw: rawState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
