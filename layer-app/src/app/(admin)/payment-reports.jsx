import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function PaymentReportsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState('All');
  const [selectedJunior, setSelectedJunior] = useState('All');

  // Stats
  const [totalAmount, setTotalAmount] = useState(0);
  const [todayAmount, setTodayAmount] = useState(0);
  const [modeBreakdown, setModeBreakdown] = useState({});
  const [juniorBreakdown, setJuniorBreakdown] = useState({});

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Duplicate clean loading
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  const fetchPayments = async () => {
    try {
      let url = `${API_BASE_URL}/api/payments?`;
      const queryParts = [];
      if (searchQuery.trim()) {
        queryParts.push(`q=${encodeURIComponent(searchQuery.trim())}`);
      }
      if (selectedMode !== 'All') {
        queryParts.push(`paymentMode=${encodeURIComponent(selectedMode)}`);
      }
      if (selectedJunior !== 'All') {
        queryParts.push(`enteredBy=${encodeURIComponent(selectedJunior)}`);
      }
      url += queryParts.join('&');

      const res = await fastFetch(url);
      const data = await res.json();

      if (res.ok && data.success) {
        setPayments(data.payments || []);
        setTotalAmount(data.totalAmount || 0);
        setTodayAmount(data.todayAmount || 0);
        setModeBreakdown(data.modeBreakdown || {});
        setJuniorBreakdown(data.juniorBreakdown || {});
      } else {
        setPayments([]);
      }
    } catch (e) {
      console.error('Error fetching payments:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPayments();
    }, [selectedMode, selectedJunior, searchQuery])
  );

  const handleCleanDuplicates = async () => {
    Alert.alert(
      'Clean Duplicate Records',
      'Scan database and remove any duplicate payment records and duplicate case entries?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Now',
          onPress: async () => {
            setCleaningDuplicates(true);
            try {
              const res = await fetch(`${API_BASE_URL}/api/payments/cleanup-duplicates`, {
                method: 'POST',
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert('Cleanup Done', data.message || 'Duplicate items removed successfully.');
                fetchPayments();
              } else {
                Alert.alert('Info', data.message || 'No duplicate records found.');
              }
            } catch (err) {
              Alert.alert('Error', 'Unable to execute cleanup right now.');
            } finally {
              setCleaningDuplicates(false);
            }
          },
        },
      ]
    );
  };

  const handleDeletePayment = (paymentItem) => {
    Alert.alert(
      'Delete Payment Record',
      `Are you sure you want to delete payment of ₹${(paymentItem.amountReceived || 0).toLocaleString('en-IN')} for Case ${paymentItem.caseNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/payments/${paymentItem._id}`, {
                method: 'DELETE',
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert('Deleted', 'Payment record removed.');
                fetchPayments();
              } else {
                Alert.alert('Error', data.message || 'Could not delete payment.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while deleting payment.');
            }
          },
        },
      ]
    );
  };

  const handleShareReceipt = async (item) => {
    try {
      const message = `🏛️ CHAMBER ADVOCATE RECEIPT\n--------------------------------\nReceipt No: ${item.receiptNumber || 'RCP-' + item._id.slice(-6)}\nDate: ${item.date}\nCase Number: ${item.caseNumber}\nClient Name: ${item.clientName || 'N/A'}\nCourt: ${item.courtName || 'District Court'}\nPurpose: ${item.purpose || item.remarks || 'Legal Fee'}\nAmount Received: ₹${Number(item.amountReceived).toLocaleString('en-IN')}\nPayment Mode: ${item.paymentMode || 'Cash'}\nReceived By (Junior): ${item.enteredBy || 'Junior'}\n--------------------------------\nStatus: Verified & Recorded`;
      await Share.share({ message });
    } catch (e) {}
  };

  const uniqueJuniors = ['All', ...Object.keys(juniorBreakdown)];
  const paymentModes = ['All', 'Cash', 'GPay / UPI', 'UPI', 'Bank Transfer', 'Cheque'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0B1120' : '#FFFFFF'} />

      {/* Top Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Amount History</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Junior entries, receipts & chamber collections
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPayments();
            }}
            colors={['#0D6E42']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Financial Overview Cards */}
        <View style={styles.kpiRow}>
          {/* Total Collections */}
          <View style={[styles.kpiCard, { backgroundColor: isDark ? '#064e3b' : '#ECFDF5', borderColor: isDark ? '#047857' : '#A7F3D0' }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiLabel, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                TOTAL COLLECTED
              </Text>
              <View style={[styles.kpiIconBox, { backgroundColor: isDark ? '#047857' : '#D1FAE5' }]}>
                <Ionicons name="wallet" size={16} color="#0D6E42" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: isDark ? '#FFFFFF' : '#065F46' }]}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.kpiFooter, { color: isDark ? '#6EE7B7' : '#047857' }]}>
              {payments.length} total receipts recorded
            </Text>
          </View>

          {/* Today's Collections */}
          <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                TODAY'S INFLOW
              </Text>
              <View style={[styles.kpiIconBox, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <Ionicons name="calendar" size={16} color={isDark ? '#60A5FA' : '#3B82F6'} />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              ₹{todayAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.kpiFooter, { color: colors.textSecondary }]}>
              Received today
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by client, case, purpose, junior..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Junior Filter Chips */}
        {uniqueJuniors.length > 2 && (
          <View style={styles.filterSection}>
            <Text style={[styles.filterHeading, { color: colors.textSecondary }]}>FILTER BY JUNIOR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {uniqueJuniors.map((jName) => (
                <TouchableOpacity
                  key={jName}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedJunior === jName ? '#0D6E42' : isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: selectedJunior === jName ? '#0D6E42' : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedJunior(jName)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selectedJunior === jName ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {jName === 'All' ? 'All Juniors' : `👨‍⚖️ ${jName}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Payment Mode Filter Chips */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterHeading, { color: colors.textSecondary }]}>PAYMENT MODE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {['All', 'Cash', 'GPay / UPI', 'Bank Transfer', 'Cheque'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedMode === mode ? '#0D6E42' : isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: selectedMode === mode ? '#0D6E42' : colors.border,
                  },
                ]}
                onPress={() => setSelectedMode(mode)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedMode === mode ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Payment Receipts List */}
        <View style={styles.listHeaderRow}>
          <Text style={[styles.listHeading, { color: colors.text }]}>
            Payment Entries ({payments.length})
          </Text>
          <TouchableOpacity onPress={handleCleanDuplicates} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Clean Duplicates</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0D6E42" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading payment entries...
            </Text>
          </View>
        ) : payments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payment Records</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              No fee payment records match your selected filters. When juniors enter amounts, full case & payment details will appear here.
            </Text>
          </View>
        ) : (
          payments.map((item, idx) => {
            const isCash = (item.paymentMode || '').toLowerCase().includes('cash');
            const isUPI = (item.paymentMode || '').toLowerCase().includes('upi') || (item.paymentMode || '').toLowerCase().includes('gpay');
            
            return (
              <TouchableOpacity
                key={item._id || idx}
                style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedReceipt(item);
                  setShowReceiptModal(true);
                }}
              >
                {/* Top Row: Amount + Mode Badge + Date */}
                <View style={styles.cardTopRow}>
                  <View>
                    <Text style={styles.amountText}>
                      ₹{(item.amountReceived || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.receiptNumberText, { color: colors.textSecondary }]}>
                      {item.receiptNumber || `RCP-${item._id.slice(-6).toUpperCase()}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View
                      style={[
                        styles.modeBadge,
                        {
                          backgroundColor: isCash ? '#DCFCE7' : isUPI ? '#E0E7FF' : '#FEF3C7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeBadgeText,
                          {
                            color: isCash ? '#166534' : isUPI ? '#3730A3' : '#92400E',
                          },
                        ]}
                      >
                        {item.paymentMode || 'Cash'}
                      </Text>
                    </View>
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                      📅 {item.date}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Case & Client Details */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CASE NUMBER</Text>
                    <Text style={[styles.detailValuePrimary, { color: '#0D6E42' }]}>
                      {item.caseNumber}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CLIENT NAME</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                      👤 {item.clientName || 'Client'}
                    </Text>
                  </View>
                </View>

                {/* Purpose / Why Amount Received */}
                <View style={[styles.purposeBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Ionicons name="document-text-outline" size={14} color="#0D6E42" style={{ marginRight: 5 }} />
                    <Text style={[styles.purposeLabel, { color: colors.textSecondary }]}>
                      Purpose of Payment / Reason:
                    </Text>
                  </View>
                  <Text style={[styles.purposeText, { color: colors.text }]}>
                    {item.purpose || item.remarks || 'Fee Received'}
                  </Text>
                  {item.remarks && item.remarks !== item.purpose && (
                    <Text style={[styles.remarksSubtext, { color: colors.textSecondary }]}>
                      Notes: {item.remarks}
                    </Text>
                  )}
                </View>

                {/* Bottom Row: Junior Collector Badge + Actions */}
                <View style={styles.cardBottomRow}>
                  <View style={styles.juniorBadge}>
                    <View style={styles.juniorAvatarCircle}>
                      <Text style={styles.juniorAvatarText}>
                        {((item.enteredBy || 'J').charAt(0)).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.collectedByLabel, { color: colors.textSecondary }]}>
                        Collected & Recorded by
                      </Text>
                      <Text style={[styles.juniorNameText, { color: colors.text }]}>
                        {item.enteredBy || 'Junior'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.smallIconBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                      onPress={() => handleShareReceipt(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="share-social-outline" size={16} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.smallIconBtn, { backgroundColor: isDark ? '#450a0a' : '#FEE2E2', marginLeft: 8 }]}
                      onPress={() => handleDeletePayment(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <Modal
          visible={showReceiptModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReceiptModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Receipt Header */}
              <View style={styles.receiptHeader}>
                <View style={styles.receiptLogoBox}>
                  <Text style={styles.receiptLogoText}>L</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.receiptChamberName, { color: colors.text }]}>
                    CHAMBER ADVOCATE LEDGER
                  </Text>
                  <Text style={[styles.receiptChamberSub, { color: colors.textSecondary }]}>
                    Official Fee Payment Voucher
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />

              {/* Amount Highlight */}
              <View style={styles.modalAmountBox}>
                <Text style={styles.modalAmountLabel}>AMOUNT RECEIVED</Text>
                <Text style={styles.modalAmountValue}>
                  ₹{Number(selectedReceipt.amountReceived).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.modalAmountMode}>
                  Paid via {selectedReceipt.paymentMode || 'Cash'} • {selectedReceipt.date}
                </Text>
              </View>

              {/* Details List */}
              <View style={styles.receiptDetailsList}>
                <View style={styles.receiptDetailRow}>
                  <Text style={[styles.receiptKey, { color: colors.textSecondary }]}>Receipt ID</Text>
                  <Text style={[styles.receiptVal, { color: colors.text }]}>
                    {selectedReceipt.receiptNumber || `RCP-${selectedReceipt._id.slice(-6).toUpperCase()}`}
                  </Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={[styles.receiptKey, { color: colors.textSecondary }]}>Case Number</Text>
                  <Text style={[styles.receiptVal, { color: '#0D6E42', fontWeight: '700' }]}>
                    {selectedReceipt.caseNumber}
                  </Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={[styles.receiptKey, { color: colors.textSecondary }]}>Client Name</Text>
                  <Text style={[styles.receiptVal, { color: colors.text }]}>
                    {selectedReceipt.clientName || 'Client'}
                  </Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={[styles.receiptKey, { color: colors.textSecondary }]}>Case Type</Text>
                  <Text style={[styles.receiptVal, { color: colors.text }]}>
                    {selectedReceipt.caseType || 'General Matter'}
                  </Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={[styles.receiptKey, { color: colors.textSecondary }]}>Purpose / Reason</Text>
                  <Text style={[styles.receiptVal, { color: colors.text }]}>
                    {selectedReceipt.purpose || selectedReceipt.remarks || 'Fee Payment'}
                  </Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={[styles.receiptKey, { color: colors.textSecondary }]}>Received By</Text>
                  <Text style={[styles.receiptVal, { color: colors.text }]}>
                    👨‍⚖️ {selectedReceipt.enteredBy || 'Junior'}
                  </Text>
                </View>
              </View>

              {/* Modal Action Buttons */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.shareModalBtn, { backgroundColor: '#0D6E42' }]}
                  onPress={() => handleShareReceipt(selectedReceipt)}
                >
                  <Ionicons name="share-social-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.shareModalBtnText}>Share Voucher</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.closeModalBtn, { borderColor: colors.border }]}
                  onPress={() => setShowReceiptModal(false)}
                >
                  <Text style={[styles.closeModalBtnText, { color: colors.text }]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 2 : 28) : 10,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  kpiFooter: {
    fontSize: 11,
    fontWeight: '500',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterHeading: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 2,
  },
  chipsRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  listHeading: {
    fontSize: 15,
    fontWeight: '800',
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  paymentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0D6E42',
    letterSpacing: -0.5,
  },
  receiptNumberText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  modeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValuePrimary: {
    fontSize: 14,
    fontWeight: '800',
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  purposeBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  purposeLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  purposeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  remarksSubtext: {
    fontSize: 11.5,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  juniorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  juniorAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0D6E42',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  juniorAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  collectedByLabel: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  juniorNameText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0D6E42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptLogoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  receiptChamberName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  receiptChamberSub: {
    fontSize: 11,
  },
  receiptDivider: {
    height: 1,
    marginVertical: 14,
  },
  modalAmountBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAmountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  modalAmountValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#065F46',
    marginVertical: 4,
  },
  modalAmountMode: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  receiptDetailsList: {
    gap: 10,
    marginBottom: 20,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptKey: {
    fontSize: 12.5,
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  closeModalBtn: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  closeModalBtnText: {
    fontWeight: '600',
    fontSize: 13.5,
  },
});
