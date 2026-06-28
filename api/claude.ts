export const config = {
  runtime: 'edge',
}

// In-memory map for basic IP rate limiting on Edge
const rateLimitMap = new Map<string, { count: number, resetAt: number }>()

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- RATE LIMITING ---
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (record) {
    if (now > record.resetAt) {
      // Reset window (24 hours)
      rateLimitMap.set(ip, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 })
    } else {
      if (record.count >= 10) {
        return new Response(JSON.stringify({ error: 'Too Many Requests. Limit reached.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      record.count += 1
    }
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 })
  }
  // --- END RATE LIMITING ---

  const { prompt } = await req.json()

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get key from secure backend env
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing CLAUDE_API_KEY on backend' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: `Claude API error: ${res.status} ${errText.slice(0, 200)}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to reach Claude API' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
