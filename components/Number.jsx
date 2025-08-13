import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { NETWORK } from './constants';

const { width, height } = Dimensions.get('window');

const PhoneAuthScreen = ({ navigation }) => {
    // States
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOTP] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState('phone'); // 'phone' or 'otp'
    const [serverOTP, setServerOTP] = useState('');
    const [timer, setTimer] = useState(0);

    // Refs and animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const otpInputRefs = useRef([]);

    // Initialize component
    useEffect(() => {
        startAnimations();
        checkExistingSession();
    }, []);

    // Timer effect
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    // Animations
    const startAnimations = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            })
        ]).start();
    };

    // Check if user already logged in
    const checkExistingSession = async () => {
        try {
            const existingUser = await AsyncStorage.getItem('userProfile');

            if (existingUser) {
                const userProfile = JSON.parse(existingUser);
                setTimeout(() => {
                    const screen = userProfile.userType === 'farmer' ? 'Home' : 'Vendor';
                    navigation.replace(screen, { userProfile });
                }, 1000);
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    };

    // Validate phone number
    const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);

    // Send OTP to phone
    const sendOTP = async () => {
        try {
            const response = await axios.post(`${NETWORK}app/sms-handler/`, {
                sender: phoneNumber
            });
            setServerOTP(response.data.code);
            console.log('OTP sent:', response.data.code);
            // Show OTP in development (remove in production)
            Alert.alert('OTP Sent', `OTP sent to +91${phoneNumber}`);

            return true;
        } catch (error) {
            console.error('Send OTP error:', error);
            throw new Error('Failed to send OTP');
        }
    };

    // Check if user exists in database
    const checkUserExists = async () => {
        try {
            const response = await axios.post(`${NETWORK}app/phone-data/`, {
                sender: phoneNumber
            });

            if (response.data.success === false) {
                return { exists: false, userData: null };
            } else {
                return { exists: true, userData: response.data.data };
            }
        } catch (error) {
            console.error('User check error:', error);
            throw new Error('Failed to check user');
        }
    };

    // Handle phone number submission
    const handlePhoneSubmit = async () => {
        // Validation
        if (!phoneNumber.trim()) {
            setError('Please enter your phone number');
            return;
        }
        if (!isValidPhone(phoneNumber)) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            await sendOTP();
            setCurrentStep('otp');
            setTimer(300); // 5 minutes

            // Focus first OTP input
            setTimeout(() => otpInputRefs.current[0]?.focus(), 500);
        } catch (error) {
            Alert.alert('Error', 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP input change
    const handleOTPChange = (value, index) => {
        const numericValue = value.replace(/[^0-9]/g, '');

        if (numericValue.length <= 1) {
            const newOTP = [...otp];
            newOTP[index] = numericValue;
            setOTP(newOTP);

            // Auto-focus next input
            if (numericValue && index < 5) {
                otpInputRefs.current[index + 1]?.focus();
            }

            // Clear error
            if (error) setError('');

            // Auto-verify when complete
            if (index === 5 && numericValue) {
                setTimeout(handleOTPVerify, 100);
            }
        }
    };

    // Handle backspace in OTP
    const handleOTPKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    // Verify OTP and process user
    const handleOTPVerify = async () => {
        const enteredOTP = otp.join('');

        // Validation
        if (enteredOTP.length !== 6) {
            setError('Please enter complete 6-digit OTP');
            return;
        }
        if (enteredOTP !== serverOTP) {
            setError('Invalid OTP. Please try again.');
            return;
        }

        setError('');
        setIsLoading(true);
        const phone = phoneNumber.trim();
        console.log('phoneNumber:', phone);

        try {
            // Save phone number
            await AsyncStorage.setItem('userPhone', phone);
            

            // Check if user exists
            const { exists, userData } = await checkUserExists();

            if (exists) {
                // Existing user - save profile and navigate
                await AsyncStorage.setItem('userProfile', JSON.stringify(userData));

                Alert.alert(
                    'Welcome Back!',
                    `Hello ${userData.name}! Welcome back to Kisan Dost.`,
                    [{
                        text: 'Continue',
                        onPress: () => {
                            const screen = userData.userType === 'farmer' ? 'Home' : 'Vendor';
                            navigation.replace(screen, { userProfile: userData });
                        }
                    }]
                );
            } else {
                // New user - go to selection
                Alert.alert(
                    'Welcome to Kisan Dost!',
                    'You\'re new here! Let\'s set up your account.',
                    [{
                        text: 'Get Started',
                        onPress: () => navigation.replace('Selection', { phoneNumber })
                    }]
                );
            }
        } catch (error) {
            console.error('Verification error:', error);
            Alert.alert(
                'Connection Error',
                'Unable to connect to server. Please check your internet connection.',
                [
                    { text: 'Retry', onPress: handleOTPVerify },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        if (timer > 0) return;

        setIsLoading(true);
        try {
            await sendOTP();
            setTimer(30);
            setOTP(['', '', '', '', '', '']);
            setError('');
            otpInputRefs.current[0]?.focus();
        } catch (error) {
            Alert.alert('Error', 'Failed to resend OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Go back to phone step
    const handleBackToPhone = () => {
        setCurrentStep('phone');
        setOTP(['', '', '', '', '', '']);
        setError('');
        setTimer(0);
        setServerOTP('');
    };

    // Handle phone input change
    const handlePhoneChange = (text) => {
        const numericText = text.replace(/[^0-9]/g, '').slice(0, 10);
        setPhoneNumber(numericText);
        if (error) setError('');
    };

    // Render phone input step
    const renderPhoneStep = () => (
        <View style={styles.phoneSection}>
            <View style={styles.iconContainer}>
                <Text style={styles.phoneIcon}>📱</Text>
            </View>

            <Text style={styles.inputLabel}>Enter Your Mobile Number</Text>
            <Text style={styles.inputSubLabel}>अपना मोबाइल नंबर डालें</Text>

            <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                    style={[styles.phoneInput, error && styles.inputError]}
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={10}
                    returnKeyType="done"
                    onSubmitEditing={handlePhoneSubmit}
                />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
                style={[styles.continueButton, isLoading && styles.disabledButton]}
                onPress={handlePhoneSubmit}
                disabled={isLoading}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.loadingText}>Sending OTP...</Text>
                    </View>
                ) : (
                    <Text style={styles.continueButtonText}>Send OTP</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    // Render OTP verification step
    const renderOTPStep = () => (
        <View style={styles.otpSection}>
            <View style={styles.iconContainer}>
                <Text style={styles.otpIcon}>🔐</Text>
            </View>

            <Text style={styles.inputLabel}>Enter Verification Code</Text>
            <Text style={styles.inputSubLabel}>OTP sent to +91{phoneNumber}</Text>
            <Text style={styles.changeNumberText}>
                Wrong number?
                <Text style={styles.changeNumberLink} onPress={handleBackToPhone}> Change</Text>
            </Text>

            <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                    <TextInput
                        key={index}
                        ref={(ref) => otpInputRefs.current[index] = ref}
                        style={[
                            styles.otpInput,
                            digit && styles.otpInputFilled,
                            error && styles.inputError
                        ]}
                        value={digit}
                        onChangeText={(value) => handleOTPChange(value, index)}
                        onKeyPress={(e) => handleOTPKeyPress(e, index)}
                        keyboardType="numeric"
                        maxLength={1}
                        textAlign="center"
                    />
                ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.timerContainer}>
                {timer > 0 ? (
                    <Text style={styles.timerText}>Resend OTP in {timer} seconds</Text>
                ) : (
                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={handleResendOTP}
                        disabled={isLoading}
                    >
                        <Text style={styles.resendButtonText}>
                            {isLoading ? 'Sending...' : 'Resend OTP'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
                style={[styles.continueButton, isLoading && styles.disabledButton]}
                onPress={handleOTPVerify}
                disabled={isLoading}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.loadingText}>Verifying...</Text>
                    </View>
                ) : (
                    <Text style={styles.continueButtonText}>Verify & Continue</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animated.View
                    style={[
                        styles.animatedContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.welcomeText}>Welcome to</Text>
                        <Text style={styles.appName}>Kisan Dost</Text>
                        <Text style={styles.appNameHindi}>किसान दोस्त</Text>
                        <Text style={styles.tagline}>Your Smart Farming Companion</Text>
                    </View>

                    {/* Current Step */}
                    {currentStep === 'phone' ? renderPhoneStep() : renderOTPStep()}

                    {/* Info Section - Only on phone step */}
                    {currentStep === 'phone' && (
                        <View style={styles.infoSection}>
                            <Text style={styles.infoTitle}>🌱 Why Kisan Dost?</Text>
                            <View style={styles.featuresList}>
                                <Text style={styles.featureItem}>• Get expert farming advice in your language</Text>
                                <Text style={styles.featureItem}>• Real-time weather and market updates</Text>
                                <Text style={styles.featureItem}>• Connect with farmers and vendors</Text>
                                <Text style={styles.featureItem}>• Government schemes information</Text>
                            </View>
                        </View>
                    )}

                    {/* Privacy Notice */}
                    <View style={styles.privacySection}>
                        <Text style={styles.privacyText}>
                            🔒 Your data is secure and will be used only to provide
                            personalized farming assistance.
                        </Text>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default PhoneAuthScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F8E9',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    animatedContainer: {
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    welcomeText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    appName: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    appNameHindi: {
        fontSize: 20,
        color: '#4CAF50',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    phoneSection: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    otpSection: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    phoneIcon: {
        fontSize: 48,
    },
    otpIcon: {
        fontSize: 48,
    },
    inputLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 4,
    },
    inputSubLabel: {
        fontSize: 14,
        color: '#4CAF50',
        textAlign: 'center',
        marginBottom: 8,
    },
    changeNumberText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    changeNumberLink: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        borderWidth: 2,
        borderColor: '#ddd',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        marginTop: 12,
    },
    countryCode: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    flagEmoji: {
        fontSize: 20,
        marginRight: 8,
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    phoneInput: {
        flex: 1,
        fontSize: 18,
        color: '#333',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        marginTop: 12,
    },
    otpInput: {
        width: 45,
        height: 55,
        borderWidth: 2,
        borderColor: '#ddd',
        borderRadius: 12,
        fontSize: 20,
        fontWeight: 'bold',
        backgroundColor: '#fff',
        color: '#333',
    },
    otpInputFilled: {
        borderColor: '#4CAF50',
        backgroundColor: '#F1F8E9',
    },
    inputError: {
        borderColor: '#F44336',
    },
    errorText: {
        color: '#F44336',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    timerText: {
        fontSize: 14,
        color: '#666',
    },
    resendButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    resendButtonText: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
    },
    continueButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
    },
    infoSection: {
        backgroundColor: '#E8F5E8',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 12,
        textAlign: 'center',
    },
    featuresList: {
        gap: 6,
    },
    featureItem: {
        fontSize: 13,
        color: '#555',
        lineHeight: 18,
    },
    privacySection: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    privacyText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
        fontStyle: 'italic',
    },
});