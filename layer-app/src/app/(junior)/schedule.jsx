import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { useFocusEffect, useRouter } from 'expo-router';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function JuniorSchedule() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Calendar states
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  const normalizeDateKey = (dateStr) => {
    if (!dateStr || dateStr === '-' || typeof dateStr !== 'string') return null;
    const parts = dateStr.trim().split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parts[0];
        const m = String(parseInt(parts[1], 10)).padStart(2, '0');
        const d = String(parseInt(parts[2], 10)).padStart(2, '0');
        return `${y}-${m}-${d}`;
      } else {
        // DD-MM-YYYY
        const d = String(parseInt(parts[0], 10)).padStart(2, '0');
        const m = String(parseInt(parts[1], 10)).padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      }
    }
    return null;
  };

  const formatDayKey = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const formatDateToString = (dateObj) => {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const fetchHearings = async () => {
    try {
      const stored = await AsyncStorage.getItem('@junior_info');
      let juniorName = 'Arun';
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.juniorName) juniorName = parsed.juniorName;
      }

      const response = await fastFetch(
        `${API_BASE_URL}/api/juniors/assigned-cases?juniorName=${encodeURIComponent(juniorName)}`
      );
      const data = await response.json();

      if (response.ok && data.success && Array.isArray(data.cases)) {
        const withHearings = data.cases.filter(
          (c) => c.nextHearing && c.nextHearing.trim() !== '' && c.nextHearing !== '-'
        );
        setHearings(withHearings);
      } else {
        setHearings([]);
      }
    } catch (e) {
      console.error('Error fetching hearings:', e);
      setHearings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHearings();
    }, [])
  );

  const hearingMap = useMemo(() => {
    const map = {};
    hearings.forEach((c) => {
      if (c.status === 'Closed' || c.status === 'Disposed') return;
      const key = normalizeDateKey(c.nextHearing);
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(c);
      }
    });
    return map;
  }, [hearings]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedCalendarDate(now);
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
      });
    }
    // Next month padding to fill exactly 35 or 42 cells
    const targetLength = days.length > 35 ? 42 : 35;
    const remaining = targetLength - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }
    return days;
  };

  const selectedDateKey = formatDayKey(
    selectedCalendarDate.getFullYear(),
    selectedCalendarDate.getMonth(),
    selectedCalendarDate.getDate()
  );

  const displayedCases = useMemo(() => {
    if (viewMode === 'list') {
      return hearings;
    }
    return hearings.filter((item) => {
      const caseKey = normalizeDateKey(item.nextHearing);
      return caseKey === selectedDateKey;
    });
  }, [hearings, viewMode, selectedDateKey]);

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0B1120' : '#FFFFFF'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchHearings();
            }}
            colors={['#0D6E42']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>My Hearing Schedule</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Assigned case hearings, court dates & calendar
          </Text>
        </View>

        {/* View Mode Switcher */}
        <View style={[styles.viewModeContainer, { backgroundColor: colors.subCardBg }]}>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'calendar' && [styles.viewModeBtnActive, { backgroundColor: '#0D6E42' }]]}
            onPress={() => setViewMode('calendar')}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={16} color={viewMode === 'calendar' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.viewModeText, viewMode === 'calendar' && { color: '#FFFFFF', fontWeight: '800' }]}>
              Calendar View ({hearings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'list' && [styles.viewModeBtnActive, { backgroundColor: colors.card }]]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? '#0D6E42' : colors.textSecondary} />
            <Text style={[styles.viewModeText, viewMode === 'list' && { color: '#0D6E42', fontWeight: '800' }]}>
              All Hearings List
            </Text>
          </TouchableOpacity>
        </View>

        {/* 📅 Interactive Calendar (shown in calendar mode) */}
        {viewMode === 'calendar' && (
          <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Month Header */}
            <View style={styles.calendarMonthHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.monthTitleText, { color: colors.text }]}>
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                <TouchableOpacity style={styles.todayPill} onPress={handleJumpToday}>
                  <Text style={styles.todayPillText}>Today</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.monthNavRow}>
                <TouchableOpacity style={[styles.monthNavBtn, { backgroundColor: colors.subCardBg }]} onPress={handlePrevMonth}>
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.monthNavBtn, { backgroundColor: colors.subCardBg }]} onPress={handleNextMonth}>
                  <Ionicons name="chevron-forward" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Days of Week Header */}
            <View style={styles.weekDaysHeader}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <Text key={idx} style={[styles.weekDayText, { color: colors.textSecondary }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Date Grid */}
            <View style={styles.daysGrid}>
              {getCalendarDays().map((item, idx) => {
                const dateKey = formatDayKey(item.year, item.month, item.day);
                const isSelected = dateKey === selectedDateKey;
                const isToday = dateKey === formatDayKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                const dayHearings = hearingMap[dateKey] || [];
                const hasHearings = dayHearings.length > 0;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                    ]}
                    onPress={() => {
                      setSelectedCalendarDate(new Date(item.year, item.month, item.day));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        { color: item.isCurrentMonth ? colors.text : '#94A3B8' },
                        isSelected && styles.dayNumberTextSelected,
                        isToday && !isSelected && { color: '#0D6E42', fontWeight: '800' },
                      ]}
                    >
                      {item.day}
                    </Text>

                    {hasHearings && (
                      <View style={[styles.hearingDotBadge, isSelected && { backgroundColor: '#FDE047' }]}>
                        <Text style={[styles.hearingDotBadgeText, isSelected && { color: '#0D6E42' }]}>
                          {dayHearings.length}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calendar Footer Info */}
            <View style={[styles.calendarFooterBar, { backgroundColor: colors.subCardBg, borderTopColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={16} color="#0D6E42" style={{ marginRight: 6 }} />
                <Text style={[styles.calendarFooterDateText, { color: colors.text }]}>
                  Selected: <Text style={{ fontWeight: '800', color: '#0D6E42' }}>{formatDateToString(selectedCalendarDate)}</Text>
                </Text>
              </View>
              <View style={styles.calendarFooterCountBadge}>
                <Text style={styles.calendarFooterCountText}>
                  {displayedCases.length} {displayedCases.length === 1 ? 'Matter' : 'Matters'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Section Title Header for Cases List */}
        <View style={styles.listSectionHeader}>
          <Text style={[styles.listSectionTitle, { color: colors.text }]}>
            {viewMode === 'calendar'
              ? `Hearings on ${formatDateToString(selectedCalendarDate)}`
              : 'All Assigned Hearings'}
          </Text>
          <Text style={[styles.listSectionBadge, { color: colors.textSecondary }]}>
            {displayedCases.length} Matters
          </Text>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0D6E42" />
          </View>
        ) : displayedCases.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={44} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {viewMode === 'calendar' ? 'No Hearings on this Date' : 'No Upcoming Hearings'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {viewMode === 'calendar'
                ? `No court hearings scheduled on ${formatDateToString(selectedCalendarDate)}. Select another date with green badges.`
                : 'All scheduled hearings are up to date.'}
            </Text>
            {viewMode === 'calendar' && (
              <TouchableOpacity
                style={styles.switchToListBtn}
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="list" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.switchToListBtnText}>View All Upcoming Hearings</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayedCases.map((item, idx) => (
            <TouchableOpacity
              key={item._id || idx}
              style={[
                styles.hearingCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => openCaseDetails(item)}
              activeOpacity={0.85}
            >
              <View style={styles.dateBox}>
                <Ionicons name="calendar" size={18} color="#0D6E42" />
                <Text style={styles.dateText}>{item.nextHearing}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.topRow}>
                  <Text style={[styles.caseNo, { color: colors.text }]}>{item.caseNumber}</Text>
                  {item.priority === 'Urgent' ? (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>Urgent</Text>
                    </View>
                  ) : (
                    <View style={styles.viewBadge}>
                      <Text style={styles.viewBadgeText}>A to Z Details</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.clientName, { color: colors.textSecondary }]}>
                  Client: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.clientName}</Text>
                </Text>
                <Text style={[styles.courtName, { color: colors.textSecondary }]} numberOfLines={1}>
                  <Ionicons name="location-outline" size={12} color={colors.textSecondary} /> {item.courtName}
                </Text>
              </View>

              {item.clientMobile && (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${item.clientMobile}`)}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 14,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  viewModeContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  viewModeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthTitleText: {
    fontSize: 17,
    fontWeight: '800',
  },
  todayPill: {
    marginLeft: 10,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#064E3B',
  },
  monthNavRow: {
    flexDirection: 'row',
    gap: 6,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: '#0D6E42',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#0D6E42',
  },
  dayNumberText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  dayNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  hearingDotBadge: {
    position: 'absolute',
    bottom: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#0D6E42',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  hearingDotBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  calendarFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  calendarFooterDateText: {
    fontSize: 13,
  },
  calendarFooterCountBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  calendarFooterCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D6E42',
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  listSectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  listSectionBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  hearingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dateBox: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  dateText: {
    color: '#0D6E42',
    fontWeight: '800',
    fontSize: 10.5,
    marginTop: 2,
    textAlign: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  caseNo: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    color: '#DC2626',
    fontSize: 9.5,
    fontWeight: '700',
  },
  viewBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewBadgeText: {
    color: '#2563EB',
    fontSize: 9.5,
    fontWeight: '700',
  },
  clientName: {
    fontSize: 12,
    marginBottom: 1,
  },
  courtName: {
    fontSize: 11,
  },
  callButton: {
    backgroundColor: '#0D6E42',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11.5,
    marginTop: 2,
    textAlign: 'center',
  },
  switchToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D6E42',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
  },
  switchToListBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
