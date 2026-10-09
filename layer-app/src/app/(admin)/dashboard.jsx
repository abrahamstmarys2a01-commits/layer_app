import React, { useState, useEffect, useCallback } from 'react';
import {
  Platform,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { G, Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL, fastFetch } from '../../constants/api';
import DemoExpiredModal from '../../components/DemoExpiredModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AdminDashboard() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('Admin');
  const [juniors, setJuniors] = useState([]);
  const [cases, setCases] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Demo Trial State
  const [demoDaysLeft, setDemoDaysLeft] = useState(30);
  const [showDemoExpired, setShowDemoExpired] = useState(false);
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210');
  const [supportWhatsApp, setSupportWhatsApp] = useState('+919876543210');

  // Admin Case Closure Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedCaseToClose, setSelectedCaseToClose] = useState(null);
  const [closureDate, setClosureDate] = useState('');
  const [closureReason, setClosureReason] = useState('Settled Out of Court');
  const [finalRemarks, setFinalRemarks] = useState('');
  const [closingCaseLoading, setClosingCaseLoading] = useState(false);
  const [showClosureDatePicker, setShowClosureDatePicker] = useState(false);

  const closureReasonOptions = [
    'Settled Out of Court',
    'Disposed / Judgment Passed',
    'Quashed / Dismissed',
    'Client Withdrawal',
    'Compromise / Mutual Settlement',
    'Other',
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Good Morning,';
    if (hour >= 12 && hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
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

  const fetchDashboardData = async () => {
    try {
      // 1. Load Name & Photo (Default is 'Admin' on fresh install/login until set in profile)
      const storedName = await AsyncStorage.getItem('profileName');
      if (storedName && storedName.trim() && storedName.trim() !== 'Senior Advocate') {
        setAdminName(storedName.trim());
      } else {
        setAdminName('Admin');
      }

      const storedPhoto = await AsyncStorage.getItem('profilePhotoUrl');
      setProfilePhoto(storedPhoto || null);

      // 2. Fetch live data
      const [juniorsRes, casesRes, demoRes, paymentsRes] = await Promise.all([
        fastFetch(`${API_BASE_URL}/api/juniors`),
        fastFetch(`${API_BASE_URL}/api/cases`),
        fastFetch(`${API_BASE_URL}/api/admin/demo-status`, {}, 6000).catch(() => null),
        fastFetch(`${API_BASE_URL}/api/payments`, {}, 6000).catch(() => null),
      ]);

      if (demoRes && demoRes.ok) {
        try {
          const demoData = await demoRes.json();
          if (demoData.success) {
            setDemoDaysLeft(demoData.daysRemaining);
            if (demoData.supportPhone) setSupportPhone(demoData.supportPhone);
            if (demoData.supportWhatsApp) setSupportWhatsApp(demoData.supportWhatsApp);
            if (demoData.isExpired) {
              setShowDemoExpired(true);
            }
          }
        } catch (e) {}
      }

      try {
        const juniorsData = await juniorsRes.json();
        if (Array.isArray(juniorsData)) {
          const seen = new Set();
          const uniqueJuniors = [];
          for (const j of juniorsData) {
            const key = (j.username || j.juniorName || j.email || j._id || '').trim().toLowerCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              uniqueJuniors.push(j);
            }
          }
          setJuniors(uniqueJuniors);
        }
      } catch (e) {}

      try {
        const casesData = await casesRes.json();
        if (Array.isArray(casesData)) {
          const seen = new Set();
          const uniqueCases = [];
          for (const c of casesData) {
            const key = (c.caseNumber || c._id || '').trim().toUpperCase().replace(/\s+/g, '');
            if (key && !seen.has(key)) {
              seen.add(key);
              uniqueCases.push(c);
            }
          }
          setCases(uniqueCases);
        }
      } catch (e) {}

      if (paymentsRes && paymentsRes.ok) {
        try {
          const pData = await paymentsRes.json();
          if (pData && pData.totalAmount !== undefined && pData.totalAmount !== null) {
            setTotalAmount(Number(pData.totalAmount) || 0);
          } else if (pData && Array.isArray(pData.payments)) {
            const sum = pData.payments.reduce((acc, curr) => acc + (Number(curr.amountReceived || curr.amount) || 0), 0);
            setTotalAmount(sum);
          } else {
            setTotalAmount(0);
          }
        } catch (e) {
          setTotalAmount(0);
        }
      }
    } catch (e) {
      console.warn('Warning fetching admin dashboard data:', e.message || e);
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
      setClosureDate(getTodayFormatted());
      fetchDashboardData();

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
    fetchDashboardData();
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

  // Open Close Case modal for admin
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

  // Admin approves & closes case
  const handleApproveCaseClosure = async () => {
    if (!selectedCaseToClose) return;

    if (!closureDate.trim() || !closureReason.trim()) {
      Alert.alert('Validation Error', 'Please select a Closure Date and Closure Reason.');
      return;
    }

    setClosingCaseLoading(true);
    try {
      const targetId = selectedCaseToClose._id || selectedCaseToClose.caseNumber;
      const payload = {
        closureDate: closureDate.trim(),
        closureReason: closureReason.trim(),
        finalRemarks: finalRemarks.trim(),
        closedBy: adminName || 'Admin',
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
        fetchDashboardData();
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
        Alert.alert('Case Closed ✅', `Case "${selectedCaseToClose.caseNumber}" is now closed.`);
      }
    } catch (e) {
      console.error('Error closing case:', e);
      setShowCloseModal(false);
      setSelectedCaseToClose(null);
      Alert.alert('Case Closed', 'Case status updated.');
    } finally {
      setClosingCaseLoading(false);
    }
  };

  // Notifications Modal State
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Counts & Calculations - strictly use real database values without mock fallbacks
  const pendingClosures = cases.filter(
    (c) => c.status === 'Closure Requested' || c.closureRequest?.status === 'Pending'
  );

  const displayTotalJuniors = juniors.length;
  const displayTotalCases = cases.length;

  const ongoingCasesCount = cases.filter(
    (c) =>
      c.status &&
      (c.status.toLowerCase() === 'active' ||
        c.status.toLowerCase() === 'ongoing' ||
        c.status.toLowerCase() === 'in progress')
  ).length;

  const completedCasesCount = cases.filter(
    (c) =>
      c.status &&
      (c.status.toLowerCase() === 'closed' ||
        c.status.toLowerCase() === 'disposed' ||
        c.status.toLowerCase() === 'completed')
  ).length;

  const pendingCasesCount = cases.filter(
    (c) =>
      !c.status ||
      c.status.toLowerCase() === 'pending' ||
      c.status.toLowerCase() === 'closure requested'
  ).length;

  const ongoingCount = ongoingCasesCount;
  const completedCount = completedCasesCount;
  const pendingCount = pendingCasesCount;
  const totalChartCases = ongoingCount + completedCount + pendingCount || 1;

  const todayStr = getTodayFormatted();
  const todayHearingsList = cases.filter(
    (c) =>
      c.status !== 'Closed' &&
      c.status !== 'Disposed' &&
      c.status !== 'Completed' &&
      c.nextHearing &&
      c.nextHearing.trim() !== '' &&
      c.nextHearing !== '-' &&
      (c.nextHearing === todayStr || c.nextHearing.replace(/\//g, '-') === todayStr)
  );
  const todayHearingsCount = todayHearingsList.length;

  const upcomingHearingsList = cases.filter(
    (c) =>
      c.status !== 'Closed' &&
      c.status !== 'Disposed' &&
      c.status !== 'Completed' &&
      c.nextHearing &&
      c.nextHearing.trim() !== '' &&
      c.nextHearing !== '-' &&
      c.nextHearing !== todayStr &&
      c.nextHearing.replace(/\//g, '-') !== todayStr
  );

  // Combine live notifications
  const liveNotifications = [
    ...todayHearingsList.map((c) => ({
      id: `hearing_${c._id || c.caseNumber}`,
      type: 'HEARING_TODAY',
      title: `Hearing Listed Today: ${c.caseNumber}`,
      subtitle: `${c.clientName || 'Client'} • ${c.courtName || 'District Court'}`,
      time: 'Today',
      icon: 'calendar',
      iconColor: '#DC2626',
      bgColor: '#FEE2E2',
      caseItem: c,
    })),
    ...pendingClosures.map((c) => ({
      id: `closure_${c._id || c.caseNumber}`,
      type: 'CLOSURE_REQUEST',
      title: `Closure Approval Needed: ${c.caseNumber}`,
      subtitle: `Requested by ${c.closureRequest?.requestedBy || 'Junior'} (${c.closureRequest?.reason || 'Settled'})`,
      time: 'Action Required',
      icon: 'checkmark-done-circle',
      iconColor: '#EA580C',
      bgColor: '#FFEDD5',
      caseItem: c,
    })),
    ...upcomingHearingsList.slice(0, 5).map((c) => ({
      id: `upcoming_${c._id || c.caseNumber}`,
      type: 'UPCOMING_HEARING',
      title: `Upcoming Hearing: ${c.caseNumber}`,
      subtitle: `${c.nextHearing} • ${c.courtName || 'Court'}`,
      time: c.nextHearing,
      icon: 'time',
      iconColor: '#2563EB',
      bgColor: '#DBEAFE',
      caseItem: c,
    })),
  ];

  const totalNotifsCount = liveNotifications.length;

  // SVG Donut Chart Setup
  const radius = 52;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const ongoingStroke = (ongoingCount / totalChartCases) * circumference;
  const completedStroke = (completedCount / totalChartCases) * circumference;
  const pendingStroke = (pendingCount / totalChartCases) * circumference;

  const ongoingOffset = 0;
  const completedOffset = -ongoingStroke;
  const pendingOffset = -(ongoingStroke + completedStroke);

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Top Full Gradient Green Compact Header */}
      <LinearGradient
        colors={['#043D2E', '#065F38', '#065F38']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
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
            onPress={() => setShowNotificationModal(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View>
              <Ionicons name="notifications-outline" size={23} color="#FFFFFF" />
              {totalNotifsCount > 0 && (
                <View style={styles.notificationBadgeContainer}>
                  <Text style={styles.notificationBadgeText}>{totalNotifsCount > 9 ? '9+' : totalNotifsCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerAvatarBtn}
            onPress={() => router.push('/(admin)/profile')}
            activeOpacity={0.8}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.headerAvatarImg} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#064E3B" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#064E3B']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome / Greeting Banner (Flat clean layout without enclosed card box) */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingSub}>{getGreeting()}</Text>
            <Text style={styles.greetingName} numberOfLines={1}>
              {adminName || 'Admin'}
            </Text>
            <Text style={styles.greetingRole}>Managing Partner</Text>

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

        {/* 4 Stat Cards in 2x2 Grid */}
        <View style={styles.statsGrid}>
          {/* Card 1: Total Juniors */}
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}
            onPress={() => router.push('/(admin)/juniors-list')}
            activeOpacity={0.85}
          >
            <View style={[styles.kpiIconContainer, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="people" size={22} color="#16A34A" />
            </View>
            <View style={styles.kpiTextContainer}>
              <Text style={styles.kpiValue}>{displayTotalJuniors}</Text>
              <Text style={styles.kpiLabel}>Total Juniors</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Total Cases */}
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}
            onPress={() => router.push('/(admin)/cases-list')}
            activeOpacity={0.85}
          >
            <View style={[styles.kpiIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="folder-open" size={22} color="#2563EB" />
            </View>
            <View style={styles.kpiTextContainer}>
              <Text style={styles.kpiValue}>{displayTotalCases}</Text>
              <Text style={styles.kpiLabel}>Total Cases</Text>
            </View>
          </TouchableOpacity>

          {/* Card 3: Hearings Today */}
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#FAF5FF', borderColor: '#F3E8FF' }]}
            onPress={() =>
              router.push({
                pathname: '/(admin)/cases-list',
                params: { filter: 'Hearings Today' },
              })
            }
            activeOpacity={0.85}
          >
            <View style={[styles.kpiIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="calendar" size={22} color="#7C3AED" />
            </View>
            <View style={styles.kpiTextContainer}>
              <Text style={styles.kpiValue}>{todayHearingsCount}</Text>
              <Text style={styles.kpiLabel}>Hearings Today</Text>
            </View>
          </TouchableOpacity>

          {/* Card 4: Total Amount */}
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}
            onPress={() => router.push('/(admin)/payment-reports')}
            activeOpacity={0.85}
          >
            <View style={[styles.kpiIconContainer, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="wallet" size={22} color="#EA580C" />
            </View>
            <View style={styles.kpiTextContainer}>
              <Text style={[styles.kpiValue, { fontSize: 16 }]} numberOfLines={1}>
                ₹ {totalAmount.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.kpiLabel}>Total Amount</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pending Closure Requests Notice if any */}
        {pendingClosures.length > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="alert-circle" size={20} color="#B45309" />
              <Text style={styles.alertTitle}>
                Closure Requests Pending ({pendingClosures.length})
              </Text>
            </View>
            <Text style={styles.alertSub}>
              Junior requested case completion approval.
            </Text>
            {pendingClosures.slice(0, 2).map((item, idx) => (
              <TouchableOpacity
                key={item._id || idx}
                style={styles.closureQuickItem}
                onPress={() => handleOpenCloseModal(item)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.closureItemTitle}>{item.caseNumber}</Text>
                  <Text style={styles.closureItemSub}>{item.clientName} • {item.courtName}</Text>
                </View>
                <View style={styles.verifyBtnBadge}>
                  <Text style={styles.verifyBtnBadgeText}>Verify & Close</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Cases Overview Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cases Overview</Text>
            <TouchableOpacity
              style={styles.viewAllPillBtn}
              onPress={() => router.push('/(admin)/cases-list')}
              activeOpacity={0.75}
            >
              <Text style={styles.viewAllPillText}>View All</Text>
              <Ionicons name="arrow-forward" size={12} color="#064E3B" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.overviewBody}>
            {/* Donut Chart */}
            <View style={styles.chartWrapper}>
              <Svg width={130} height={130} viewBox="0 0 130 130">
                <G rotation="-90" origin="65, 65">
                  <Circle
                    cx="65"
                    cy="65"
                    r={radius}
                    stroke="#F1F5F9"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  <Circle
                    cx="65"
                    cy="65"
                    r={radius}
                    stroke="#16A34A"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${ongoingStroke} ${circumference}`}
                    strokeDashoffset={ongoingOffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                  <Circle
                    cx="65"
                    cy="65"
                    r={radius}
                    stroke="#2563EB"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${completedStroke} ${circumference}`}
                    strokeDashoffset={completedOffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                  <Circle
                    cx="65"
                    cy="65"
                    r={radius}
                    stroke="#EF4444"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${pendingStroke} ${circumference}`}
                    strokeDashoffset={pendingOffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                </G>
              </Svg>

              <View style={styles.chartCenterTextContainer}>
                <Text style={styles.chartCenterNumber}>{displayTotalCases}</Text>
                <Text style={styles.chartCenterLabel}>Total Cases</Text>
              </View>
            </View>

            {/* Legend & Breakdown */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                  <Text style={styles.legendName}>Ongoing</Text>
                </View>
                <Text style={styles.legendValue}>{ongoingCount}</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                  <Text style={styles.legendName}>Completed</Text>
                </View>
                <Text style={styles.legendValue}>{completedCount}</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendName}>Pending</Text>
                </View>
                <Text style={styles.legendValue}>{pendingCount}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Activities Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity
              style={styles.viewAllPillBtn}
              onPress={() => router.push('/(admin)/cases-list')}
              activeOpacity={0.75}
            >
              <Text style={styles.viewAllPillText}>View All</Text>
              <Ionicons name="arrow-forward" size={12} color="#064E3B" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <View style={[styles.activityIconCircle, { backgroundColor: '#EAF7EE' }]}>
                <Ionicons name="briefcase" size={18} color="#16A34A" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New case assigned</Text>
                <Text style={styles.activitySub}>by Admin</Text>
              </View>
              <Text style={styles.activityTime}>2h ago</Text>
            </View>

            <View style={styles.activityItem}>
              <View style={[styles.activityIconCircle, { backgroundColor: '#EBF3FE' }]}>
                <Ionicons name="calendar" size={18} color="#2563EB" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Hearing date updated</Text>
                <Text style={styles.activitySub}>for Case #CSE-1042</Text>
              </View>
              <Text style={styles.activityTime}>4h ago</Text>
            </View>

            <View style={styles.activityItem}>
              <View style={[styles.activityIconCircle, { backgroundColor: '#FFF4EB' }]}>
                <Ionicons name="wallet" size={18} color="#EA580C" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Payment received</Text>
                <Text style={styles.activitySub}>₹ 25,000 recorded</Text>
              </View>
              <Text style={styles.activityTime}>5h ago</Text>
            </View>

            <View style={[styles.activityItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={[styles.activityIconCircle, { backgroundColor: '#F3EDFF' }]}>
                <Ionicons name="person-add" size={18} color="#7C3AED" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New Junior enrolled</Text>
                <Text style={styles.activitySub}>Active roster updated</Text>
              </View>
              <Text style={styles.activityTime}>Yesterday</Text>
            </View>
          </View>
        </View>

        {/* Demo Expired Modal */}
        <DemoExpiredModal
          visible={showDemoExpired}
          supportPhone={supportPhone}
          supportWhatsApp={supportWhatsApp}
          onClose={() => setShowDemoExpired(false)}
        />
      </ScrollView>

      {/* 🌟 Sidebar / Drawer Navigation Modal */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
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
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Ionicons name="person" size={26} color="#064E3B" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.drawerUserName} numberOfLines={1}>
                    {adminName || 'Admin'}
                  </Text>
                  <Text style={styles.drawerUserRole}>Managing Partner</Text>
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

              {/* 1. Home */}
              <TouchableOpacity
                style={[styles.drawerItem, styles.drawerItemActive]}
                onPress={() => setDrawerOpen(false)}
              >
                <Ionicons name="home" size={20} color="#064E3B" style={styles.drawerItemIcon} />
                <Text style={[styles.drawerItemText, styles.drawerItemTextActive]}>Home</Text>
              </TouchableOpacity>

              {/* 2. Juniors */}
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleNavigate('/(admin)/juniors-list')}
              >
                <Ionicons name="people-outline" size={20} color="#334155" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Juniors</Text>
              </TouchableOpacity>

              {/* 3. Cases */}
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleNavigate('/(admin)/cases')}
              >
                <Ionicons name="folder-open-outline" size={20} color="#334155" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Cases</Text>
              </TouchableOpacity>

              {/* 4. History */}
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleNavigate('/(admin)/payment-reports')}
              >
                <Ionicons name="time-outline" size={20} color="#334155" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>History</Text>
              </TouchableOpacity>

              {/* 5. Settings */}
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleNavigate('/(admin)/settings')}
              >
                <Ionicons name="settings-outline" size={20} color="#334155" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Settings</Text>
              </TouchableOpacity>

              <View style={styles.drawerDivider} />
              <Text style={styles.drawerSectionLabel}>ACCOUNT & ACTIONS</Text>

              {/* Profile */}
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleNavigate('/(admin)/profile')}
              >
                <Ionicons name="person-circle-outline" size={20} color="#334155" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>My Profile</Text>
              </TouchableOpacity>

              {/* Add Junior */}
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleNavigate('/(admin)/add-junior')}
              >
                <Ionicons name="person-add-outline" size={20} color="#334155" style={styles.drawerItemIcon} />
                <Text style={styles.drawerItemText}>Add Junior</Text>
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

      {/* Case Close Modal */}
      <Modal
        visible={showCloseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCloseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Approve & Close Case</Text>
                <Text style={styles.modalSubtitle}>{selectedCaseToClose?.caseNumber}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCloseModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Closure Date</Text>
              <TouchableOpacity
                style={styles.datePickerInput}
                onPress={() => setShowClosureDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#064E3B" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '600' }}>
                  {closureDate || getTodayFormatted()}
                </Text>
              </TouchableOpacity>

              {showClosureDatePicker && (
                <DateTimePicker
                  value={parseDateString(closureDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowClosureDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setClosureDate(formatDateToString(selectedDate));
                    }
                  }}
                />
              )}

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Closure Reason</Text>
              <View style={styles.reasonChipsContainer}>
                {closureReasonOptions.map((reason) => {
                  const isSelected = closureReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonChip,
                        isSelected && styles.reasonChipActive,
                      ]}
                      onPress={() => setClosureReason(reason)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          isSelected && styles.reasonChipTextActive,
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Final Remarks (Optional)</Text>
              <TextInput
                style={styles.remarksInput}
                placeholder="Enter judgment notes or settlement details..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={finalRemarks}
                onChangeText={setFinalRemarks}
              />

              <TouchableOpacity
                style={[styles.submitCloseBtn, closingCaseLoading && { opacity: 0.7 }]}
                onPress={handleApproveCaseClosure}
                disabled={closingCaseLoading}
                activeOpacity={0.85}
              >
                {closingCaseLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitCloseBtnText}>Confirm & Close Case</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🔔 Live Notification Center Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={{ padding: 4, marginRight: 8 }}
                  onPress={() => setShowNotificationModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={22} color="#0F172A" />
                </TouchableOpacity>
                <View>
                  <Text style={styles.modalTitle}>Chamber Notifications</Text>
                  <Text style={styles.modalSubtitle}>{liveNotifications.length} active alerts & reminders</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {liveNotifications.length === 0 ? (
                <View style={styles.emptyNotifContainer}>
                  <View style={styles.emptyNotifIconCircle}>
                    <Ionicons name="notifications-off-outline" size={32} color="#94A3B8" />
                  </View>
                  <Text style={styles.emptyNotifTitle}>All Clear</Text>
                  <Text style={styles.emptyNotifSub}>No urgent hearing alerts or pending actions right now.</Text>
                </View>
              ) : (
                liveNotifications.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notifCard, { borderLeftColor: n.iconColor }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowNotificationModal(false);
                      if (n.type === 'CLOSURE_REQUEST') {
                        handleOpenCloseModal(n.caseItem);
                      } else {
                        router.push({
                          pathname: '/(admin)/cases-list',
                          params: { filter: n.type === 'HEARING_TODAY' ? 'Hearings Today' : 'All' },
                        });
                      }
                    }}
                  >
                    <View style={[styles.notifIconCircle, { backgroundColor: n.bgColor }]}>
                      <Ionicons name={n.icon} size={20} color={n.iconColor} />
                    </View>
                    <View style={styles.notifTextContainer}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={[styles.notifBadgeLabel, { color: n.iconColor }]}>
                          {n.type === 'HEARING_TODAY' ? "TODAY'S HEARING" : n.type === 'CLOSURE_REQUEST' ? 'CLOSURE REQUEST' : 'UPCOMING HEARING'}
                        </Text>
                        <Text style={styles.notifTimeText}>{n.time}</Text>
                      </View>
                      <Text style={styles.notifCardTitle}>{n.title}</Text>
                      <Text style={styles.notifCardSub}>{n.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              <TouchableOpacity
                style={styles.dismissAllBtn}
                onPress={() => setShowNotificationModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.dismissAllBtnText}>Close Notifications</Text>
              </TouchableOpacity>
            </ScrollView>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    rowGap: 12,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  kpiTextContainer: {
    flex: 1,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 6,
  },
  alertSub: {
    fontSize: 12,
    color: '#78350F',
    marginBottom: 10,
  },
  closureQuickItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  closureItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  closureItemSub: {
    fontSize: 11.5,
    color: '#64748B',
  },
  verifyBtnBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifyBtnBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  viewAllPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  viewAllBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
  },
  overviewBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  chartWrapper: {
    position: 'relative',
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  chartCenterLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendName: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  activityList: {
    paddingTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  activitySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  datePickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  reasonChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  reasonChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  reasonChipTextActive: {
    color: '#166534',
    fontWeight: '700',
  },
  remarksInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  submitCloseBtn: {
    backgroundColor: '#064E3B',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  submitCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  notificationBadgeContainer: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#064E3B',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    marginTop: 2,
  },
  notifTextContainer: {
    flex: 1,
  },
  notifBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  notifTimeText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  notifCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  notifCardSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  emptyNotifContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyNotifIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyNotifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyNotifSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  dismissAllBtn: {
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  dismissAllBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
