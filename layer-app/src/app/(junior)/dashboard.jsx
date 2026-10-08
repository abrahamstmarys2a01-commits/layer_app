import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL, fastFetch } from '../../constants/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent', true);
        StatusBar.setTranslucent(true);
      }

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

      return () => {
        StatusBar.setBarStyle('dark-content', true);
        if (Platform.OS === 'android') {
          StatusBar.setBackgroundColor('#FFFFFF', true);
          StatusBar.setTranslucent(false);
        }
      };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignedCases();
  };

  const handleNavigate = (path) => {
    setDrawerOpen(false);
    router.push(path);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    Alert.alert('Logout Confirmation', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace('/(auth)');
        },
      },
    ]);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Good Morning,';
    if (hour >= 12 && hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

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
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Top Full Gradient Green Header matching Admin Dashboard */}
      <LinearGradient
        colors={['#043D2E', '#065F38', '#0A7B48']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerBar}
      >
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu-outline" size={27} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerLogoContainer}>
          <Image
            source={require('../../../assets/images/justice_scales_logo.jpg')}
            style={styles.logoBadgeImg}
            resizeMode="cover"
          />
          <Text style={styles.headerTitle}>Vakil Grid</Text>
        </View>

        {/* Right Header: Notification & Avatar */}
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => Alert.alert('Notifications', 'You have no new urgent alerts.')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View>
              <Ionicons name="notifications-outline" size={23} color="#FFFFFF" />
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerAvatarBtn}
            onPress={() => router.push('/(junior)/profile')}
            activeOpacity={0.8}
          >
            {juniorInfo.photoUrl ? (
              <Image source={{ uri: juniorInfo.photoUrl }} style={styles.headerAvatarImg} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#064E3B" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#064E3B']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome / Greeting Banner (Flat clean layout directly on screen, no card box wrapper) */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingSub}>{getGreeting()}</Text>
            <Text style={[styles.greetingName, { color: isDark ? colors.text : '#0F172A' }]} numberOfLines={1}>
              {juniorInfo.juniorName || 'Arun'}
            </Text>
            <Text style={styles.greetingRole}>Junior Lawyer</Text>

            <View style={styles.quoteBox}>
              <View style={styles.quoteBar} />
              <Text style={styles.quoteText}>
                "Small steps everyday,{"\n"}lead to big results."
              </Text>
            </View>
          </View>

          <View style={styles.greetingIllustrationWrapper}>
            <Image
              source={require('../../../assets/images/law_scales_books.jpg')}
              style={styles.greetingLawImage}
              resizeMode="cover"
            />
          </View>
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

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsRow}
          >
            {[
              { label: 'All Cases', key: 'ALL', count: stats.totalCases },
              { label: 'Active', key: 'ACTIVE', count: stats.activeCases },
              { label: 'Upcoming', key: 'UPCOMING', count: stats.upcomingHearings },
              { label: 'Closed', key: 'CLOSED', count: stats.closedCases },
            ].map((f) => {
              const isSel = selectedFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSel
                        ? '#0D6E42'
                        : isDark
                        ? colors.card
                        : '#FFFFFF',
                      borderColor: isSel ? '#0D6E42' : (isDark ? colors.border : '#E2E8F0'),
                    },
                  ]}
                  onPress={() => setSelectedFilter(f.key)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isSel ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {f.label} ({f.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Cases Content: Table or Cards */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0D6E42" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading assigned cases...</Text>
            </View>
          ) : filteredCases.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
              <Ionicons name="folder-open-outline" size={44} color="#94A3B8" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Cases Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'No cases match your search query.'
                  : 'You have no assigned cases under this filter.'}
              </Text>
            </View>
          ) : viewMode === 'TABLE' ? (
            /* TABLE VIEW */
            <View style={[styles.tableCardWrapper, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
              {/* Table Header */}
              <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderBottomColor: colors.border }]}>
                <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>CASE NO / CLIENT</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>COURT</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>HEARING</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.7, textAlign: 'right' }]}>STATUS</Text>
              </View>

              {/* Table Body Rows */}
              {filteredCases.map((item, index) => {
                const badgeStyle = getStatusBadgeStyle(item.status);
                const isLast = index === filteredCases.length - 1;

                return (
                  <TouchableOpacity
                    key={item._id || item.caseNumber || index}
                    style={[
                      styles.tableRow,
                      { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' },
                      isLast && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => openCaseDetails(item)}
                    activeOpacity={0.7}
                  >
                    {/* Case No & Client */}
                    <View style={{ flex: 1.1, paddingRight: 4 }}>
                      <Text style={[styles.tableCaseNo, { color: '#0D6E42' }]} numberOfLines={1}>
                        {item.caseNumber || 'N/A'}
                      </Text>
                      <Text style={[styles.tableClientName, { color: colors.text }]} numberOfLines={1}>
                        {item.clientName || 'Client'}
                      </Text>
                    </View>

                    {/* Court */}
                    <View style={{ flex: 0.9, paddingRight: 4 }}>
                      <Text style={[styles.tableCourtText, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.courtName || '-'}
                      </Text>
                    </View>

                    {/* Hearing Date */}
                    <View style={{ flex: 0.8, paddingRight: 4 }}>
                      <Text style={[styles.tableHearingDate, { color: colors.text }]} numberOfLines={1}>
                        {item.nextHearing || '-'}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View style={{ flex: 0.7, alignItems: 'flex-end' }}>
                      <View style={[styles.statusBadgeSmall, { backgroundColor: badgeStyle.bg }]}>
                        <Text style={[styles.statusBadgeSmallText, { color: badgeStyle.text }]} numberOfLines={1}>
                          {item.status || 'Active'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            /* CARD VIEW */
            <View style={styles.cardsGrid}>
              {filteredCases.map((item, index) => {
                const badgeStyle = getStatusBadgeStyle(item.status);

                return (
                  <TouchableOpacity
                    key={item._id || item.caseNumber || index}
                    style={[
                      styles.caseCard,
                      { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border },
                    ]}
                    onPress={() => openCaseDetails(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.caseCardHeader}>
                      <View style={styles.caseNumberBox}>
                        <Ionicons name="document-text" size={15} color="#0D6E42" style={{ marginRight: 5 }} />
                        <Text style={styles.caseNumberText} numberOfLines={1}>
                          {item.caseNumber || 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadgeSmall, { backgroundColor: badgeStyle.bg }]}>
                        <Text style={[styles.statusBadgeSmallText, { color: badgeStyle.text }]}>
                          {item.status || 'Active'}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.caseCardClient, { color: colors.text }]} numberOfLines={1}>
                      {item.clientName || 'Unnamed Client'}
                    </Text>

                    <View style={styles.caseCardMetaRow}>
                      <Ionicons name="business-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.caseCardMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.courtName || 'Court Not Specified'}
                      </Text>
                    </View>

                    <View style={styles.caseCardFooter}>
                      <View style={styles.caseHearingTag}>
                        <Ionicons name="calendar-outline" size={13} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={styles.caseHearingText}>
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

      {/* 🌟 Sidebar Navigation Drawer Modal */}
      <Modal
        visible={drawerOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setDrawerOpen(false)}
          />
          <View style={styles.drawerContainer}>
            {/* Drawer Header */}
            <LinearGradient
              colors={['#043D2E', '#065F38', '#0A7B48']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.drawerHeader}
            >
              <View style={styles.drawerUserRow}>
                <View style={styles.drawerAvatar}>
                  {juniorInfo.photoUrl ? (
                    <Image source={{ uri: juniorInfo.photoUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Ionicons name="person" size={26} color="#064E3B" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.drawerUserName} numberOfLines={1}>
                    {juniorInfo.juniorName || 'Arun'}
                  </Text>
                  <Text style={styles.drawerUserRole}>Junior Lawyer</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDrawerOpen(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Drawer Navigation List */}
            <ScrollView style={styles.drawerNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.drawerSectionLabel}>MAIN MENU</Text>

              {/* 1. Dashboard / Cases */}
              <TouchableOpacity
                style={[styles.drawerItem, styles.drawerItemActive]}
                onPress={() => setDrawerOpen(false)}
              >
                <Ionicons name="folder-open" size={20} color="#064E3B" style={styles.drawerItemIcon} />
                <Text style={[styles.drawerItemText, styles.drawerItemTextActive]}>My Cases</Text>
              </TouchableOpacity>

              {/* 2. Amount Entry */}
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleNavigate('/(junior)/amount-entry')}
              >
                <Ionicons name="wallet-outline" size={20} color="#334155" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Amount Entry</Text>
              </TouchableOpacity>

              {/* 3. Hearing Schedule */}
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleNavigate('/(junior)/schedule')}
              >
                <Ionicons name="calendar-outline" size={20} color="#334155" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Hearing Schedule</Text>
              </TouchableOpacity>

              <View style={styles.drawerDivider} />
              <Text style={styles.drawerSectionLabel}>ACCOUNT & ACTIONS</Text>

              {/* Settings / Profile */}
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleNavigate('/(junior)/profile')}
              >
                <Ionicons name="person-circle-outline" size={20} color="#334155" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Profile & Settings</Text>
              </TouchableOpacity>

              {/* Logout */}
              <TouchableOpacity
                style={[styles.drawerItem, { marginTop: 12 }]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#DC2626" style={styles.drawerItemIcon} />
                <Text style={[styles.drawerItemText, { color: '#DC2626', fontWeight: '700' }]}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Drawer Footer */}
            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>Vakil Grid Chamber Management v1.0</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#043D2E',
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadgeImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 9,
    borderWidth: 1.5,
    borderColor: '#FDE047',
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  notificationDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8.5,
    height: 8.5,
    borderRadius: 4.25,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#064E3B',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FDE047',
    overflow: 'hidden',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  greetingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingTop: 4,
    paddingBottom: 2,
    paddingHorizontal: 2,
  },
  greetingLeft: {
    flex: 1.15,
    paddingRight: 8,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D6E42',
    letterSpacing: -0.2,
  },
  greetingName: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  greetingRole: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 10,
  },
  quoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  quoteBar: {
    width: 3,
    height: 30,
    backgroundColor: '#0D6E42',
    borderRadius: 2,
    marginRight: 8,
  },
  quoteText: {
    fontSize: 11.5,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 16,
    fontWeight: '500',
  },
  greetingIllustrationWrapper: {
    width: 120,
    height: 115,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  greetingLawImage: {
    width: '100%',
    height: '100%',
  },
  statsSection: {
    marginBottom: 20,
  },
  statsHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statCardActive: {
    borderWidth: 1.5,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  casesListSection: {
    marginBottom: 20,
  },
  casesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  casesSubnote: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#0D6E42',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tableCardWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  tableCaseNo: {
    fontSize: 13,
    fontWeight: '800',
  },
  tableClientName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  tableCourtText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  tableHearingDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeSmallText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  cardsGrid: {
    gap: 12,
  },
  caseCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  caseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  caseNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caseNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D6E42',
  },
  caseCardClient: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  caseCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  caseCardMetaText: {
    fontSize: 12,
  },
  caseCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  caseHearingTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caseHearingText: {
    fontSize: 11.5,
    color: '#475569',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D6E42',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyContainer: {
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },

  // 🌟 Sidebar Drawer Styles
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawerContainer: {
    width: Math.min(SCREEN_WIDTH * 0.78, 300),
    backgroundColor: '#FFFFFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    backgroundColor: '#064E3B',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 44,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  drawerUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerUserRole: {
    fontSize: 12,
    color: '#A7F3D0',
    marginTop: 2,
  },
  drawerNavList: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  drawerSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: '#F0FDF4',
  },
  drawerItemIcon: {
    marginRight: 14,
  },
  drawerItemText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#334155',
  },
  drawerItemTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
    marginHorizontal: 8,
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  drawerFooterText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
