import http from 'node:http';

const port = Number(process.env.PORT || 8080);
const apiKey = process.env.OPENAI_API_KEY;
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://joe-fu-iron.github.io';
const model = process.env.REALTIME_MODEL || 'gpt-realtime';

const instructions = `你是 AI 指揮官 CRAZY，使用繁體中文和使用者進行簡潔自然的語音對談。
你的任務是把需求整理成 CRAZY 可執行的單一指令。
可用格式：每日摘要、掃描缺漏、查看進度、查看今天行程、查看工作、查看未讀信、搜尋信件 關鍵字、搜尋文件 關鍵字、新增工作 名稱、記錄缺漏 內容、新增行程 YYYY-MM-DD HH:mm 名稱、新增專案 名稱。
資訊不足時先追問。查詢類指令可直接呼叫工具；新增工作、新增行程、新增專案、記錄缺漏屬於寫入操作，必須先口頭重述將執行的內容，取得使用者明確說「確認」或同義回答後，才可將 confirmed 設為 true 並呼叫工具。不要捏造日期或時間。`;

function corsHeaders(origin) {
  const accepted = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': accepted,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 100_000) {
        reject(new Error('Request too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json', ...headers});
    res.end(JSON.stringify({ok: true}));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/session') {
    res.writeHead(404, {'Content-Type': 'application/json', ...headers});
    res.end(JSON.stringify({error: 'Not found'}));
    return;
  }

  if (!apiKey) {
    res.writeHead(503, {'Content-Type': 'application/json', ...headers});
    res.end(JSON.stringify({error: 'Server API key is not configured'}));
    return;
  }

  if (origin !== allowedOrigin) {
    res.writeHead(403, {'Content-Type': 'application/json', ...headers});
    res.end(JSON.stringify({error: 'Origin not allowed'}));
    return;
  }

  try {
    const sdp = await readBody(req);
    const form = new FormData();
    form.set('sdp', sdp);
    form.set('session', JSON.stringify({
      type: 'realtime',
      model,
      instructions,
      output_modalities: ['audio'],
      audio: {
        input: {transcription: {model: 'gpt-4o-mini-transcribe'}},
        output: {voice: 'marin'}
      },
      tools: [{
        type: 'function',
        name: 'run_crazy_command',
        description: '需求已釐清後，將一個 CRAZY 指令送回工作系統。寫入操作必須先取得口頭確認。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            command: {type: 'string', description: '完全符合 CRAZY 支援格式的單一指令'},
            confirmed: {type: 'boolean', description: '寫入操作是否已取得使用者明確確認'}
          },
          required: ['command', 'confirmed']
        }
      }],
      tool_choice: 'auto'
    }));

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {Authorization: `Bearer ${apiKey}`},
      body: form
    });
    const body = await response.text();
    res.writeHead(response.status, {'Content-Type': response.headers.get('content-type') || 'text/plain', ...headers});
    res.end(body);
  } catch (error) {
    res.writeHead(500, {'Content-Type': 'application/json', ...headers});
    res.end(JSON.stringify({error: error.message || 'Internal error'}));
  }
});

server.listen(port, () => {
  console.log(`CRAZY Realtime bridge listening on ${port}`);
});

