import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { ROUTES, CategoryId, Difficulty } from '@/data/routes-data';
import { useUserRoutes } from '@/hooks/useUserRoutes';
import AddRouteModal from '@/components/AddRouteModal';

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES: { id: CategoryId; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'all',      label: 'Все',       icon: 'apps-outline',       color: '#90CAF9' },
  { id: 'beach',    label: 'Пляжные',   icon: 'sunny-outline',      color: '#FFCC80' },
  { id: 'mountain', label: 'Горные',    icon: 'trail-sign-outline', color: '#A5D6A7' },
  { id: 'city',     label: 'Города',    icon: 'business-outline',   color: '#90CAF9' },
  { id: 'road',     label: 'Авто',      icon: 'car-outline',        color: '#CE93D8' },
  { id: 'active',   label: 'Активные',  icon: 'bicycle-outline',    color: '#80DEEA' },
  { id: 'romantic', label: 'Романтика', icon: 'heart-outline',      color: '#F48FB1' },
];

const DIFF_COLOR: Record<Difficulty, string> = {
  'лёгкий':  '#A5D6A7',
  'средний': '#FFCC80',
  'сложный': '#EF9A9A',
};

const PAGE_SIZE = 20;

// ─── Component ────────────────────────────────────────────────────────────────
export default function RoutesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const { userRoutes, loading: ugcLoading, addRoute } = useUserRoutes();
  const [showAddModal, setShowAddModal] = useState(false);

  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showSearch, setShowSearch] = useState(false);

  const catConfig = CATEGORIES.find(c => c.id === activeCategory)!;

  const allRoutes = useMemo(() => [...userRoutes, ...ROUTES], [userRoutes]);

  const filtered = useMemo(() => {
    let result = activeCategory === 'all' ? allRoutes : allRoutes.filter(r => r.category === activeCategory);
    if (search.trim().length > 1) {
      const q = search.trim().toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeCategory, search, allRoutes]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(0, page * PAGE_SIZE);

  const handleCategory = (id: CategoryId) => {
    setActiveCategory(id);
    setExpandedId(null);
    setPage(1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    setPage(1);
    setExpandedId(null);
  };

  const pluralRoutes = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 19) return 'маршрутов';
    if (n % 10 === 1) return 'маршрут';
    if (n % 10 >= 2 && n % 10 <= 4) return 'маршрута';
    return 'маршрутов';
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, {
        paddingTop: insets.top + (Platform.OS === 'web' ? 12 : 8),
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }]}>
        <View style={styles.headerRow}>
          {showSearch ? (
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}>
              <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                autoFocus
                value={search}
                onChangeText={handleSearch}
                placeholder="Поиск маршрутов..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
              {search.length > 0 && (
                <Pressable onPress={() => handleSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}
              <Pressable onPress={() => { setShowSearch(false); handleSearch(''); }}>
                <Text style={[styles.cancelText, { color: colors.primary }]}>Отмена</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Маршруты</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => setShowSearch(true)}
                  style={[styles.searchBtn, { backgroundColor: colors.card, borderRadius: 20 }]}
                >
                  <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
                </Pressable>
                <Pressable
                  onPress={() => setShowAddModal(true)}
                  style={[styles.searchBtn, { backgroundColor: colors.primary, borderRadius: 20 }]}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            const count = cat.id === 'all' ? allRoutes.length : allRoutes.filter(r => r.category === cat.id).length;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleCategory(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? cat.color : colors.card,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: active ? cat.color : colors.border,
                  },
                ]}
              >
                <Ionicons name={cat.icon} size={13} color={active ? '#fff' : colors.mutedForeground} />
                <Text style={[styles.chipText, { color: active ? '#fff' : colors.mutedForeground }]}>
                  {cat.label}
                </Text>
                <Text style={[styles.chipCount, { color: active ? 'rgba(255,255,255,0.75)' : colors.mutedForeground + 'aa' }]}>
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Route list ── */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 100 : 80) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Маршруты не найдены</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>Попробуйте другой запрос</Text>
          </View>
        )}

        {ugcLoading && userRoutes.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {paginated.map(route => {
          const isOpen = expandedId === route.id;
          const diffColor = DIFF_COLOR[route.difficulty];
          const isUgc = route.id.startsWith('ugc_route_');

          return (
            <Pressable
              key={route.id}
              onPress={() => setExpandedId(isOpen ? null : route.id)}
              style={[
                styles.routeCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
                  borderWidth: isOpen ? 2 : 1,
                  borderColor: isOpen ? catConfig.color : colors.border,
                },
              ]}
            >
              {isUgc && (
                <View style={[styles.ugcBadge, { backgroundColor: '#A5D6A7' }]}>
                  <Ionicons name="person" size={10} color="#fff" />
                  <Text style={styles.ugcBadgeText}>От пользователя</Text>
                </View>
              )}
              {/* Card header */}
              <View style={styles.cardTop}>
                <Text style={styles.cardEmoji}>{route.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{route.title}</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>{route.subtitle}</Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
              </View>

              {/* Meta pills */}
              <View style={styles.metaRow}>
                <View style={[styles.metaPill, { backgroundColor: colors.background }]}>
                  <Ionicons name="calendar-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{route.days} дн.</Text>
                </View>
                <View style={[styles.metaPill, { backgroundColor: colors.background }]}>
                  <Ionicons name="navigate-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{route.distance}</Text>
                </View>
                <View style={[styles.metaPill, { backgroundColor: diffColor + '28' }]}>
                  <Text style={[styles.metaText, { color: diffColor, fontFamily: 'Inter_500Medium' }]}>{route.difficulty}</Text>
                </View>
                <View style={[styles.metaPill, { backgroundColor: colors.background }]}>
                  <Ionicons name="location-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{route.region}</Text>
                </View>
              </View>

              {/* Description */}
              <Text
                style={[styles.cardDesc, { color: colors.foreground }]}
                numberOfLines={isOpen ? undefined : 2}
              >
                {route.description}
              </Text>

              {/* Expanded content */}
              {isOpen && (
                <View style={styles.expandedContent}>
                  <View style={[styles.seasonRow, { backgroundColor: colors.background, borderRadius: 10 }]}>
                    <Ionicons name="partly-sunny-outline" size={15} color={colors.primary} />
                    <Text style={[styles.seasonText, { color: colors.foreground }]}>
                      Сезон: <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.primary }}>{route.season}</Text>
                    </Text>
                  </View>

                  <Text style={[styles.expandSection, { color: colors.foreground }]}>Ключевые точки</Text>
                  {route.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightRow}>
                      <View style={[styles.highlightDot, { backgroundColor: catConfig.color }]} />
                      <Text style={[styles.highlightText, { color: colors.foreground }]}>{h}</Text>
                    </View>
                  ))}

                  <View style={[styles.tipsBox, { backgroundColor: colors.primary + '14', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
                    <Text style={[styles.tipsLabel, { color: colors.primary }]}>💡 Совет</Text>
                    <Text style={[styles.tipsText, { color: colors.foreground }]}>{route.tips}</Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}

        {/* Load more */}
        {page < totalPages && (
          <Pressable
            onPress={() => setPage(p => p + 1)}
            style={[styles.loadMore, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Ionicons name="chevron-down-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.loadMoreText, { color: colors.primary }]}>
              Показать ещё ({filtered.length - page * PAGE_SIZE} маршрутов)
            </Text>
          </Pressable>
        )}

        {filtered.length > 0 && page >= totalPages && (
          <Text style={[styles.allShown, { color: colors.mutedForeground }]}>
            Все {filtered.length} {pluralRoutes(filtered.length)} показаны
          </Text>
        )}
      </ScrollView>

      <AddRouteModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={addRoute}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  headerSub:   { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },

  searchBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', padding: 0 },
  cancelText:  { fontSize: 14, fontFamily: 'Inter_500Medium' },

  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 2 },
  chip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  chipText:  { fontSize: 12, fontFamily: 'Inter_500Medium' },
  chipCount: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  list: { padding: 16, gap: 12 },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText:  { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptyHint:  { fontSize: 13, fontFamily: 'Inter_400Regular' },

  routeCard: { padding: 14, gap: 10 },

  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardEmoji:    { fontSize: 26, lineHeight: 32 },
  cardTitle:    { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  cardSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  metaText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  expandedContent: { gap: 12, marginTop: 4 },
  seasonRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  seasonText:  { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  expandSection: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: -4 },
  highlightRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  highlightDot:  { width: 7, height: 7, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  highlightText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 20 },
  tipsBox:   { padding: 12, gap: 6 },
  tipsLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  tipsText:  { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginTop: 4,
  },
  loadMoreText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  allShown: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    paddingTop: 8,
    paddingBottom: 4,
  },

  ugcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: -4,
  },
  ugcBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
