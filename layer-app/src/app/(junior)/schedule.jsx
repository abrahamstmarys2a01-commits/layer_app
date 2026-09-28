import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
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
        setHearings([
          {
            _id: '1',
            caseNumber: 'CSE-001',
            clientName: 'Raj',
            clientMobile: '+91 98765 11001',
            courtName: 'Trichy District Court',
            caseType: 'Civil Suit',
            nextHearing: '28-09-2026',
            priority: 'High',
            status: 'Active',
          },
          {
            _id: '2',
            caseNumber: 'CSE-008',
            clientName: 'Kumar',
            clientMobile: '+91 98765 11008',
            courtName: 'Madurai Bench',
            caseType: 'Criminal Appeal',
            nextHearing: '02-10-2026',
            priority: 'Urgent',
            status: 'Active',
          },
          {
            _id: '3',
            caseNumber: 'CSE-012',
            clientName: 'Priya',
            clientMobile: '+91 98765 11012',
            courtName: 'Chennai City Civil Court',
            caseType: 'Commercial Dispute',
            nextHearing: '15-10-2026',
            priority: 'Normal',
            status: 'Active',
          },
        ]);
      }
    } catch (e) {
      console.error('Error fetching hearings:', e);
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
          <Text style={[styles.title, { color: colors.text }]}>Hearing Schedule</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Upcoming court dates, stages & hearing history
          </Text>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0D6E42" />
          </View>
        ) : hearings.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={44} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Upcoming Hearings</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              All scheduled hearings are up to date.
            </Text>
          </View>
        ) : (
          hearings.map((item, idx) => (
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
    paddingTop: Platform.OS === 'android' ? 24 : 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  hearingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dateBox: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  dateText: {
    color: '#0D6E42',
    fontWeight: '800',
    fontSize: 11.5,
    marginTop: 4,
    textAlign: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  caseNo: {
    fontSize: 15,
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
    fontSize: 10,
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
    fontSize: 10,
    fontWeight: '700',
  },
  clientName: {
    fontSize: 13,
    marginBottom: 2,
  },
  courtName: {
    fontSize: 12,
  },
  callButton: {
    backgroundColor: '#0D6E42',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
  },
});
