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
import { GUIDE_ARTICLES, GuideCategory } from '@/data/guide-data';
import { useUserGuides } from '@/hooks/useUserGuides';
import AddGuideModal from '@/components/AddGuideModal';

// ─── Category config ──────────────────────────────────────────────────────────
const CATS: { id: GuideCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'all',       label: 'Все',        icon: 'apps-outline',              color: '#90CAF9' },
  { id: 'city',      label: 'Города',     icon: 'business-outline',          color: '#90CAF9' },
  { id: 'nature',    label: 'Природа',    icon: 'leaf-outline',              color: '#A5D6A7' },
  { id: 'culture',   label: 'Культура',   icon: 'color-palette-outline',     color: '#CE93D8' },
  { id: 'food',      label: 'Кухня',      icon: 'restaurant-outline',        color: '#FFCC80' },
  { id: 'practical', label: 'Практика',   icon: 'briefcase-outline',         color: '#80DEEA' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function GuideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const { userArticles, loading: ugcLoading, addGuide } = useUserGuides();
  const [showAddModal, setShowAddModal] = useState(false);

  const [activeCategory, setActiveCategory] = useState<GuideCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const catConfig = CATS.find(c => c.id === activeCategory)!;

  const allArticles = useMemo(() => [...userArticles, ...GUIDE_ARTICLES], [userArticles]);

  const filtered = useMemo(() => {
    let result = activeCategory === 'all'
      ? allArticles
      : allArticles.filter(a => a.category === activeCategory);
    if (search.trim().length > 1) {
      const q = search.trim().toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.region.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [activeCategory, search, allArticles]);

  const handleCategory = (id: GuideCategory) => {
    setActiveCategory(id);
    setExpandedId(null);
    setExpandedSection(null);
    setSearch('');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const toggleArticle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedSection(null);
    } else {
      setExpandedId(id);
      setExpandedSection(null);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSection(prev => prev === key ? null : key);
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
                onChangeText={t => { setSearch(t); setExpandedId(null); }}
                placeholder="Найти статью..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}
              <Pressable onPress={() => { setShowSearch(false); setSearch(''); }}>
                <Text style={[styles.cancelText, { color: colors.primary }]}>Отмена</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Путеводитель</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => setShowSearch(true)}
                  style={[styles.iconBtn, { backgroundColor: colors.card, borderRadius: 20 }]}
                >
                  <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
                </Pressable>
                <Pressable
                  onPress={() => setShowAddModal(true)}
                  style={[styles.iconBtn, { backgroundColor: colors.primary, borderRadius: 20 }]}
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
          {CATS.map(cat => {
            const active = activeCategory === cat.id;
            const count = cat.id === 'all'
              ? allArticles.length
              : allArticles.filter(a => a.category === cat.id).length;
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
                <Text style={[styles.chipCount, { color: active ? 'rgba(255,255,255,0.7)' : colors.mutedForeground + '99' }]}>
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Articles list ── */}
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
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Статьи не найдены</Text>
          </View>
        )}

        {ugcLoading && userArticles.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {filtered.map(article => {
          const isOpen = expandedId === article.id;
          const cat = CATS.find(c => c.id === article.category)!;
          const isUgc = article.id.startsWith('ugc_guide_');

          return (
            <View
              key={article.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
                  borderWidth: isOpen ? 2 : 1,
                  borderColor: isOpen ? cat.color : colors.border,
                },
              ]}
            >
              {isUgc && (
                <View style={[styles.ugcBadge, { backgroundColor: '#A5D6A7' }]}>
                  <Ionicons name="person" size={10} color="#fff" />
                  <Text style={styles.ugcBadgeText}>От пользователя</Text>
                </View>
              )}
              {/* Card header — tap to expand */}
              <Pressable onPress={() => toggleArticle(article.id)} style={styles.cardHeader}>
                <Text style={styles.cardFlag}>{article.flag}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{article.title}</Text>
                    <View style={[styles.catBadge, { backgroundColor: cat.color + '28', borderRadius: 8 }]}>
                      <Ionicons name={cat.icon} size={10} color={cat.color} />
                    </View>
                  </View>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>{article.subtitle}</Text>
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>

              {/* Meta row */}
              <View style={styles.metaRow}>
                <View style={[styles.metaPill, { backgroundColor: colors.background }]}>
                  <Ionicons name="location-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{article.region}</Text>
                </View>
                <View style={[styles.metaPill, { backgroundColor: colors.background }]}>
                  <Ionicons name="star" size={11} color="#F9A825" />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{article.rating}</Text>
                </View>
                <View style={[styles.metaPill, { backgroundColor: colors.background }]}>
                  <Ionicons name="time-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{article.readTime}</Text>
                </View>
              </View>

              {/* Short description */}
              <Text
                style={[styles.cardDesc, { color: colors.foreground }]}
                numberOfLines={isOpen ? undefined : 2}
              >
                {article.description}
              </Text>

              {/* Expanded content */}
              {isOpen && (
                <View style={styles.expandedWrap}>
                  {/* Highlights grid */}
                  <View style={styles.highlightsGrid}>
                    {article.highlights.map((h, i) => (
                      <View key={i} style={[styles.highlightBox, { backgroundColor: colors.background, borderRadius: 10 }]}>
                        <Text style={styles.highlightIcon}>{h.icon}</Text>
                        <Text style={[styles.highlightLabel, { color: colors.mutedForeground }]}>{h.label}</Text>
                        <Text style={[styles.highlightValue, { color: colors.foreground }]}>{h.value}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Sections — collapsible */}
                  {article.sections.map(section => {
                    const secKey = `${article.id}_${section.title}`;
                    const secOpen = expandedSection === secKey;
                    return (
                      <View
                        key={secKey}
                        style={[styles.section, { borderColor: colors.border, borderWidth: 1, borderRadius: 10 }]}
                      >
                        <Pressable
                          onPress={() => toggleSection(secKey)}
                          style={styles.sectionHeader}
                        >
                          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
                          <Ionicons
                            name={secOpen ? 'chevron-up' : 'chevron-down'}
                            size={15}
                            color={colors.mutedForeground}
                          />
                        </Pressable>
                        {secOpen && (
                          <Text style={[styles.sectionContent, { color: colors.foreground }]}>
                            {section.content}
                          </Text>
                        )}
                      </View>
                    );
                  })}

                  {/* Tags */}
                  <View style={styles.tagsRow}>
                    {article.tags.map(tag => (
                      <View key={tag} style={[styles.tag, { backgroundColor: cat.color + '1A', borderRadius: 10 }]}>
                        <Text style={[styles.tagText, { color: cat.color }]}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <AddGuideModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={addGuide}
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
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

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

  card: { overflow: 'hidden' },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    paddingBottom: 0,
  },
  cardFlag:  { fontSize: 26, lineHeight: 32 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', flex: 1 },
  cardSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  catBadge: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingTop: 10 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  metaText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14 },

  expandedWrap: { gap: 10, paddingHorizontal: 14, paddingBottom: 14 },

  highlightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  highlightBox: { width: '47%', padding: 10, gap: 2 },
  highlightIcon: { fontSize: 18, marginBottom: 2 },
  highlightLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  highlightValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  section: { overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  sectionTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  sectionContent: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  ugcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 14,
    marginTop: 10,
  },
  ugcBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
