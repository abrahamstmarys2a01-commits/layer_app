import React, { useState, useEffect, useCallback } from 'react';
import {
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function JuniorsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [juniors, setJuniors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchJuniors = async () => {
    setLoading(true);
    try {
      const response = await fastFetch(`${API_BASE_URL}/api/juniors`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const seen = new Set();
        const unique = [];
        for (const j of data) {
          const key = (j.username || j.juniorName || j.email || j._id || '').trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            unique.push(j);
          }
        }
        setJuniors(unique);
      } else {
        setJuniors([]);
      }
    } catch (e) {
      console.error('Error fetching juniors:', e);
      setJuniors([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJuniors();
    }, [])
  );

  const filteredJuniors = juniors.filter((j) => {
    const matchesSearch =
      (j.juniorName && j.juniorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (j.email && j.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (j.mobileNumber && j.mobileNumber.includes(searchQuery));

    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Active' && j.status === 'Active') ||
      (filterStatus === 'Inactive' && j.status !== 'Active');

    return matchesSearch && matchesStatus;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0B1120' : '#FFFFFF'} />
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.subCardBg }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={[styles.navTitle, { color: colors.text }]}>Junior Associates Roster</Text>
          <Text style={[styles.navSubtitle, { color: colors.textSecondary }]}>{juniors.length} Lawyers Registered</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primaryButtonBg }]}
          onPress={() => router.push('/(admin)/add-junior')}
        >
          <Ionicons name="person-add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.borderInput }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, email, or mobile..."
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

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {['All', 'Active', 'Inactive'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.borderInput },
                filterStatus === status && {
                  backgroundColor: colors.primaryButtonBg,
                  borderColor: colors.primaryButtonBg,
                },
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  filterStatus === status && { color: '#FFFFFF', fontWeight: '700' },
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List Content */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryButtonBg} style={{ marginTop: 40 }} />
        ) : filteredJuniors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Juniors Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'No associates matched your search criteria.'
                : 'No junior lawyers have been registered yet.'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primaryButtonBg }]}
              onPress={() => router.push('/(admin)/add-junior')}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Junior Lawyer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredJuniors.map((junior, index) => {
            const isActive = junior.status === 'Active';
            return (
              <View 
                key={junior._id || index} 
                style={[styles.juniorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: isDark ? '#3B82F6' : '#0F172A' }]}>
                    <Text style={styles.avatarText}>
                      {junior.juniorName?.charAt(0) || 'J'}
                    </Text>
                  </View>
                  <View style={styles.headerInfo}>
                    <Text style={[styles.juniorName, { color: colors.text }]}>{junior.juniorName}</Text>
                    <Text style={[styles.username, { color: colors.textSecondary }]}>@{junior.username || 'associate'}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isActive ? '#166534' : '#991B1B' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: isActive ? '#166534' : '#991B1B' },
                      ]}
                    >
                      {junior.status || 'Active'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.cardDetails, { backgroundColor: colors.subCardBg }]}>
                  <TouchableOpacity
                    style={styles.detailRow}
                    onPress={() => junior.mobileNumber && Linking.openURL(`tel:${junior.mobileNumber}`)}
                  >
                    <Ionicons name="call-outline" size={16} color={isDark ? '#60A5FA' : '#4F46E5'} />
                    <Text style={[styles.detailText, { color: colors.text }]}>{junior.mobileNumber || 'No phone'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailRow}
                    onPress={() => junior.email && Linking.openURL(`mailto:${junior.email}`)}
                  >
                    <Ionicons name="mail-outline" size={16} color={isDark ? '#60A5FA' : '#4F46E5'} />
                    <Text style={[styles.detailText, { color: colors.text }]}>{junior.email || 'No email'}</Text>
                  </TouchableOpacity>

                  {junior.joiningDate ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailSubtext, { color: colors.textSecondary }]}>Joined: {junior.joiningDate}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  juniorCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  juniorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  username: {
    fontSize: 12,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailSubtext: {
    fontSize: 12,
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
});
