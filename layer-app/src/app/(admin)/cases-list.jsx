import React, { useState, useCallback } from 'react';
import {
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function CasesListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useAppTheme();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState(params.filter || 'All');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(params.filter === 'Hearings Today' ? 'calendar' : 'list');

  // Admin Case Closure Modal state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedCaseToClose, setSelectedCaseToClose] = useState(null);
  const [closureDate, setClosureDate] = useState('');
  const [closureReason, setClosureReason] = useState('Settled Out of Court');
  const [finalRemarks, setFinalRemarks] = useState('');
  const [closingLoading, setClosingLoading] = useState(false);
  const [showClosureDatePicker, setShowClosureDatePicker] = useState(false);

  const closureReasonOptions = [
    'Settled Out of Court',
    'Disposed / Judgment Passed',
    'Quashed / Dismissed',
    'Client Withdrawal',
    'Compromise / Mutual Settlement',
    'Other',
  ];

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

  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateToString = (dateObj) => {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const parseDateString = (dateStr) => {
    if (!dateStr || dateStr === '-') return new Date();
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date();
  };

  const fetchCases = async () => {
    setLoading(true);
    try {
      const response = await fastFetch(`${API_BASE_URL}/api/cases`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const seen = new Set();
        const unique = [];
        for (const c of data) {
          const key = (c.caseNumber || c._id || '').trim().toUpperCase().replace(/\s+/g, '');
          if (key && !seen.has(key)) {
            seen.add(key);
            unique.push(c);
          }
        }
        setCases(unique);
      } else {
        setCases([]);
      }
    } catch (e) {
      console.error('Error fetching cases:', e);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setClosureDate(getTodayFormatted());
      if (params.filter) {
        setFilterType(params.filter);
        if (params.filter === 'Hearings Today') {
          setViewMode('calendar');
          setSelectedCalendarDate(new Date());
          setCurrentMonth(new Date());
        }
      }
      fetchCases();
    }, [params.filter])
  );

  const hearingMap = React.useMemo(() => {
    const map = {};
    cases.forEach((c) => {
      if (c.status === 'Closed' || c.status === 'Disposed' || c.status === 'Completed') return;
      const key = normalizeDateKey(c.nextHearing);
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(c);
      }
    });
    return map;
  }, [cases]);

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

  const handleOpenCloseModal = (c) => {
    setSelectedCaseToClose(c);
    setClosureDate(getTodayFormatted());
    if (c.closureRequest?.reason) {
      setClosureReason(c.closureRequest.reason);
    } else {
      setClosureReason('Settled Out of Court');
    }
    setFinalRemarks('');
    setShowCloseModal(true);
  };

  const handleApproveClosure = async () => {
    if (!selectedCaseToClose) return;

    if (!closureDate.trim() || !closureReason.trim()) {
      Alert.alert('Validation Error', 'Please select a Closure Date and Closure Reason.');
      return;
    }

    setClosingLoading(true);
    try {
      const storedName = await AsyncStorage.getItem('profileName');
      const closedBy = storedName || 'Admin';

      const targetId = selectedCaseToClose._id || selectedCaseToClose.caseNumber;
      const payload = {
        closureDate: closureDate.trim(),
        closureReason: closureReason.trim(),
        finalRemarks: finalRemarks.trim(),
        closedBy,
      };

      const response = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Case Closed! ✅', `Case "${selectedCaseToClose.caseNumber}" has been closed.`);
        setShowCloseModal(false);
        setSelectedCaseToClose(null);
        fetchCases();
      } else {
        setCases((prev) =>
          prev.map((c) =>
            c.caseNumber === selectedCaseToClose.caseNumber
              ? {
                  ...c,
                  status: 'Closed',
                  closureDetails: payload,
                  closureRequest: { ...c.closureRequest, status: 'Approved' },
                }
              : c
          )
        );
        setShowCloseModal(false);
        setSelectedCaseToClose(null);
        Alert.alert('Case Closed ✅', `Case "${selectedCaseToClose.caseNumber}" is now marked as Closed.`);
      }
    } catch (e) {
      console.error('Error closing case:', e);
      setCases((prev) =>
        prev.map((c) =>
          c.caseNumber === selectedCaseToClose?.caseNumber
            ? { ...c, status: 'Closed' }
            : c
        )
      );
      setShowCloseModal(false);
      setSelectedCaseToClose(null);
      Alert.alert('Case Closed', 'Case status updated to Closed.');
    } finally {
      setClosingLoading(false);
    }
  };

  const selectedDateKey = formatDayKey(
    selectedCalendarDate.getFullYear(),
    selectedCalendarDate.getMonth(),
    selectedCalendarDate.getDate()
  );

  const filteredCases = cases.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (c.caseNumber && c.caseNumber.toLowerCase().includes(q)) ||
      (c.clientName && c.clientName.toLowerCase().includes(q)) ||
      (c.courtName && c.courtName.toLowerCase().includes(q)) ||
      (c.assignedJunior && c.assignedJunior.toLowerCase().includes(q)) ||
      (c.caseType && c.caseType.toLowerCase().includes(q));

    const isClosed = c.status === 'Closed' || c.status === 'Disposed' || c.status === 'Completed';
    const isClosureReq = c.status === 'Closure Requested' || c.closureRequest?.status === 'Pending';
    const isActive = !isClosed && !isClosureReq;
    const isHearing = !isClosed && Boolean(c.nextHearing && c.nextHearing.trim() !== '' && c.nextHearing !== '-');

    if (viewMode === 'calendar') {
      const caseKey = normalizeDateKey(c.nextHearing);
      const matchesDate = caseKey === selectedDateKey;
      return matchesSearch && matchesDate && !isClosed;
    }

    const matchesFilter =
      filterType === 'All' ||
      (filterType === 'Hearings Today' && isHearing) ||
      (filterType === 'Active' && isActive) ||
      (filterType === 'Closure Requested' && isClosureReq) ||
      (filterType === 'Closed Cases' && isClosed) ||
      (filterType === 'High Priority' && c.priority === 'High');

    return matchesSearch && matchesFilter;
  });

  const totalHearingsCount = Object.values(hearingMap).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0B1120' : '#FFFFFF'} />
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.subCardBg }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={[styles.navTitle, { color: colors.text }]}>
            {viewMode === 'calendar' ? 'Court Hearings Calendar' : filterType === 'Hearings Today' ? "Today's Hearings List" : 'All Cases Directory'}
          </Text>
          <Text style={[styles.navSubtitle, { color: colors.textSecondary }]}>
            {viewMode === 'calendar'
              ? `${filteredCases.length} Hearings on ${formatDateToString(selectedCalendarDate)}`
              : filterType === 'Hearings Today'
              ? `${filteredCases.length} Hearings Scheduled`
              : `${cases.length} Total Matters`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primaryButtonBg }]}
          onPress={() => router.push('/(admin)/cases')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* View Mode Switcher Pill */}
        <View style={[styles.viewModeContainer, { backgroundColor: colors.subCardBg }]}>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'list' && [styles.viewModeBtnActive, { backgroundColor: colors.card }]]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? '#064E3B' : colors.textSecondary} />
            <Text style={[styles.viewModeText, viewMode === 'list' && { color: '#064E3B', fontWeight: '800' }]}>
              Directory List
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'calendar' && [styles.viewModeBtnActive, { backgroundColor: '#7C3AED' }]]}
            onPress={() => setViewMode('calendar')}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={16} color={viewMode === 'calendar' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.viewModeText, viewMode === 'calendar' && { color: '#FFFFFF', fontWeight: '800' }]}>
              Calendar View ({totalHearingsCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.borderInput }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by case no, client, court, junior..."
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

        {/* 📅 Interactive Calendar Component (shown in calendar mode) */}
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
                        isToday && !isSelected && { color: '#064E3B', fontWeight: '800' },
                      ]}
                    >
                      {item.day}
                    </Text>

                    {hasHearings && (
                      <View style={[styles.hearingDotBadge, isSelected && { backgroundColor: '#FDE047' }]}>
                        <Text style={[styles.hearingDotBadgeText, isSelected && { color: '#7C3AED' }]}>
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
                <Ionicons name="calendar-outline" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={[styles.calendarFooterDateText, { color: colors.text }]}>
                  Selected: <Text style={{ fontWeight: '800', color: '#7C3AED' }}>{formatDateToString(selectedCalendarDate)}</Text>
                </Text>
              </View>
              <View style={styles.calendarFooterCountBadge}>
                <Text style={styles.calendarFooterCountText}>
                  {filteredCases.length} {filteredCases.length === 1 ? 'Matter' : 'Matters'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter Chips (shown in list mode) */}
        {viewMode === 'list' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView} contentContainerStyle={styles.filterRow}>
            {['All', 'Hearings Today', 'Active', 'Closure Requested', 'Closed Cases', 'High Priority'].map((type) => {
              const isSelected = filterType === type;
              let badgeCount = null;
              if (type === 'Hearings Today') {
                const cnt = cases.filter(
                  (c) =>
                    c.status !== 'Closed' &&
                    c.status !== 'Disposed' &&
                    c.status !== 'Completed' &&
                    c.nextHearing &&
                    c.nextHearing.trim() !== '' &&
                    c.nextHearing !== '-'
                ).length;
                if (cnt > 0) badgeCount = cnt;
              } else if (type === 'Closure Requested') {
                const cnt = cases.filter((c) => c.status === 'Closure Requested' || c.closureRequest?.status === 'Pending').length;
                if (cnt > 0) badgeCount = cnt;
              } else if (type === 'Closed Cases') {
                const cnt = cases.filter((c) => c.status === 'Closed' || c.status === 'Disposed').length;
                if (cnt > 0) badgeCount = cnt;
              }

              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.card, borderColor: colors.borderInput },
                    isSelected && {
                      backgroundColor:
                        type === 'Hearings Today'
                          ? '#7C3AED'
                          : type === 'Closure Requested'
                          ? '#D97706'
                          : type === 'Closed Cases'
                          ? '#16A34A'
                          : colors.primaryButtonBg,
                      borderColor:
                        type === 'Hearings Today'
                          ? '#7C3AED'
                          : type === 'Closure Requested'
                          ? '#D97706'
                          : type === 'Closed Cases'
                          ? '#16A34A'
                          : colors.primaryButtonBg,
                    },
                  ]}
                  onPress={() => setFilterType(type)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.textSecondary },
                      isSelected && { color: '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    {type}
                    {badgeCount !== null ? ` (${badgeCount})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Section Title Header for Cases List */}
        <View style={styles.listSectionHeader}>
          <Text style={[styles.listSectionTitle, { color: colors.text }]}>
            {viewMode === 'calendar'
              ? `Hearings on ${formatDateToString(selectedCalendarDate)}`
              : `${filterType} Matters`}
          </Text>
          <Text style={[styles.listSectionBadge, { color: colors.textSecondary }]}>
            {filteredCases.length} Cases
          </Text>
        </View>

        {/* List Content */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryButtonBg} style={{ marginTop: 40 }} />
        ) : filteredCases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {viewMode === 'calendar' ? 'No Hearings on this Date' : 'No Cases Found'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {viewMode === 'calendar'
                ? `No court matters scheduled on ${formatDateToString(selectedCalendarDate)}. Select another date on the calendar.`
                : searchQuery
                ? 'No matters matched your search query.'
                : filterType === 'Hearings Today'
                ? 'No hearing schedules listed for today.'
                : filterType === 'Closed Cases'
                ? 'No cases have been closed yet.'
                : filterType === 'Closure Requested'
                ? 'No pending case closure requests.'
                : 'No cases have been registered in the system yet.'}
            </Text>
            {viewMode === 'calendar' ? (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: '#7C3AED' }]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="list" size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Switch to All Cases Directory</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primaryButtonBg }]}
                onPress={() => router.push('/(admin)/cases')}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Register New Case</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredCases.map((c, index) => {
            const isHighPriority = c.priority === 'High';
            const isClosed = c.status === 'Closed' || c.status === 'Disposed' || c.status === 'Completed';
            const isClosureReq = c.status === 'Closure Requested' || c.closureRequest?.status === 'Pending';
            const isActive = !isClosed && !isClosureReq;

            return (
              <View
                key={c._id || index}
                style={[
                  styles.caseCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isClosureReq ? '#F59E0B' : isClosed ? '#86EFAC' : colors.border,
                    borderWidth: isClosureReq || isClosed ? 1.5 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.caseBadgeRow}>
                    <View style={[styles.timeBadge, isClosed && { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons
                        name={isClosed ? 'checkmark-circle' : 'calendar-outline'}
                        size={13}
                        color={isClosed ? '#16A34A' : '#D97706'}
                      />
                      <Text style={[styles.timeBadgeText, isClosed && { color: '#16A34A' }]}>
                        {isClosed
                          ? `Closed: ${c.closureDetails?.closureDate || c.updatedAt?.split('T')[0] || 'Disposed'}`
                          : c.filedDate
                          ? `Filed: ${c.filedDate}`
                          : 'Recently Filed'}
                      </Text>
                    </View>
                    {c.nextHearing && c.nextHearing !== '-' && !isClosed && (
                      <View style={styles.hearingBadge}>
                        <Ionicons name="alarm-outline" size={12} color="#7C3AED" />
                        <Text style={styles.hearingBadgeText}>Hearing: {c.nextHearing}</Text>
                      </View>
                    )}
                    {isHighPriority && (
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityBadgeText}>HIGH PRIORITY</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.statusDotContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: isClosed ? '#16A34A' : isClosureReq ? '#D97706' : '#10B981',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusTextSmall,
                        {
                          color: isClosed ? '#16A34A' : isClosureReq ? '#D97706' : colors.textSecondary,
                          fontWeight: isClosed || isClosureReq ? '700' : '500',
                        },
                      ]}
                    >
                      {isClosed ? 'CLOSED ✅' : isClosureReq ? 'Closure Requested ⏳' : (c.status || 'Active')}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.caseNumber, { color: isClosed ? '#16A34A' : colors.textSecondary }]}>
                  {c.caseNumber || 'UNASSIGNED-NO'}
                </Text>
                <Text style={[styles.caseTitle, { color: colors.text }]}>
                  {c.clientName} {c.caseType ? `• ${c.caseType}` : ''}
                </Text>
                {c.courtName ? (
                  <View style={styles.courtRow}>
                    <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.courtText, { color: colors.textSecondary }]}>{c.courtName}</Text>
                  </View>
                ) : null}

                {c.caseDescription ? (
                  <Text style={[styles.caseDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {c.caseDescription}
                  </Text>
                ) : null}

                {/* Closure Details Box for Closed Cases */}
                {isClosed && c.closureDetails && (
                  <View style={styles.closedCaseInfoBox}>
                    <Text style={styles.closedInfoItem}>
                      ⚖️ <Text style={{ fontWeight: '700' }}>Reason: </Text>
                      {c.closureDetails.closureReason || 'Case Disposed'}
                    </Text>
                    {c.closureDetails.finalRemarks ? (
                      <Text style={styles.closedInfoItem}>
                        📝 <Text style={{ fontWeight: '700' }}>Remarks: </Text>
                        {c.closureDetails.finalRemarks}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Closure Request Prompt for Closure Requested cases */}
                {isClosureReq && (
                  <View style={styles.closureReqPromptBox}>
                    <Text style={styles.closureReqPromptText}>
                      <Text style={{ fontWeight: '700' }}>Requested By: </Text>
                      {c.closureRequest?.requestedBy || c.assignedJunior || 'Junior'}
                    </Text>
                    {c.closureRequest?.reason && (
                      <Text style={styles.closureReqPromptText}>
                        <Text style={{ fontWeight: '700' }}>Reason: </Text>
                        {c.closureRequest.reason}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.verifyClosureBtn}
                      onPress={() => handleOpenCloseModal(c)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.verifyClosureBtnText}>Verify & Close Case</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={[styles.detailsBox, { backgroundColor: colors.subCardBg, borderTopColor: colors.border }]}>
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assigned Junior</Text>
                    <View style={styles.juniorTag}>
                      <Ionicons name="person-outline" size={12} color={isDark ? '#60A5FA' : '#4F46E5'} />
                      <Text style={[styles.juniorTagText, { color: isDark ? '#60A5FA' : '#4F46E5' }]}>
                        {c.assignedJunior || 'Unassigned'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      {isClosed ? 'Status' : 'Next Hearing'}
                    </Text>
                    <Text style={[styles.detailValue, { color: isClosed ? '#16A34A' : colors.text, fontWeight: isClosed ? '700' : '500' }]}>
                      {isClosed ? 'Case Closed' : (c.nextHearing || 'Not Scheduled')}
                    </Text>
                  </View>

                  {/* Option for Admin to close active cases directly */}
                  {isActive && (
                    <TouchableOpacity
                      style={styles.directCloseBtn}
                      onPress={() => handleOpenCloseModal(c)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#0D6E42" style={{ marginRight: 4 }} />
                      <Text style={styles.directCloseBtnText}>Close Case</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Admin Verify & Close Case Modal */}
      <Modal visible={showCloseModal} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.closureModalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#166534" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.modalMainTitle, { color: colors.text }]}>Admin Case Closure</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    {selectedCaseToClose?.caseNumber} - {selectedCaseToClose?.clientName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCloseModal(false)} style={styles.modalCloseCircle}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Closure Date Field with DateTimePicker */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Closure Date *</Text>
                <TouchableOpacity
                  style={[styles.modalDatePickerBtn, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}
                  onPress={() => setShowClosureDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar" size={18} color="#0D6E42" style={{ marginRight: 10 }} />
                  <Text style={[styles.modalDatePickerBtnText, { color: colors.text }]}>
                    {closureDate || 'Select Closure Date'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                {showClosureDatePicker && (
                  <DateTimePicker
                    value={parseDateString(closureDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowClosureDatePicker(false);
                      if (selectedDate) {
                        setClosureDate(formatDateToString(selectedDate));
                      }
                    }}
                  />
                )}
              </View>

              {/* Closure Reason Options */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>Closure Reason *</Text>
                <View style={styles.reasonChipsWrap}>
                  {closureReasonOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.reasonChip,
                        { backgroundColor: colors.subCardBg, borderColor: colors.borderInput },
                        closureReason === opt && styles.reasonChipActive,
                      ]}
                      onPress={() => setClosureReason(opt)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          { color: colors.textSecondary },
                          closureReason === opt && styles.reasonChipTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Final Remarks */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>
                  Final Remarks / Judgement Summary
                </Text>
                <TextInput
                  style={[styles.modalTextArea, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text }]}
                  placeholder="Enter final decree, order copy reference or settlement particulars..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={finalRemarks}
                  onChangeText={setFinalRemarks}
                />
              </View>

              <View style={styles.closureNoticeBox}>
                <Ionicons name="information-circle-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.closureNoticeText}>
                  Once approved, case status will change to CLOSED ✅ and will show under Closed Cases.
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { borderColor: colors.border }]}
                onPress={() => setShowCloseModal(false)}
                disabled={closingLoading}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmCloseBtn, closingLoading && { opacity: 0.8 }]}
                onPress={handleApproveClosure}
                disabled={closingLoading}
              >
                {closingLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmCloseBtnText}>Approve & Close Case</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  navTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  navSubtitle: {
    fontSize: 12,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  caseCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  caseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 4,
  },
  hearingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hearingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    marginLeft: 4,
  },
  priorityBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
  },
  statusDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  caseNumber: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  caseTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  courtText: {
    fontSize: 13,
  },
  caseDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: 12,
    borderTopWidth: 1,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  juniorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  juniorTagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 18,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  filterScrollView: {
    marginBottom: 16,
  },
  closedCaseInfoBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  closedInfoItem: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 3,
  },
  closureReqPromptBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  closureReqPromptText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
  },
  verifyClosureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D6E42',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  verifyClosureBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  directCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'center',
  },
  directCloseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  closureModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMainTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalDatePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  modalDatePickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reasonChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  reasonChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reasonChipTextActive: {
    color: '#166534',
    fontWeight: '700',
  },
  modalTextArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    height: 76,
    textAlignVertical: 'top',
  },
  closureNoticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  closureNoticeText: {
    fontSize: 11.5,
    color: '#0284C7',
    flex: 1,
    lineHeight: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmCloseBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#7C3AED',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#064E3B',
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
    backgroundColor: '#7C3AED',
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
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  calendarFooterCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  listSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  listSectionBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
});
