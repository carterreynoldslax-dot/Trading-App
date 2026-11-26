import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from './src/lib/supabase';

type WatchItem = { id: string; symbol: string };
type Quote = {
  symbol: string;
  name?: string;
  price: number;
  currency?: string;
  datetime?: string;
  exchange?: string;
  source: string;
};

const colors = {
  background: '#0b1020', panel: '#121a2b', border: '#253047', text: '#f5f7fb',
  muted: '#9aa7bd', accent: '#a5f3c2', warning: '#f5c46b', red: '#ff8b8b',
};
const money = (value: number, currency?: string) => {
  if (!Number.isFinite(value)) return 'Price unavailable';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2,
  }).format(value);
};

export default function App() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(Boolean(supabase));
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(supabase
    ? 'Connecting to your private watchlist…'
    : 'Connect Supabase to save your watchlist and load market quotes.');

  const refreshQuotes = useCallback(async (symbols: string[]) => {
    if (!supabase || symbols.length === 0) return;
    const { data, error } = await supabase.functions.invoke('quotes', { body: { symbols } });
    if (error) throw error;
    if (!data || !Array.isArray(data.quotes)) throw new Error('The market-data service returned an unexpected response.');
    const next: Record<string, Quote> = {};
    for (const quote of data.quotes as Quote[]) {
      if (quote?.symbol && Number.isFinite(Number(quote.price))) next[quote.symbol] = { ...quote, price: Number(quote.price) };
    }
    setQuotes(current => ({ ...current, ...next }));
    const unavailable = data.unavailable as string[] | undefined;
    setMessage(unavailable?.length
      ? `Quotes updated. No quote returned for: ${unavailable.join(', ')}. Check the provider's ticker format or data access.`
      : `Quotes from Twelve Data · refreshed ${new Date().toLocaleTimeString()}`);
  }, []);

  const loadWatchlist = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      if (!session) throw new Error('Could not create a private session. Enable Anonymous Sign-Ins in Supabase Authentication.');
      const { data, error } = await supabase.from('watchlist').select('id,symbol').order('created_at', { ascending: true });
      if (error) throw error;
      const watchlist = (data ?? []) as WatchItem[];
      setItems(watchlist);
      if (watchlist.length) await refreshQuotes(watchlist.map(item => item.symbol));
      else setMessage('Your watchlist is ready. Add a ticker to get started.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load your watchlist.');
    } finally { setLoading(false); }
  }, [refreshQuotes]);

  useEffect(() => { void loadWatchlist(); }, [loadWatchlist]);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refreshQuotes(items.map(item => item.symbol)); }
    catch (error) { Alert.alert('Quote refresh failed', error instanceof Error ? error.message : 'Try again later.'); }
    finally { setRefreshing(false); }
  };

  const addSymbol = async () => {
    const normalized = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.^:-]{1,25}$/.test(normalized)) {
      Alert.alert('Check ticker', 'Enter a ticker, for example AAPL or a Twelve Data exchange-qualified symbol.');
      return;
    }
    if (items.some(item => item.symbol === normalized)) {
      Alert.alert('Already on your list', `${normalized} is already being watched.`);
      return;
    }
    setBusy(true);
    try {
      if (!supabase) throw new Error('Configure Supabase first; this app does not save watchlist data locally.');
      const { data, error } = await supabase.from('watchlist').insert({ symbol: normalized }).select('id,symbol').single();
      if (error) throw error;
      setItems(current => [...current, data]);
      setSymbol('');
      Keyboard.dismiss();
      try { await refreshQuotes([normalized]); }
      catch { setMessage(`${normalized} added. Quote unavailable; check the ticker format and Twelve Data access.`); }
    } catch (error) {
      Alert.alert('Could not add ticker', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  const removeSymbol = async (item: WatchItem) => {
    try {
      if (!supabase) return;
      const { error } = await supabase.from('watchlist').delete().eq('id', item.id);
      if (error) throw error;
      setItems(current => current.filter(entry => entry.id !== item.id));
      setQuotes(current => { const next = { ...current }; delete next[item.symbol]; return next; });
    } catch (error) {
      Alert.alert('Could not remove ticker', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PERSONAL MARKET MONITOR</Text>
            <Text style={styles.title}>Your market,</Text>
            <Text style={[styles.title, styles.titleAccent]}>at a glance.</Text>
          </View>
          <View style={styles.liveBadge}><View style={styles.dot} /><Text style={styles.liveText}>WATCHLIST</Text></View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.sectionLabel}>YOUR WATCHLIST</Text>
          <Text style={styles.summaryNumber}>{items.length}<Text style={styles.summaryCaption}> symbols tracked</Text></Text>
          <Text style={styles.help}>Pull down to refresh quotes. Data may be delayed or unavailable depending on ticker and plan.</Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={symbol}
            onChangeText={setSymbol}
            onSubmitEditing={() => void addSymbol()}
            placeholder="Add ticker (e.g. AAPL)"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            style={styles.input}
          />
          <TouchableOpacity style={[styles.addButton, busy && styles.disabled]} onPress={() => void addSymbol()} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.background} /> : <Text style={styles.addButtonText}>＋</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.listHeader}><Text style={styles.sectionLabel}>SYMBOLS</Text><Text style={styles.listHint}>TAP × TO REMOVE</Text></View>
        {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
        {!loading && items.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>A clear view starts here</Text><Text style={styles.help}>Add a stock or ETF ticker above. Example: AAPL for Apple.</Text></View>
        ) : null}
        {items.map(item => {
          const quote = quotes[item.symbol];
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardMain}>
                <View style={styles.symbolLine}>
                  <Text style={styles.ticker}>{item.symbol}</Text>
                  <TouchableOpacity onPress={() => void removeSymbol(item)} accessibilityLabel={`Remove ${item.symbol}`} style={styles.remove}><Text style={styles.removeText}>×</Text></TouchableOpacity>
                </View>
                <Text style={styles.company} numberOfLines={1}>{quote?.name || quote?.exchange || 'Waiting for quote'}</Text>
              </View>
              <View style={styles.quoteBlock}>
                <Text style={styles.price}>{quote ? money(quote.price, quote.currency) : '—'}</Text>
                <Text style={styles.currency}>{quote ? `${quote.currency || 'Currency unavailable'} · Twelve Data` : 'No quote yet'}</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Information, not investment advice</Text>
          <Text style={styles.noticeText}>Quotes are provided as returned by Twelve Data; availability and delay depend on your plan and exchange. This MVP does not generate buy/sell recommendations or place trades.</Text>
        </View>
        <Text style={styles.status}>{message}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 38 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.8, marginBottom: 12 },
  title: { color: colors.text, fontSize: 32, lineHeight: 37, fontWeight: '700', letterSpacing: -1 },
  titleAccent: { color: colors.accent },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  liveText: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  summary: { backgroundColor: colors.panel, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 16 },
  sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  summaryNumber: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 9 },
  summaryCaption: { fontSize: 14, color: colors.muted, fontWeight: '500' },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  input: { flex: 1, height: 50, color: colors.text, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 15, fontSize: 14 },
  addButton: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accent },
  addButtonText: { color: colors.background, fontSize: 26, fontWeight: '500', marginTop: -2 },
  disabled: { opacity: 0.6 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listHint: { color: colors.muted, fontSize: 9, letterSpacing: 1 },
  loader: { marginVertical: 24 },
  empty: { alignItems: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 24 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.panel, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingVertical: 15, paddingHorizontal: 15, marginBottom: 9 },
  cardMain: { flex: 1, marginRight: 8 },
  symbolLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticker: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  remove: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.muted, fontSize: 21, lineHeight: 22 },
  company: { color: colors.muted, fontSize: 11, marginTop: 5 },
  quoteBlock: { alignItems: 'flex-end' },
  price: { color: colors.text, fontSize: 16, fontWeight: '600' },
  currency: { color: colors.muted, fontSize: 9, marginTop: 5 },
  notice: { marginTop: 22, padding: 15, borderRadius: 14, backgroundColor: '#171c28', borderWidth: 1, borderColor: colors.border },
  noticeTitle: { color: colors.warning, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  noticeText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  status: { color: colors.muted, fontSize: 10, textAlign: 'center', lineHeight: 15, marginTop: 16 },
});
