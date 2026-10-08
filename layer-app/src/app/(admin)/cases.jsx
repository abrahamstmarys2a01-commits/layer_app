import { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../context/ThemeContext';
import { API_BASE_URL, fastFetch } from '../../constants/api';

export default function CasesScreen() {
  const { colors, isDark } = useAppTheme();

  const [formData, setFormData] = useState({
    caseNumber: '',
    clientName: '',
    clientMobile: '',
    caseType: '',
    courtName: '',
    caseDescription: '',
    filedDate: '',
    nextHearing: '',
    status: 'Active',
    priority: 'Normal',
    assignedJunior: '',
    documents: [],
  });

  const [juniors, setJuniors] = useState([]);
  const [loadingJuniors, setLoadingJuniors] = useState(false);
  const [showJuniorPicker, setShowJuniorPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Case Type Dropdown state
  const [showCaseTypePicker, setShowCaseTypePicker] = useState(false);
  const [caseTypeSearch, setCaseTypeSearch] = useState('');

  // Court Name Dropdown state
  const [showCourtPicker, setShowCourtPicker] = useState(false);
  const [courtSearch, setCourtSearch] = useState('');

  // Date Pickers state
  const [showFiledDatePicker, setShowFiledDatePicker] = useState(false);
  const [showNextHearingDatePicker, setShowNextHearingDatePicker] = useState(false);

  // Status Dropdown state & options
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusOptions = [
    { label: 'Active', value: 'Active', description: 'Currently active case in proceedings', color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle' },
    { label: 'Inactive', value: 'Inactive', description: 'Case temporarily suspended or on hold', color: '#DC2626', bg: '#FEE2E2', icon: 'pause-circle' },
    { label: 'Pending', value: 'Pending', description: 'Awaiting court listing or initial hearing', color: '#D97706', bg: '#FEF3C7', icon: 'time' },
    { label: 'Closed', value: 'Closed', description: 'Case completed and archived', color: '#64748B', bg: '#F1F5F9', icon: 'archive' },
  ];

  // Priority Dropdown state & options
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const priorityOptions = [
    { label: 'Normal Priority', value: 'Normal', description: 'Standard court hearing schedule', color: '#2563EB', bg: '#DBEAFE', icon: 'flag' },
    { label: 'High Priority', value: 'High', description: 'Important or time-sensitive matter', color: '#EA580C', bg: '#FFEDD5', icon: 'flame' },
    { label: 'Urgent', value: 'Urgent', description: 'Immediate injunction, bail, or critical matter', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' },
    { label: 'Low Priority', value: 'Low', description: 'Routine or delayed proceedings', color: '#64748B', bg: '#F1F5F9', icon: 'arrow-down-circle' },
  ];

  // Preset options for Case Type
  const caseTypeOptions = [
    'Civil Suit (O.S. / Original Suit)',
    'Criminal (C.C. / Crl.O.P. / Bail)',
    'Writ Petition (W.P. - High Court)',
    'Family & Matrimonial (H.M.O.P.)',
    'Motor Accident Claims (M.A.C.T.)',
    'Cheque Bounce (Sec 138 N.I. Act)',
    'Property & Title Dispute',
    'Injunction & Partition Suit',
    'Commercial & Corporate Matter',
    'Arbitration & Conciliation',
    'Labour & Industrial Dispute',
    'Consumer Dispute / Forum',
    'Revenue & Patta Dispute',
    'Execution Petition (E.P.)',
    'Appeal (A.S. / C.M.A. / Crl.A)',
    'Other / Special Matter',
  ];

  // Preset options for Court Name
  const courtOptions = [
    'Supreme Court of India, New Delhi',
    'Madras High Court - Principal Seat, Chennai',
    'Madras High Court - Madurai Bench',
    'Trichy District & Sessions Court',
    'Madurai District & Sessions Court',
    'Chennai City Civil & Sessions Court',
    'Coimbatore Combined Court Complex',
    'Salem District & Sessions Court',
    'Tirunelveli District Court Complex',
    'Thanjavur District Court',
    'Dindigul Combined Court Complex',
    'Karur Combined Court Complex',
    'Pudukkottai District Court',
    'Chief Judicial Magistrate Court (CJM)',
    'Judicial Magistrate Court (JM)',
    'Sub Court / Senior Civil Judge',
    'District Munsif Court',
    'Family Court Complex',
    'National Company Law Tribunal (NCLT)',
    'Debt Recovery Tribunal (DRT)',
    'Consumer Disputes Redressal Forum',
    'Other / Custom Court',
  ];

  // Custom document input modal state
  const [showCustomDocModal, setShowCustomDocModal] = useState(false);
  const [customDocName, setCustomDocName] = useState('');

  // Common preset documents list
  const presetDocuments = [
    { name: 'FIR.pdf', type: 'application/pdf', size: '1.4 MB' },
    { name: 'Agreement.pdf', type: 'application/pdf', size: '2.1 MB' },
    { name: 'Aadhaar.pdf', type: 'application/pdf', size: '0.8 MB' },
    { name: 'Court_Order.pdf', type: 'application/pdf', size: '3.2 MB' },
    { name: 'Vakalatnama.pdf', type: 'application/pdf', size: '1.1 MB' },
    { name: 'Petition.pdf', type: 'application/pdf', size: '2.6 MB' },
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

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(isDark ? '#0B1120' : '#FFFFFF');
        StatusBar.setTranslucent(false);
      }

      const fetchJuniors = async () => {
        setLoadingJuniors(true);
        try {
          const response = await fastFetch(`${API_BASE_URL}/api/juniors`);
          const data = await response.json();
          if (Array.isArray(data)) {
            const seen = new Set();
            const unique = [];
            for (const j of data) {
              const key = (j.juniorName || j.username || j._id || '').trim();
              if (key && !seen.has(key)) {
                seen.add(key);
                unique.push(j);
              }
            }
            setJuniors(unique);
          } else {
            setJuniors([]);
          }
        } catch (error) {
          console.error('Error fetching juniors in cases:', error);
          setJuniors([]);
        } finally {
          setLoadingJuniors(false);
        }
      };
      fetchJuniors();
    }, [isDark])
  );

  // Toggle or add preset document
  const togglePresetDocument = (preset) => {
    const existingIndex = formData.documents.findIndex((d) => d.name === preset.name);
    if (existingIndex > -1) {
      // Remove document
      const updated = [...formData.documents];
      updated.splice(existingIndex, 1);
      setFormData({ ...formData, documents: updated });
    } else {
      // Add document
      const newDoc = {
        name: preset.name,
        type: preset.type,
        size: preset.size,
        uploadedAt: getTodayFormatted(),
        uri: '',
      };
      setFormData({ ...formData, documents: [...formData.documents, newDoc] });
    }
  };

  // Pick file from device storage
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const sizeInMb = file.size ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : '1.5 MB';
        const newDoc = {
          name: file.name || 'Uploaded_Document.pdf',
          uri: file.uri,
          type: file.mimeType || 'application/pdf',
          size: sizeInMb,
          uploadedAt: getTodayFormatted(),
        };

        setFormData({
          ...formData,
          documents: [...formData.documents, newDoc],
        });
        Alert.alert('Document Attached', `"${newDoc.name}" has been attached to this case.`);
      }
    } catch (e) {
      console.error('Error picking document:', e);
      setShowCustomDocModal(true);
    }
  };

  // Add custom named document
  const handleAddCustomDoc = () => {
    if (!customDocName.trim()) {
      Alert.alert('Validation Error', 'Please enter a document name.');
      return;
    }
    let formattedName = customDocName.trim();
    if (!formattedName.toLowerCase().endsWith('.pdf') && !formattedName.toLowerCase().endsWith('.jpg')) {
      formattedName += '.pdf';
    }

    const newDoc = {
      name: formattedName,
      type: 'application/pdf',
      size: '1.2 MB',
      uploadedAt: getTodayFormatted(),
      uri: '',
    };

    setFormData({
      ...formData,
      documents: [...formData.documents, newDoc],
    });
    setCustomDocName('');
    setShowCustomDocModal(false);
  };

  const handleRemoveDocument = (indexToRemove) => {
    const updated = formData.documents.filter((_, idx) => idx !== indexToRemove);
    setFormData({ ...formData, documents: updated });
  };

  const handleSave = async () => {
    if (!formData.caseNumber.trim() || !formData.clientName.trim()) {
      Alert.alert('Validation Error', 'Please fill in Case Number and Client Name.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const savedCase = await response.json();
        console.log('Successfully saved to backend:', savedCase);
        Alert.alert(
          'Case Registered!',
          `Case "${formData.caseNumber}" along with ${formData.documents.length} attached documents saved successfully.`,
          [{ text: 'OK' }]
        );
        // Reset form
        setFormData({
          caseNumber: '',
          clientName: '',
          clientMobile: '',
          caseType: '',
          courtName: '',
          caseDescription: '',
          filedDate: '',
          nextHearing: '',
          status: 'Active',
          priority: 'Normal',
          assignedJunior: '',
          documents: [],
        });
      } else {
        const errorData = await response.json();
        Alert.alert('Registration Failed', errorData.message || 'Unknown error occurred.');
      }
    } catch (error) {
      console.error('Error saving case:', error);
      Alert.alert('Network Error', 'Could not reach backend server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0B1120' : '#FFFFFF'} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Case Registration</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Add a new matter, attach case documents & allocate to a junior associate.
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Section 1: Basic Case Details */}
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Case Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Case Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text }]}
              placeholder="e.g. CSE-2026-001"
              placeholderTextColor="#94A3B8"
              value={formData.caseNumber}
              onChangeText={(t) => setFormData({ ...formData, caseNumber: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Client Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text }]}
              placeholder="e.g. Raj Kumar"
              placeholderTextColor="#94A3B8"
              value={formData.clientName}
              onChangeText={(t) => setFormData({ ...formData, clientName: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Client Mobile</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text }]}
              placeholder="+91 98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={formData.clientMobile}
              onChangeText={(t) => setFormData({ ...formData, clientMobile: t })}
            />
          </View>

          {/* Case Type Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Case Type</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}
              onPress={() => {
                setCaseTypeSearch('');
                setShowCaseTypePicker(true);
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="scale-outline" size={17} color="#D97706" style={{ marginRight: 8 }} />
                <Text
                  style={[
                    styles.pickerButtonText,
                    { color: formData.caseType ? colors.text : '#94A3B8', fontWeight: formData.caseType ? '600' : '400' },
                  ]}
                  numberOfLines={1}
                >
                  {formData.caseType || 'Select Case Type...'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Court Name Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Court Name</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}
              onPress={() => {
                setCourtSearch('');
                setShowCourtPicker(true);
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="business-outline" size={17} color="#2563EB" style={{ marginRight: 8 }} />
                <Text
                  style={[
                    styles.pickerButtonText,
                    { color: formData.courtName ? colors.text : '#94A3B8', fontWeight: formData.courtName ? '600' : '400' },
                  ]}
                  numberOfLines={1}
                >
                  {formData.courtName || 'Select Court Name...'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Case Description</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text },
              ]}
              placeholder="Brief details about the legal proceedings, parties involved..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={formData.caseDescription}
              onChangeText={(t) => setFormData({ ...formData, caseDescription: t })}
            />
          </View>

          <View style={styles.rowGroup}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Filed Date</Text>
              <TouchableOpacity
                style={[styles.inputWithIcon, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}
                onPress={() => setShowFiledDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={16} color="#0D6E42" style={styles.inputIcon} />
                <Text style={[styles.inputInline, { color: formData.filedDate ? colors.text : '#94A3B8', paddingTop: 14 }]}>
                  {formData.filedDate || 'Select Date'}
                </Text>
              </TouchableOpacity>
              {showFiledDatePicker && (
                <DateTimePicker
                  value={parseDateString(formData.filedDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowFiledDatePicker(false);
                    if (selectedDate) {
                      setFormData({ ...formData, filedDate: formatDateToString(selectedDate) });
                    }
                  }}
                />
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Next Hearing</Text>
              <TouchableOpacity
                style={[styles.inputWithIcon, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}
                onPress={() => setShowNextHearingDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color="#2563EB" style={styles.inputIcon} />
                <Text style={[styles.inputInline, { color: formData.nextHearing ? colors.text : '#94A3B8', paddingTop: 14 }]}>
                  {formData.nextHearing || 'Select Date'}
                </Text>
              </TouchableOpacity>
              {showNextHearingDatePicker && (
                <DateTimePicker
                  value={parseDateString(formData.nextHearing)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowNextHearingDatePicker(false);
                    if (selectedDate) {
                      setFormData({ ...formData, nextHearing: formatDateToString(selectedDate) });
                    }
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.rowGroup}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Case Status</Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}
                onPress={() => setShowStatusPicker(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor:
                        formData.status === 'Active'
                          ? '#16A34A'
                          : formData.status === 'Inactive'
                          ? '#DC2626'
                          : formData.status === 'Pending'
                          ? '#D97706'
                          : '#64748B',
                      marginRight: 7,
                    }}
                  />
                  <Text
                    style={[
                      styles.pickerButtonText,
                      { color: colors.text, fontWeight: '600', fontSize: 13 },
                    ]}
                    numberOfLines={1}
                  >
                    {formData.status || 'Active'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Priority</Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}
                onPress={() => setShowPriorityPicker(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons
                    name={
                      formData.priority === 'Urgent'
                        ? 'alert-circle'
                        : formData.priority === 'High'
                        ? 'flame'
                        : formData.priority === 'Low'
                        ? 'arrow-down-circle'
                        : 'flag'
                    }
                    size={14}
                    color={
                      formData.priority === 'Urgent'
                        ? '#DC2626'
                        : formData.priority === 'High'
                        ? '#EA580C'
                        : formData.priority === 'Low'
                        ? '#64748B'
                        : '#2563EB'
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.pickerButtonText,
                      { color: colors.text, fontWeight: '600', fontSize: 13 },
                    ]}
                    numberOfLines={1}
                  >
                    {formData.priority || 'Normal'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2: Case Documents Upload */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.sectionHeader}>
            <Ionicons name="folder-open-outline" size={20} color="#0D6E42" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Documents Attachment</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Attach case-related files or tap presets below to include them.
          </Text>

          {/* Preset Document Chips */}
          <View style={styles.presetChipsContainer}>
            {presetDocuments.map((doc) => {
              const isSelected = formData.documents.some((d) => d.name === doc.name);
              return (
                <TouchableOpacity
                  key={doc.name}
                  style={[
                    styles.presetDocChip,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? '#064e3b' : '#DCFCE7')
                        : (isDark ? '#1E293B' : '#F1F5F9'),
                      borderColor: isSelected ? '#0D6E42' : colors.border,
                    },
                  ]}
                  onPress={() => togglePresetDocument(doc)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetDocEmoji}>📄</Text>
                  <Text
                    style={[
                      styles.presetDocName,
                      { color: isSelected ? '#0D6E42' : colors.text },
                    ]}
                  >
                    {doc.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#0D6E42" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Upload Button */}
          <View style={styles.uploadActionsRow}>
            <TouchableOpacity
              style={[styles.uploadDocButton, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: '#0D6E42' }]}
              onPress={handlePickDocument}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#0D6E42" style={{ marginRight: 6 }} />
              <Text style={styles.uploadDocButtonText}>Upload PDF / File</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addCustomDocBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => setShowCustomDocModal(true)}
            >
              <Ionicons name="add" size={18} color={colors.text} style={{ marginRight: 4 }} />
              <Text style={[styles.addCustomDocText, { color: colors.text }]}>Custom Doc</Text>
            </TouchableOpacity>
          </View>

          {/* Attached Documents List */}
          {formData.documents.length > 0 && (
            <View style={styles.attachedDocsSection}>
              <Text style={[styles.attachedDocsHeading, { color: colors.text }]}>
                Attached Documents ({formData.documents.length})
              </Text>
              {formData.documents.map((doc, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.attachedDocCard,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border },
                  ]}
                >
                  <View style={styles.docIconBox}>
                    <Ionicons name="document-text" size={20} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.attachedDocTitle, { color: colors.text }]} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={[styles.attachedDocMeta, { color: colors.textSecondary }]}>
                      {doc.size || '1.2 MB'} • {doc.uploadedAt || getTodayFormatted()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeDocBtn}
                    onPress={() => handleRemoveDocument(idx)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Section 3: Case Allocation */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={20} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Case Allocation</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Assign Junior Associate</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}
              onPress={() => setShowJuniorPicker(true)}
            >
              <Text style={[styles.pickerButtonText, { color: formData.assignedJunior ? colors.text : '#94A3B8' }]}>
                {formData.assignedJunior || 'Select Junior...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: '#0D6E42', opacity: saving ? 0.8 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Register Case & Allocate</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Junior Picker Modal */}
      <Modal visible={showJuniorPicker} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Junior</Text>
              <TouchableOpacity onPress={() => setShowJuniorPicker(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingJuniors ? (
              <ActivityIndicator size="small" color="#0D6E42" style={{ padding: 24 }} />
            ) : !Array.isArray(juniors) || juniors.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                  No registered juniors found. Please add a junior lawyer first.
                </Text>
              </View>
            ) : (
              <FlatList
                data={juniors}
                keyExtractor={(item, index) => item._id || item.juniorName || index.toString()}
                renderItem={({ item }) => {
                  const name = typeof item === 'string' ? item : item.juniorName;
                  const email = typeof item === 'object' ? item.email : null;
                  const isSelected = formData.assignedJunior === name;

                  return (
                    <TouchableOpacity
                      style={[styles.modalItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setFormData({ ...formData, assignedJunior: name });
                        setShowJuniorPicker(false);
                      }}
                    >
                      <View style={styles.modalItemLeft}>
                        <View style={styles.juniorAvatar}>
                          <Text style={styles.juniorAvatarText}>{name?.charAt(0) || 'J'}</Text>
                        </View>
                        <View style={{ marginLeft: 12 }}>
                          <Text style={[styles.modalItemText, { color: colors.text }]}>{name}</Text>
                          {email && <Text style={[styles.modalItemSubtext, { color: colors.textSecondary }]}>{email}</Text>}
                        </View>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#0D6E42" />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Case Type Dropdown Modal */}
      <Modal visible={showCaseTypePicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.dropdownModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="scale" size={18} color="#D97706" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, marginLeft: 10 }]}>Select Case Type</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCaseTypePicker(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search / Custom input */}
            <View style={[styles.searchBoxWrapper, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInputText, { color: colors.text }]}
                placeholder="Search or type custom case type..."
                placeholderTextColor="#94A3B8"
                value={caseTypeSearch}
                onChangeText={setCaseTypeSearch}
              />
              {caseTypeSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCaseTypeSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {/* Custom type quick-add button if searching something not in list */}
              {caseTypeSearch.trim().length > 0 &&
                !caseTypeOptions.some((o) => o.toLowerCase() === caseTypeSearch.trim().toLowerCase()) && (
                  <TouchableOpacity
                    style={[styles.customOptionRow, { backgroundColor: isDark ? '#064e3b' : '#DCFCE7', borderColor: '#16A34A' }]}
                    onPress={() => {
                      setFormData({ ...formData, caseType: caseTypeSearch.trim() });
                      setShowCaseTypePicker(false);
                    }}
                  >
                    <Ionicons name="add-circle" size={18} color="#16A34A" style={{ marginRight: 8 }} />
                    <Text style={[styles.customOptionText, { color: '#166534' }]}>
                      Use "{caseTypeSearch.trim()}" as Case Type
                    </Text>
                  </TouchableOpacity>
                )}

              {caseTypeOptions
                .filter((type) => type.toLowerCase().includes(caseTypeSearch.toLowerCase()))
                .map((type, idx) => {
                  const isSelected = formData.caseType === type;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dropdownItemRow,
                        { borderBottomColor: colors.border },
                        isSelected && { backgroundColor: isDark ? '#064e3b' : '#DCFCE7' },
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, caseType: type });
                        setShowCaseTypePicker(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownItemTitle,
                            { color: isSelected ? '#166534' : colors.text, fontWeight: isSelected ? '700' : '500' },
                          ]}
                        >
                          {type}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#0D6E42" />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Court Name Dropdown Modal */}
      <Modal visible={showCourtPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.dropdownModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="business" size={18} color="#2563EB" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, marginLeft: 10 }]}>Select Court Name</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCourtPicker(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search / Custom input */}
            <View style={[styles.searchBoxWrapper, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInputText, { color: colors.text }]}
                placeholder="Search court or type custom court..."
                placeholderTextColor="#94A3B8"
                value={courtSearch}
                onChangeText={setCourtSearch}
              />
              {courtSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCourtSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {/* Custom court quick-add button if searching something not in list */}
              {courtSearch.trim().length > 0 &&
                !courtOptions.some((o) => o.toLowerCase() === courtSearch.trim().toLowerCase()) && (
                  <TouchableOpacity
                    style={[styles.customOptionRow, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF', borderColor: '#2563EB' }]}
                    onPress={() => {
                      setFormData({ ...formData, courtName: courtSearch.trim() });
                      setShowCourtPicker(false);
                    }}
                  >
                    <Ionicons name="add-circle" size={18} color="#2563EB" style={{ marginRight: 8 }} />
                    <Text style={[styles.customOptionText, { color: '#1E40AF' }]}>
                      Use "{courtSearch.trim()}" as Court Name
                    </Text>
                  </TouchableOpacity>
                )}

              {courtOptions
                .filter((court) => court.toLowerCase().includes(courtSearch.toLowerCase()))
                .map((court, idx) => {
                  const isSelected = formData.courtName === court;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dropdownItemRow,
                        { borderBottomColor: colors.border },
                        isSelected && { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' },
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, courtName: court });
                        setShowCourtPicker(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownItemTitle,
                            { color: isSelected ? '#1E40AF' : colors.text, fontWeight: isSelected ? '700' : '500' },
                          ]}
                        >
                          {court}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#2563EB" />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Document Name Modal */}
      <Modal visible={showCustomDocModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Document Name</Text>
              <TouchableOpacity onPress={() => setShowCustomDocModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>Document Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.subCardBg, borderColor: colors.borderInput, color: colors.text }]}
                placeholder="e.g. Sale_Deed.pdf or Witness_Statement.pdf"
                placeholderTextColor="#94A3B8"
                value={customDocName}
                onChangeText={setCustomDocName}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: '#0D6E42', marginTop: 16 }]}
                onPress={handleAddCustomDoc}
              >
                <Text style={styles.submitButtonText}>Add to Case</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Case Status Dropdown Modal */}
      <Modal visible={showStatusPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.dropdownModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="pulse" size={18} color="#16A34A" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, marginLeft: 10 }]}>Select Case Status</Text>
              </View>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12 }}>
              {statusOptions.map((item, idx) => {
                const isSelected = (formData.status || 'Active') === item.value;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.selectionItemCard,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? '#064e3b' : item.bg)
                          : (isDark ? '#1E293B' : '#F8FAFC'),
                        borderColor: isSelected ? item.color : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, status: item.value });
                      setShowStatusPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusIconBadge, { backgroundColor: isSelected ? item.color : (isDark ? '#334155' : '#E2E8F0') }]}>
                      <Ionicons name={item.icon} size={16} color={isSelected ? '#FFFFFF' : item.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.selectionTitle, { color: isSelected ? (isDark ? '#FFFFFF' : item.color) : colors.text }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.selectionSubtext, { color: colors.textSecondary }]}>
                        {item.description}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={item.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Priority Dropdown Modal */}
      <Modal visible={showPriorityPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.dropdownModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: '#FFEDD5' }]}>
                  <Ionicons name="flame" size={18} color="#EA580C" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, marginLeft: 10 }]}>Select Case Priority</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPriorityPicker(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12 }}>
              {priorityOptions.map((item, idx) => {
                const isSelected = (formData.priority || 'Normal') === item.value;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.selectionItemCard,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? '#1E293B' : item.bg)
                          : (isDark ? '#1E293B' : '#F8FAFC'),
                        borderColor: isSelected ? item.color : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, priority: item.value });
                      setShowPriorityPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusIconBadge, { backgroundColor: isSelected ? item.color : (isDark ? '#334155' : '#E2E8F0') }]}>
                      <Ionicons name={item.icon} size={16} color={isSelected ? '#FFFFFF' : item.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.selectionTitle, { color: isSelected ? (isDark ? '#FFFFFF' : item.color) : colors.text }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.selectionSubtext, { color: colors.textSecondary }]}>
                        {item.description}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={item.color} />}
                  </TouchableOpacity>
                );
              })}
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 2 : 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
  },
  header: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  rowGroup: {
    flexDirection: 'row',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputInline: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  presetChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  presetDocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetDocEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  presetDocName: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  uploadActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  uploadDocButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  uploadDocButtonText: {
    color: '#0D6E42',
    fontSize: 13,
    fontWeight: '700',
  },
  addCustomDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  addCustomDocText: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachedDocsSection: {
    marginBottom: 14,
  },
  attachedDocsHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  attachedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  docIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedDocTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  attachedDocMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  removeDocBtn: {
    padding: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  pickerButtonText: {
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 50,
    marginTop: 10,
    shadowColor: '#0D6E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  juniorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  juniorAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D6E42',
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalItemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  dropdownModalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBoxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginVertical: 12,
  },
  searchInputText: {
    flex: 1,
    fontSize: 13.5,
    height: '100%',
  },
  customOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  customOptionText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  dropdownItemTitle: {
    fontSize: 13.5,
  },
  selectionItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  statusIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  selectionSubtext: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
});
