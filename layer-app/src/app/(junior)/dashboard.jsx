import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { useFocusEffect, useRouter } from 'expo-router';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function JuniorDashboard() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [juniorInfo, setJuniorInfo] = useState({
    juniorName: 'Arun',
    username: 'arun',
  });
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    activeCases: 0,
    upcomingHearings: 0,
    closedCases: 0,
    totalCases: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL, ACTIVE, UPCOMING, CLOSED
  const [viewMode, setViewMode] = useState('TABLE'); // Default TABLE as requested ('TABLE' or 'CARD')

  // Open case details
  const openCaseDetails = (item) => {
    router.push({
      pathname: '/(junior)/case-details',
      params: {
        id: item._id || item.caseNumber,
        caseNumber: item.caseNumber,
        clientName: item.clientName,
        courtName: item.courtName,
        nextHearing: item.nextHearing,
        status: item.status,
      },
    });
  };

  // Load junior details from AsyncStorage & live profile
  const loadJuniorInfo = async () => {
    try {
      const stored = await AsyncStorage.getItem('@junior_info');
      let jName = 'Arun';
      let jObj = { juniorName: 'Arun', username: 'arun' };
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.juniorName) {
          jName = parsed.juniorName;
          jObj = parsed;
          setJuniorInfo(parsed);
        }
      }

      // Fetch live junior profile photo & details in background
      try {
        const pRes = await fastFetch(
          `${API_BASE_URL}/api/juniors/profile/${encodeURIComponent(jObj.username || jName)}`
        );
        const pData = await pRes.json();
        if (pRes.ok && pData.success && pData.junior) {
          setJuniorInfo(pData.junior);
          await AsyncStorage.setItem('@junior_info', JSON.stringify(pData.junior));
          return pData.junior.juniorName || jName;
        }
      } catch (pErr) {}

      return jName;
    } catch (e) {
      console.error('Error reading junior info:', e);
    }
    return 'Arun';
  };

  const processAndSetCases = (rawCases) => {
    const uniqueMap = new Map();
    rawCases.forEach((c) => {
      const key = (c.caseNumber || c._id || '').trim().toUpperCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, c);
      }
    });
    const cleanCases = Array.from(uniqueMap.values());
    setCases(cleanCases);

    const activeCasesCount = cleanCases.filter(
      (c) =>
        !c.status ||
        c.status.toLowerCase() === 'active' ||
        c.status.toLowerCase() === 'closure requested'
    ).length;

    const upcomingCount = cleanCases.filter(
      (c) =>
        (!c.status || c.status.toLowerCase() === 'active') &&
        c.nextHearing &&
        c.nextHearing.trim() !== '' &&
        c.nextHearing.trim() !== '-'
    ).length;

    const closedCount = cleanCases.filter(
      (c) =>
        c.status &&
        (c.status.toLowerCase() === 'closed' ||
          c.status.toLowerCase() === 'disposed' ||
          c.status.toLowerCase() === 'completed')
    ).length;

    setStats({
      activeCases: activeCasesCount,
      upcomingHearings: upcomingCount,
      closedCases: closedCount,
      totalCases: cleanCases.length,
    });
  };

  const fetchAssignedCases = async (nameToFetch) => {
    const jName = nameToFetch || juniorInfo.juniorName || 'Arun';
    try {
      const response = await fastFetch(
        `${API_BASE_URL}/api/juniors/assigned-cases?juniorName=${encodeURIComponent(jName)}`
      );
      const data = await response.json();

      if (response.ok && data.success && Array.isArray(data.cases)) {
        processAndSetCases(data.cases);
        AsyncStorage.setItem(`@cached_junior_cases_${jName}`, JSON.stringify(data.cases));
      }
    } catch (e) {
      console.error('Error fetching assigned cases:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadJuniorInfo().then(async (name) => {
        try {
          const cached = await AsyncStorage.getItem(`@cached_junior_cases_${name}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              processAndSetCases(parsed);
              setLoading(false);
            }
          }
        } catch (e) {}
        fetchAssignedCases(name);
      });
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignedCases();
  };

  const filteredCases = cases.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (item.caseNumber || '').toLowerCase().includes(q) ||
      (item.clientName || '').toLowerCase().includes(q) ||
      (item.courtName || '').toLowerCase().includes(q) ||
      (item.status || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedFilter === 'ACTIVE') {
      return (
        (item.status || 'Active').toLowerCase() === 'active' ||
        (item.status || '').toLowerCase() === 'closure requested'
      );
    }
    if (selectedFilter === 'UPCOMING') {
      return (
        (item.status || 'Active').toLowerCase() === 'active' &&
        item.nextHearing &&
        item.nextHearing !== '-'
      );
    }
    if (selectedFilter === 'CLOSED') {
      return (
        (item.status || '').toLowerCase() === 'closed' ||
        (item.status || '').toLowerCase() === 'disposed'
      );
    }
    return true;
  });

  const getStatusBadgeStyle = (status) => {
    const s = (status || 'Active').toLowerCase();
    if (s === 'active') {
      return { bg: isDark ? '#064e3b' : '#DCFCE7', text: '#0D6E42' };
    }
    if (s === 'closed' || s === 'disposed' || s === 'completed') {
      return { bg: isDark ? '#334155' : '#F1F5F9', text: '#64748B' };
    }
    return { bg: isDark ? '#78350f' : '#FEF3C7', text: '#D97706' };
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0D6E42']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.dashboardBadge, { backgroundColor: isDark ? '#1E293B' : '#E0F2FE' }]}>
                <Ionicons name="shield-checkmark" size={13} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={[styles.dashboardBadgeText, { color: '#0284C7' }]}>Junior Dashboard</Text>
              </View>
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]} numberOfLines={1}>
              Welcome, {juniorInfo.juniorName || 'Arun'} 
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Assigned Legal Cases & Hearings Console
            </Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButtonWrapper}
            onPress={() => router.push('/(junior)/profile')}
            activeOpacity={0.8}
          >
            {juniorInfo.photoUrl ? (
              <Image
                source={{ uri: juniorInfo.photoUrl }}
                style={styles.juniorProfilePhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#1E293B' : '#DCFCE7' }]}>
                <Image
                  source={{
                    uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      juniorInfo.juniorName || 'Arun'
                    )}&background=0D6E42&color=ffffff&bold=true&size=128`,
                  }}
                  style={styles.juniorProfilePhoto}
                  resizeMode="cover"
                />
              </View>
            )}
            <View style={styles.onlineBadgeDot} />
          </TouchableOpacity>
        </View>

        {/* Section: My Cases Summary Statistics Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statsHeadingRow}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>My Cases</Text>
            <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>
              {stats.totalCases} Total Assigned
            </Text>
          </View>

          <View style={styles.statsRow}>
            {/* 1. Active Cases */}
            <TouchableOpacity
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? colors.card : '#FFFFFF',
                  borderColor: selectedFilter === 'ACTIVE' ? '#0D6E42' : (isDark ? colors.border : '#E2E8F0'),
                },
                selectedFilter === 'ACTIVE' && styles.statCardActive,
              ]}
              onPress={() => setSelectedFilter(selectedFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBox, { backgroundColor: isDark ? '#064e3b' : '#DCFCE7' }]}>
                <Ionicons name="briefcase" size={18} color="#0D6E42" />
              </View>
              <Text style={[styles.statValue, { color: '#0D6E42' }]}>{stats.activeCases}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Cases</Text>
            </TouchableOpacity>

            {/* 2. Upcoming Hearings */}
            <TouchableOpacity
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? colors.card : '#FFFFFF',
                  borderColor: selectedFilter === 'UPCOMING' ? '#2563EB' : (isDark ? colors.border : '#E2E8F0'),
                },
                selectedFilter === 'UPCOMING' && styles.statCardActive,
              ]}
              onPress={() => setSelectedFilter(selectedFilter === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBox, { backgroundColor: isDark ? '#1e3a8a' : '#DBEAFE' }]}>
                <Ionicons name="calendar" size={18} color="#2563EB" />
              </View>
              <Text style={[styles.statValue, { color: '#2563EB' }]}>{stats.upcomingHearings}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Upcoming Hearings</Text>
            </TouchableOpacity>

            {/* 3. Closed Cases */}
            <TouchableOpacity
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? colors.card : '#FFFFFF',
                  borderColor: selectedFilter === 'CLOSED' ? '#64748B' : (isDark ? colors.border : '#E2E8F0'),
                },
                selectedFilter === 'CLOSED' && styles.statCardActive,
              ]}
              onPress={() => setSelectedFilter(selectedFilter === 'CLOSED' ? 'ALL' : 'CLOSED')}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBox, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Ionicons name="checkmark-done-circle" size={18} color="#64748B" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.closedCases}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Closed Cases</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: My Cases Table & Card Display */}
        <View style={styles.casesListSection}>
          <View style={styles.casesHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Cases</Text>
              <Text style={[styles.casesSubnote, { color: colors.textSecondary }]}>
                Cases specifically assigned to {juniorInfo.juniorName}
              </Text>
            </View>

            {/* Table / Card View Toggle */}
            <View style={[styles.toggleContainer, { backgroundColor: isDark ? colors.card : '#F1F5F9', borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'TABLE' && styles.toggleBtnActive]}
                onPress={() => setViewMode('TABLE')}
              >
                <Ionicons name="list" size={16} color={viewMode === 'TABLE' ? '#FFFFFF' : colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'CARD' && styles.toggleBtnActive]}
                onPress={() => setViewMode('CARD')}
              >
                <Ionicons name="grid" size={16} color={viewMode === 'CARD' ? '#FFFFFF' : colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by case no, client, court..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Content: Table or Card View */}
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#0D6E42" />
              <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 13 }}>
                Loading your assigned cases...
              </Text>
            </View>
          ) : filteredCases.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="folder-open-outline" size={44} color="#94A3B8" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Assigned Cases</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'No assigned cases match your search.'
                  : `No cases have been assigned to ${juniorInfo.juniorName} yet.`}
              </Text>
            </View>
          ) : viewMode === 'TABLE' ? (
            /* Clean Full Table View */
            <View style={[styles.tableCardWrapper, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={{ minWidth: 600 }}>
                  {/* Table Header */}
                  <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderBottomColor: colors.border }]}>
                    <Text style={[styles.thText, { width: 140, color: colors.textSecondary }]}>CASE NO</Text>
                    <Text style={[styles.thText, { width: 120, color: colors.textSecondary }]}>CLIENT</Text>
                    <Text style={[styles.thText, { width: 150, color: colors.textSecondary }]}>COURT</Text>
                    <Text style={[styles.thText, { width: 110, color: colors.textSecondary }]}>HEARING</Text>
                    <Text style={[styles.thText, { width: 80, textAlign: 'center', color: colors.textSecondary }]}>STATUS</Text>
                  </View>

                  {/* Table Rows */}
                  {filteredCases.map((item, index) => {
                    const badgeStyle = getStatusBadgeStyle(item.status);
                    return (
                      <TouchableOpacity
                        key={item._id || index}
                        style={[
                          styles.tableRow,
                          {
                            borderTopColor: colors.border,
                            borderTopWidth: index === 0 ? 0 : 1,
                            backgroundColor: isDark
                              ? (index % 2 === 0 ? colors.card : '#1E293B55')
                              : (index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                          },
                        ]}
                        onPress={() => openCaseDetails(item)}
                        activeOpacity={0.7}
                      >
                        {/* Case No */}
                        <View style={{ width: 140, paddingRight: 8 }}>
                          <Text style={[styles.tdCaseNo, { color: '#0D6E42' }]} numberOfLines={1}>
                            {item.caseNumber || 'N/A'}
                          </Text>
                          <Text style={[styles.tdSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.caseType || 'Matter'}
                          </Text>
                        </View>

                        {/* Client */}
                        <View style={{ width: 120, paddingRight: 8 }}>
                          <Text style={[styles.tdText, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                            {item.clientName || '-'}
                          </Text>
                        </View>

                        {/* Court */}
                        <View style={{ width: 150, paddingRight: 8 }}>
                          <Text style={[styles.tdText, { color: colors.text }]} numberOfLines={1}>
                            {item.courtName || '-'}
                          </Text>
                        </View>

                        {/* Hearing */}
                        <View style={{ width: 110, paddingRight: 8 }}>
                          <Text style={[styles.tdHearingText, { color: '#2563EB', fontWeight: '700' }]} numberOfLines={1}>
                            {item.nextHearing || '-'}
                          </Text>
                        </View>

                        {/* Status */}
                        <View style={{ width: 80, alignItems: 'center' }}>
                          <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: badgeStyle.text }]}>
                              {item.status || 'Active'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : (
            /* Card View */
            <View style={styles.cardListContainer}>
              {filteredCases.map((item, index) => {
                const badgeStyle = getStatusBadgeStyle(item.status);
                return (
                  <TouchableOpacity
                    key={item._id || index}
                    style={[
                      styles.caseCard,
                      { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border },
                    ]}
                    onPress={() => openCaseDetails(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.caseCardTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <View style={styles.caseCardIconCircle}>
                          <Ionicons name="document-text" size={16} color="#0D6E42" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.caseCardNum, { color: '#0D6E42' }]} numberOfLines={1}>
                            {item.caseNumber}
                          </Text>
                          <Text style={[styles.caseCardType, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.caseType || 'General Civil'}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badgeStyle.text }]}>
                          {item.status || 'Active'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.caseCardBody, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                      <View style={styles.caseInfoCol}>
                        <Text style={[styles.caseInfoLabel, { color: colors.textSecondary }]}>CLIENT</Text>
                        <Text style={[styles.caseInfoValue, { color: colors.text }]} numberOfLines={1}>
                          👤 {item.clientName || 'Client'}
                        </Text>
                      </View>

                      <View style={styles.caseInfoCol}>
                        <Text style={[styles.caseInfoLabel, { color: colors.textSecondary }]}>COURT</Text>
                        <Text style={[styles.caseInfoValue, { color: colors.text }]} numberOfLines={1}>
                          🏛️ {item.courtName || 'District Court'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.caseCardFooter}>
                      <View style={styles.hearingPill}>
                        <Ionicons name="calendar" size={13} color="#2563EB" style={{ marginRight: 5 }} />
                        <Text style={styles.hearingPillText}>
                          Hearing: <Text style={{ fontWeight: '800' }}>{item.nextHearing || '-'}</Text>
                        </Text>
                      </View>

                      <View style={styles.viewDetailsRow}>
                        <Text style={styles.viewDetailsText}>View Details</Text>
                        <Ionicons name="chevron-forward" size={14} color="#0D6E42" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  badgeRow: {
    marginBottom: 6,
  },
  dashboardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dashboardBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  avatarButtonWrapper: {
    position: 'relative',
  },
  juniorProfilePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#0D6E42',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D6E42',
  },
  statsSection: {
    marginBottom: 22,
  },
  statsHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
  },
  statsSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  statCardActive: {
    transform: [{ scale: 1.02 }],
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  casesListSection: {
    marginBottom: 16,
  },
  casesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  casesSubnote: {
    fontSize: 12,
    marginTop: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#0D6E42',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  tableCardWrapper: {
    borderRadius: 14,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1.2,
  },
  thText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tdCaseNo: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  tdSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  tdText: {
    fontSize: 13,
  },
  tdHearingText: {
    fontSize: 12.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  cardListContainer: {
    gap: 12,
  },
  caseCard: {
    borderRadius: 14,
    borderWidth: 1.2,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  caseCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  caseCardIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  caseCardNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  caseCardType: {
    fontSize: 11.5,
    marginTop: 1,
  },
  caseCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 4,
  },
  caseInfoCol: {
    flex: 1,
    paddingRight: 6,
  },
  caseInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  caseInfoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  caseCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  hearingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hearingPillText: {
    fontSize: 12,
    color: '#1E40AF',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D6E42',
    marginRight: 2,
  },
});
