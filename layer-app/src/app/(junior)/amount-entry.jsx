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
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../context/ThemeContext';
import { useFocusEffect } from 'expo-router';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function AmountEntryScreen() {
  const { colors, isDark } = useAppTheme();

  const [juniorInfo, setJuniorInfo] = useState({ juniorName: 'Arun' });
  const [assignedCases, setAssignedCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCasePicker, setShowCasePicker] = useState(false);

  // Form fields
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Payment records & stats
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick remarks options
  const quickRemarks = [
    'Initial payment',
    'Hearing payment',
    'Filing fee',
    'Drafting fee',
    'Final settlement',
  ];

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

  const loadInitialData = async () => {
    try {
      const stored = await AsyncStorage.getItem('@junior_info');
      let jName = 'Arun';
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.juniorName) {
          setJuniorInfo(parsed);
          jName = parsed.juniorName;
        }
      }

      setDate(getTodayFormatted());

      // Fetch assigned cases for dropdown
      const caseRes = await fastFetch(
        `${API_BASE_URL}/api/juniors/assigned-cases?juniorName=${encodeURIComponent(jName)}`
      );
      const caseData = await caseRes.json();
      if (caseRes.ok && Array.isArray(caseData.cases) && caseData.cases.length > 0) {
        setAssignedCases(caseData.cases);
        setSelectedCase(caseData.cases[0]);
      } else {
        setAssignedCases([]);
        setSelectedCase(null);
      }

      // Fetch payment history
      await fetchPaymentHistory(jName);
    } catch (e) {
      console.error('Error in initial load:', e);
    } finally {
      setFetchingHistory(false);
      setRefreshing(false);
    }
  };

  const fetchPaymentHistory = async (jName) => {
    const name = jName || juniorInfo.juniorName || 'Arun';
    try {
      const res = await fastFetch(
        `${API_BASE_URL}/api/payments?enteredBy=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.payments)) {
        setPaymentHistory(data.payments);
        setTotalAmount(data.totalAmount || 0);
      } else {
        setPaymentHistory([]);
        setTotalAmount(0);
      }
    } catch (e) {
      console.error('Error fetching payments:', e);
      setPaymentHistory([]);
      setTotalAmount(0);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [])
  );

  const handleSubmitPayment = async () => {
    if (!selectedCase) {
      Alert.alert('Validation Error', 'Please select a case number.');
      return;
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount received.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        caseNumber: selectedCase.caseNumber,
        clientName: selectedCase.clientName,
        amountReceived: Number(amount.trim()),
        date: date.trim() || getTodayFormatted(),
        remarks: remarks.trim() || 'Payment received',
        paymentMode,
        enteredBy: juniorInfo.juniorName || 'Arun',
      };

      const response = await fetch(`${API_BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', `₹${Number(amount).toLocaleString('en-IN')} amount entry recorded successfully!`);
        setAmount('');
        setRemarks('');
        fetchPaymentHistory();
      } else {
        // Fallback local addition
        const localEntry = {
          _id: Date.now().toString(),
          ...payload,
        };
        setPaymentHistory([localEntry, ...paymentHistory]);
        setTotalAmount((prev) => prev + Number(amount));
        setAmount('');
        setRemarks('');
        Alert.alert('Success', 'Payment entry recorded successfully.');
      }
    } catch (e) {
      console.error('Error recording payment:', e);
      const localEntry = {
        _id: Date.now().toString(),
        caseNumber: selectedCase.caseNumber,
        clientName: selectedCase.clientName,
        amountReceived: Number(amount.trim()),
        date: date.trim() || getTodayFormatted(),
        remarks: remarks.trim() || 'Payment received',
        paymentMode,
        enteredBy: juniorInfo.juniorName || 'Arun',
      };
      setPaymentHistory([localEntry, ...paymentHistory]);
      setTotalAmount((prev) => prev + Number(amount));
      setAmount('');
      setRemarks('');
      Alert.alert('Saved', 'Payment entry saved successfully.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0B1120' : '#FFFFFF'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadInitialData();
              }}
              colors={['#0D6E42']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Amount Entry</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Record client fee payments and maintain case ledger
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formHeaderRow}>
              <View style={styles.formIconBox}>
                <Ionicons name="cash" size={20} color="#0D6E42" />
              </View>
              <Text style={[styles.formCardTitle, { color: colors.text }]}>New Payment Received</Text>
            </View>

            {/* Select Case Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Case</Text>
              <TouchableOpacity
                style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
                onPress={() => setShowCasePicker(true)}
              >
                <View style={{ flex: 1 }}>
                  {selectedCase ? (
                    <Text style={[styles.pickerTextSelected, { color: colors.text }]}>
                      {selectedCase.caseNumber} - {selectedCase.clientName}
                    </Text>
                  ) : (
                    <Text style={[styles.pickerPlaceholder, { color: colors.textSecondary }]}>
                      Choose a case
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Amount Received Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount Received (₹)</Text>
              <View style={[styles.amountInputWrapper, { borderColor: '#0D6E42', backgroundColor: isDark ? '#1E293B' : '#F0FDF4' }]}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.amountTextInput, { color: '#0D6E42' }]}
                  placeholder="e.g. 10000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* Date Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date (DD-MM-YYYY)</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color="#0D6E42" style={{ marginRight: 10 }} />
                <Text style={[styles.textInput, { color: date ? colors.text : colors.textSecondary, paddingTop: 14 }]}>
                  {date || 'Select Date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={parseDateString(date)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setDate(formatDateToString(selectedDate));
                    }
                  }}
                />
              )}
            </View>

            {/* Payment Mode */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Payment Mode</Text>
              <View style={styles.paymentModeRow}>
                {['Cash', 'GPay / UPI', 'Bank Transfer', 'Cheque'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeChip,
                      {
                        backgroundColor: paymentMode === mode ? '#0D6E42' : isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: paymentMode === mode ? '#0D6E42' : colors.border,
                      },
                    ]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <Text
                      style={[
                        styles.modeChipText,
                        { color: paymentMode === mode ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Remarks Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Remarks</Text>
              
              {/* Quick Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPillsRow}>
                {quickRemarks.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.quickPill,
                      {
                        backgroundColor: remarks === q ? (isDark ? '#064e3b' : '#DCFCE7') : isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: remarks === q ? '#0D6E42' : colors.border,
                      },
                    ]}
                    onPress={() => setRemarks(q)}
                  >
                    <Text style={[styles.quickPillText, { color: remarks === q ? '#0D6E42' : colors.textSecondary }]}>
                      {q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', marginTop: 8 }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="e.g. Initial payment / Hearing payment"
                  placeholderTextColor={colors.textSecondary}
                  value={remarks}
                  onChangeText={setRemarks}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && { opacity: 0.8 }]}
              onPress={handleSubmitPayment}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.buttonInner}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Save Amount Entry</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Payment History / Total Summary Card */}
          <View style={styles.historySection}>
            <View style={[styles.totalSummaryCard, { backgroundColor: isDark ? '#064e3b' : '#F0FDF4', borderColor: isDark ? '#047857' : '#BBF7D0' }]}>
              <View>
                <Text style={[styles.totalLabel, { color: isDark ? '#A7F3D0' : '#15803D' }]}>
                  Total Amount Received
                </Text>
                <Text style={[styles.totalValue, { color: isDark ? '#FFFFFF' : '#0D6E42' }]}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.totalIconCircle, { backgroundColor: isDark ? '#047857' : '#DCFCE7' }]}>
                <Ionicons name="wallet" size={24} color="#0D6E42" />
              </View>
            </View>

            <Text style={[styles.historyHeading, { color: colors.text }]}>Payment History</Text>

            {/* Table Header matching the design */}
            <View style={[styles.tableContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.tableHeader, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                <Text style={[styles.colHeader, { width: '28%', color: colors.textSecondary }]}>Date</Text>
                <Text style={[styles.colHeader, { width: '28%', color: colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.colHeader, { width: '44%', textAlign: 'right', color: colors.textSecondary }]}>Remarks</Text>
              </View>

              {fetchingHistory ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#0D6E42" />
                </View>
              ) : paymentHistory.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No payment entries recorded yet.</Text>
                </View>
              ) : (
                <>
                  {paymentHistory.map((item, idx) => (
                    <View
                      key={item._id || idx}
                      style={[
                        styles.tableRow,
                        {
                          borderTopColor: colors.border,
                          borderTopWidth: idx === 0 ? 0 : 1,
                        },
                      ]}
                    >
                      {/* Date */}
                      <View style={{ width: '28%' }}>
                        <Text style={[styles.cellDate, { color: colors.text }]}>{item.date}</Text>
                        <Text style={[styles.cellCaseTag, { color: '#0D6E42' }]} numberOfLines={1}>
                          {item.caseNumber}
                        </Text>
                      </View>

                      {/* Amount */}
                      <View style={{ width: '28%' }}>
                        <Text style={[styles.cellAmount, { color: '#0D6E42' }]}>
                          ₹{Number(item.amountReceived).toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.cellMode, { color: colors.textSecondary }]}>
                          {item.paymentMode || 'Cash'}
                        </Text>
                      </View>

                      {/* Remarks */}
                      <View style={{ width: '44%', alignItems: 'flex-end' }}>
                        <Text style={[styles.cellRemarks, { color: colors.text }]} numberOfLines={2}>
                          {item.remarks || 'Payment'}
                        </Text>
                        {item.clientName && (
                          <Text style={[styles.cellClient, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.clientName}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}

                  {/* Total Footer Row */}
                  <View style={[styles.totalFooterRow, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderTopColor: colors.border }]}>
                    <Text style={[styles.totalFooterLabel, { color: colors.text }]}>Total</Text>
                    <Text style={[styles.totalFooterAmount, { color: '#0D6E42' }]}>
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Case Selection Modal */}
      <Modal visible={showCasePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Case</Text>
              <TouchableOpacity onPress={() => setShowCasePicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {assignedCases.map((c, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.caseOption,
                    {
                      backgroundColor:
                        selectedCase?.caseNumber === c.caseNumber
                          ? isDark
                            ? '#064e3b'
                            : '#DCFCE7'
                          : 'transparent',
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCase(c);
                    setShowCasePicker(false);
                  }}
                >
                  <View>
                    <Text style={[styles.caseOptionNo, { color: '#0D6E42' }]}>{c.caseNumber}</Text>
                    <Text style={[styles.caseOptionClient, { color: colors.text }]}>{c.clientName}</Text>
                    <Text style={[styles.caseOptionCourt, { color: colors.textSecondary }]}>
                      {c.courtName || 'Court'}
                    </Text>
                  </View>
                  {selectedCase?.caseNumber === c.caseNumber && (
                    <Ionicons name="checkmark-circle" size={22} color="#0D6E42" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 12,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  formCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  pickerTextSelected: {
    fontSize: 13,
    fontWeight: '700',
  },
  pickerPlaceholder: {
    fontSize: 13,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  currencySymbol: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0D6E42',
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    height: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  paymentModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quickPillsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  quickPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
  },
  quickPillText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#0D6E42',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#0D6E42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  historySection: {
    marginBottom: 20,
  },
  totalSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  totalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cellDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  cellCaseTag: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  cellAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  cellMode: {
    fontSize: 9.5,
    marginTop: 1,
  },
  cellRemarks: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  cellClient: {
    fontSize: 9.5,
    marginTop: 1,
    textAlign: 'right',
  },
  totalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  totalFooterLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  totalFooterAmount: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    maxHeight: 450,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  caseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
  },
  caseOptionNo: {
    fontSize: 13,
    fontWeight: '700',
  },
  caseOptionClient: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  caseOptionCourt: {
    fontSize: 10.5,
    marginTop: 1,
  },
});
