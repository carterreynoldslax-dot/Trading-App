import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
const colors = {
  background: '#0b1020', panel: '#121a2b', border: '#253047', text: '#f5f7fb',
  muted: '#9aa7bd', accent: '#a5f3c2', warning: '#f5c46b',
};

export default function App() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(Boolean(supabase));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(supabase ? 'Connecting to your private watchlist…' : 'Set up Supabase to save your watchlist across sessions.');

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
      if (!session) throw new Error('Could not create a private session. Check Supabase anonymous sign-in settings.');
      const { data, error } = await supabase.from('watchlist').select('id,symbol').order('created_at', { ascending: true });
      if (error) throw error;
      setItems(data ?? []);
      setMessage('Watchlist synced securely with Supabase.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the watchlist.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadWatchlist(); }, [loadWatchlist]);

  const addSymbol = async () => {
    const normalized = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9.^-]{1,15}$/.test(normalized)) {
      Alert.alert('Check ticker', 'Enter a ticker symbol, for example AAPL or SHOP.TO.');
      return;
    }
    if (items.some(item => item.symbol === normalized)) {
      Alert.alert('Already on your list', `${normalized} is already being watched.`);
      return;
    }
    setBusy(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.from('watchlist').insert({ symbol: normalized }).select('id,symbol').single();
        if (error) throw error;
        setItems(current => [...current, data]);
        setMessage('Watchlist synced securely with Supabase.');
      } else {
        setItems(current => [...current, { id: `${Date.now()}`, symbol: normalized }]);
        setMessage('Saved on this screen only. Connect Supabase to keep your watchlist.');
      }
      setSymbol('');
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert('Could not add ticker', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  const removeSymbol = async (item: WatchItem) => {
    try {
      if (supabase) {
        const { error } = await supabase.from('watchlist').delete().eq('id', item.id);
        if (error) throw error;
      }
      setItems(current => current.filter(entry => entry.id !== item.id));
    } catch (error) {
      Alert.alert('Could not remove ticker', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>PERSONAL MARKET MONITOR</Text><Text style={styles.title}>Your market,{