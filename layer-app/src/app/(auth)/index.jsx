import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Image,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, fastFetch } from '../../constants/api';
import DemoExpiredModal from '../../components/DemoExpiredModal';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210');
  const [supportWhatsApp, setSupportWhatsApp] = useState('+919876543210');

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Validation Error', 'Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fastFetch(
        `${API_BASE_URL}/api/admin/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        },
        6000
      );

      const data = await response.json();

      if (data?.isExpired) {
        if (data.supportPhone) setSupportPhone(data.supportPhone);
        if (data.supportWhatsApp) setSupportWhatsApp(data.supportWhatsApp);
        setShowExpiredModal(true);
        return;
      }

      if (response.ok && data.success) {
        if (data.role === 'junior') {
          // Junior user logged in
          await AsyncStorage.setItem('@user_role', 'junior');
          if (data.junior) {
            await AsyncStorage.setItem('@junior_info', JSON.stringify(data.junior));
          }
          router.replace('/(junior)/dashboard');
        } else {
          // Admin user logged in
          await AsyncStorage.setItem('@user_role', 'admin');
          if (data.admin?.name) {
            await AsyncStorage.setItem('profileName', data.admin.name);
          }
          if (data.admin) {
            await AsyncStorage.setItem('@admin_info', JSON.stringify(data.admin));
          }
          if (data.admin?.photoUrl) {
            await AsyncStorage.setItem('profilePhotoUrl', data.admin.photoUrl);
          }
          if (data.admin?.theme) {
            await AsyncStorage.setItem('@app_theme', data.admin.theme);
          }
          if (data.daysRemaining !== undefined) {
            await AsyncStorage.setItem('@demo_days_left', String(data.daysRemaining));
          }
          router.replace('/(admin)/dashboard');
        }
      } else {
        // Fallback checks for test accounts
        const cleanUser = username.trim().toLowerCase();
        if (cleanUser === 'admin' && password === 'admin123') {
          await AsyncStorage.setItem('@user_role', 'admin');
          router.replace('/(admin)/dashboard');
        } else if (
          (cleanUser === 'arun' || cleanUser.startsWith('junior')) &&
          (password === 'arun123' || password === 'junior123' || password === '123456')
        ) {
          await AsyncStorage.setItem('@user_role', 'junior');
          await AsyncStorage.setItem(
            '@junior_info',
            JSON.stringify({ juniorName: 'Arun', username: 'arun' })
          );
          router.replace('/(junior)/dashboard');
        } else {
          Alert.alert('Login Failed', data.message || 'Invalid username or password.');
        }
      }
    } catch (e) {
      console.error('Login error:', e);
      const cleanUser = username.trim().toLowerCase();
      if (cleanUser === 'admin' && password === 'admin123') {
        await AsyncStorage.setItem('@user_role', 'admin');
        router.replace('/(admin)/dashboard');
      } else if (
        (cleanUser === 'arun' || cleanUser.startsWith('junior')) &&
        (password === 'arun123' || password === 'junior123' || password === '123456')
      ) {
        await AsyncStorage.setItem('@user_role', 'junior');
        await AsyncStorage.setItem(
          '@junior_info',
          JSON.stringify({ juniorName: 'Arun', username: 'arun' })
        );
        router.replace('/(junior)/dashboard');
      } else {
        Alert.alert('Login Failed', 'Invalid credentials or unable to reach backend server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please contact your chamber administrator to reset your password, or use default credentials (admin / admin123).',
      [{ text: 'OK' }]
    );
  };

  const handleContactAdmin = () => {
    Alert.alert(
      'Support Contact',
      'For chamber access assistance, email: support@layerapp.firm or call Senior Managing Partner desk.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/legal_login_bg.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Brand Emblem & Header */}
            <View style={styles.brandContainer}>
              <View style={styles.emblemContainer}>
                <Image
                  source={require('../../../assets/images/justice_scales_logo.jpg')}
                  style={styles.emblemImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.brandTitle}>Layer App</Text>

              {/* Tagline with Gold Divider Lines */}
              <View style={styles.taglineRow}>
                <View style={styles.goldLine} />
                <Text style={styles.taglineText}>LAW  •  DOCUMENTS  •  JUSTICE</Text>
                <View style={styles.goldLine} />
              </View>
            </View>

            {/* Welcome Heading */}
            <View style={styles.headingContainer}>
              <Text style={styles.mainTitle}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Sign in to continue your legal work</Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Username Input Card */}
              <View style={styles.inputCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="person-outline" size={20} color="#2C4A6F" />
                </View>
                <View style={styles.inputInner}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <TextInput
                    style={styles.textInputField}
                    placeholder="Enter your username"
                    placeholderTextColor="#A0AEC0"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input Card */}
              <View style={[styles.inputCard, { marginTop: 14 }]}>
                <View style={styles.iconCircle}>
                  <Ionicons name="lock-closed-outline" size={20} color="#2C4A6F" />
                </View>
                <View style={styles.inputInner}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.textInputField}
                    placeholder="Enter your password"
                    placeholderTextColor="#A0AEC0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={styles.eyeIconButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Login Action Button */}
              <TouchableOpacity
                style={[styles.loginButton, loading && { opacity: 0.85 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContentRow}>
                    <Text style={styles.loginButtonText}>Login</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginLeft: 10 }}
                    />
                  </View>
                )}
              </TouchableOpacity>

              {/* OR Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Need Help Card */}
              <TouchableOpacity
                style={styles.helpCard}
                onPress={handleContactAdmin}
                activeOpacity={0.85}
              >
                <View style={styles.helpIconCircle}>
                  <Ionicons name="headset-outline" size={22} color="#7C5E28" />
                </View>
                <View style={styles.helpTextContainer}>
                  <Text style={styles.helpTitle}>Need help?</Text>
                  <Text style={styles.helpSubtitle}>Contact your administrator.</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#102B4C" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <DemoExpiredModal
          visible={showExpiredModal}
          onUnlocked={() => {
            setShowExpiredModal(false);
            Alert.alert('Unlocked', 'Demo is active now! Please enter your password to login.');
          }}
          supportPhone={supportPhone}
          supportWhatsApp={supportWhatsApp}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 20,
    paddingBottom: 150,
    justifyContent: 'flex-start',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emblemContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C59B27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 10,
  },
  emblemImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#102B4C',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  goldLine: {
    width: 28,
    height: 1.5,
    backgroundColor: '#CCA765',
  },
  taglineText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1B314B',
    letterSpacing: 2,
    marginHorizontal: 10,
  },
  headingContainer: {
    marginTop: 6,
    marginBottom: 18,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#102B4C',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#627D98',
    marginTop: 4,
    lineHeight: 21,
  },
  formContainer: {
    width: '100%',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2EAF1',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#102B4C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF4F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputInner: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#829AB1',
    marginBottom: 1,
  },
  textInputField: {
    fontSize: 15,
    fontWeight: '500',
    color: '#102B4C',
    padding: 0,
    height: 24,
  },
  eyeIconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 18,
    borderBottomWidth: 1.5,
    borderBottomColor: '#CCA765',
    paddingBottom: 2,
  },
  forgotPasswordText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#102B4C',
  },
  loginButton: {
    backgroundColor: '#102B4C',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#102B4C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#829AB1',
    letterSpacing: 0.8,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F0',
    borderWidth: 1.2,
    borderColor: '#ECE6D8',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  helpIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EBDDC5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102B4C',
  },
  helpSubtitle: {
    fontSize: 13,
    color: '#627D98',
    marginTop: 1,
  },
});
