// Supabase Edge Function: keep TWELVE_DATA_API_KEY server-side.
// Supabase's gateway verifies the user's JWT before this handler runs.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);

  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!apiKey || !supabaseUrl || !anonKey) return json({ error: 'Server is not configured. Set Twelve Data and Supabase function secrets.' }, 503);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Sign in required' }, 401);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'Invalid session' }, 401);

  let body: { symbols?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (!Array.isArray(body.symbols)) return json({ error: 'symbols must be an array' }, 400);
  const symbols = [...new Set(body.symbols
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim().toUpperCase())
    .filter(value => /^[A-Z0-9.^:-]{1,25}$/.test(value)))].slice(0, 8);
  if (!symbols.length) return json({ quotes: [], unavailable: [] });

  const url = new URL('https://api.twelvedata.com/quote');
  url.searchParams.set('symbol', symbols.join(','));
  url.searchParams.set('apikey', apiKey);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok || (payload?.status === 'error')) {
      // Do not echo the provider URL or API key in error output.
      return json({ error: payload?.message || `Twelve Data request failed (${response.status}).` }, response.status === 429 ? 429 : 502);
    }
    const records = Array.isArray(payload) ? payload : (payload && typeof payload === 'object' && !payload.symbol ? [] : null);
    const bySymbol: Record<string, any> = {};
    if (records) {
      for (const record of records) if (record?.symbol) bySymbol[String(record.symbol).toUpperCase()] = record;
    } else if (payload && typeof payload === 'object') {
      for (const [key, record] of Object.entries(payload)) {
        if (record && typeof record === 'object' && 'symbol' in record) bySymbol[key.toUpperCase()] = record;
      }
    }
    const quotes = symbols.flatMap(symbol => {
      const item = bySymbol[symbol];
      const price = Number(item?.price ?? item?.close);
      if (!item || !Number.isFinite(price)) return [];
      return [{
        symbol,
        name: typeof item.name === 'string' ? item.name : undefined,
        exchange: typeof item.exchange === 'string' ? item.exchange : undefined,
        currency: typeof item.currency === 'string' ? item.currency : undefined,
        datetime: typeof item.datetime === 'string' ? item.datetime : undefined,
        price,
        source: 'Twelve Data',
      }];
    });
    return json({ quotes, unavailable: symbols.filter(symbol => !quotes.some(quote => quote.symbol === symbol)) });
  } catch {
    return json({ error: 'Could not reach Twelve Data. Check the function logs and try again.' }, 502);
  }
});
