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
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOTP] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState('phone'); // 'phone' or 'otp'
    const [generatedOTP, setGeneratedOTP] = useState('');
    const [timer, setTimer] = useState(0);
    const [canResend, setCanResend] = useState(true);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const otpInputRefs = useRef([]);

    useEffect(() => {
        // Entrance animation
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

        // Check if user is already logged in
        checkExistingSession();
    }, []);

    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(timer => timer - 1);
            }, 1000);
        } else if (timer === 0 && !canResend) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timer, canResend]);

    const checkExistingSession = async () => {
        try {
            const existingUser = await AsyncStorage.getItem('userProfile');
            const isProfileComplete = await AsyncStorage.getItem('isProfileComplete');

            if (existingUser && isProfileComplete === 'true') {
                const userProfile = JSON.parse(existingUser);
                // Auto-login user
                setTimeout(() => {
                    if (userProfile.userType === 'farmer') {
                        navigation.replace('Home', { userProfile });
                    } else if (userProfile.userType === 'vendor') {
                        navigation.replace('Vendor', { userProfile });
                    }

                }, 1000);
            }
        } catch (error) {
            console.error('Error checking existing session:', error);
        }
    };


    // Simulate sending OTP via SMS
    const sendOTP = async (phoneNumber) => {
        console.log(`${NETWORK}app/sms-handler/`)
        const otp = await axios.post(`${NETWORK}app/sms-handler/`, { "sender": phoneNumber })
            .then(response => {
                console.log(response);
                return response.data.code;
            })
            .catch(error => {
                console.error('Error sending OTP:', error);
                throw new Error('Failed to send OTP');
            });
        console.log(`Generated OTP: ${otp}`);
        setGeneratedOTP(otp);

        // In real app, you would call your SMS service API here
        console.log(`OTP sent to ${phoneNumber}: ${otp}`);

        // For development, show OTP in alert (remove in production)
        Alert.alert(
            'OTP Sent',
            `OTP sent to +91${phoneNumber}\n\n`,
            [{ text: 'OK' }]
        );

        return true;
    };

    // Simulate API call to check if user exists in database
    const checkUserInDatabase = async (phone) => {
        // Mock database with some sample users
        const mockDatabase = [
            {
                phoneNumber: '9876543210',
                userType: 'farmer',
                name: 'Rajesh Kumar',
                address: 'Village Khatauli, Muzaffarnagar',
                city: 'Muzaffarnagar',
                state: 'Uttar Pradesh',
                pincode: '251201',
                district: 'Muzaffarnagar',
                country: 'India',
                isProfileComplete: true,
                registrationDate: '2024-01-10T00:00:00.000Z'
            },
            {
                phoneNumber: '9876543211',
                userType: 'vendor',
                name: 'Suresh Patel',
                address: 'Shop No. 45, Grain Market',
                city: 'Karnal',
                state: 'Haryana',
                pincode: '132001',
                district: 'Karnal',
                country: 'India',
                isProfileComplete: true,
                registrationDate: '2024-01-05T00:00:00.000Z'
            },
            {
                phoneNumber: '9876543212',
                userType: 'farmer',
                name: 'Amit Singh',
                address: 'Khasra No. 123, Village Baghpat',
                city: 'Baghpat',
                state: 'Uttar Pradesh',
                pincode: '250609',
                district: 'Baghpat',
                country: 'India',
                isProfileComplete: false,
                registrationDate: '2024-01-15T00:00:00.000Z'
            }
        ];


        // Simulate API delay
        const user = await axios.post(`${NETWORK}app/phone-verify/`, { "sender": phoneNumber })
            .then(response => {
                console.log(response);
                return response.data.user;
            })
            .catch(error => {
                console.error('Error sending OTP:', error);
                throw new Error('Failed to send OTP');
            });

        // Find user in mock database

        if (user.data.success) {
            return {




                exists: true,
                userData: user.data.data
            };
        } else {
            return {
                exists: false,
                userData: null
            };
        }
    };

    const validatePhoneNumber = (phone) => {
        // Indian mobile number validation
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone);
    };

    const handlePhoneSubmit = async () => {
        if (!phoneNumber.trim()) {
            setError('Please enter your phone number');
            return;
        }

        if (!validatePhoneNumber(phoneNumber)) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Send OTP
            await sendOTP(phoneNumber);

            // Switch to OTP verification step
            setCurrentStep('otp');
            setTimer(300); // 300 seconds timer
            setCanResend(false);

            // Focus first OTP input
            setTimeout(() => {
                otpInputRefs.current[0]?.focus();
            }, 500);

        } catch (error) {
            console.error('Error sending OTP:', error);
            Alert.alert(
                'Error',
                'Failed to send OTP. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleOTPChange = (value, index) => {
        // Only allow numbers
        const numericValue = value.replace(/[^0-9]/g, '');

        if (numericValue.length <= 1) {
            const newOTP = [...otp];
            newOTP[index] = numericValue;
            setOTP(newOTP);

            // Auto-focus next input
            if (numericValue && index < 5) {
                otpInputRefs.current[index + 1]?.focus();
            }

            // Clear error when user starts typing
            if (error) {
                setError('');
            }

            // Auto-verify when all 6 digits are entered
            if (index === 5 && numericValue) {
                setTimeout(() => {
                    handleOTPVerify();
                }, 100);
            }
        }
    };

    const handleOTPKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            // Focus previous input on backspace
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const handleOTPVerify = async () => {
        const enteredOTP = otp.join('');
        console.log(`Entered OTP: ${enteredOTP}`);
        if (enteredOTP.length !== 6) {
            setError('Please enter complete 6-digit OTP');
            return;
        }

        if (enteredOTP !== generatedOTP) {
            setError('Invalid OTP. Please try again.');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // OTP verified, now check user in database
            const response = await checkUserInDatabase(phoneNumber);

            if (response.exists) {
                // User exists in database
                const userData = response.userData;

                // Save user data to AsyncStorage
                await AsyncStorage.setItem('userProfile', JSON.stringify(userData));
                await AsyncStorage.setItem('userPhone', phoneNumber);

                if (userData.isProfileComplete) {
                    // Profile is complete, go to home screen
                    await AsyncStorage.setItem('isProfileComplete', 'true');

                    Alert.alert(
                        'Welcome Back!',
                        `Hello ${userData.name}! Welcome back to Kisan Dost.`,
                        [
                            {
                                text: 'Continue',
                                onPress: () => {
                                    navigation.replace('Home', { userProfile: userData });
                                }
                            }
                        ]
                    );
                } else {
                    // Profile exists but incomplete, go to address screen
                    Alert.alert(
                        'Profile Incomplete',
                        'Please complete your profile to continue.',
                        [
                            {
                                text: 'Complete Profile',
                                onPress: () => {
                                    navigation.replace('AddressPhoneScreen', {
                                        userType: userData.userType,
                                        existingData: userData
                                    });
                                }
                            }
                        ]
                    );
                }
            } else {
                // New user, go to user selection screen
                await AsyncStorage.setItem('userPhone', phoneNumber);

                Alert.alert(
                    'Welcome to Kisan Dost!',
                    'You\'re new here! Let\'s set up your account.',
                    [
                        {
                            text: 'Get Started',
                            onPress: () => {
                                navigation.replace('Selection', { phoneNumber });
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Error verifying user:', error);
            Alert.alert(
                'Connection Error',
                'Unable to connect to server. Please check your internet connection and try again.',
                [
                    { text: 'Retry', onPress: handleOTPVerify },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;

        setIsLoading(true);
        try {
            await sendOTP(phoneNumber);
            setTimer(30);
            setCanResend(false);
            setOTP(['', '', '', '', '', '']);
            setError('');

            // Focus first input
            otpInputRefs.current[0]?.focus();
        } catch (error) {
            Alert.alert('Error', 'Failed to resend OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToPhone = () => {
        setCurrentStep('phone');
        setOTP(['', '', '', '', '', '']);
        setError('');
        setTimer(0);
        setCanResend(true);
        setGeneratedOTP('');
    };

    const handlePhoneChange = (text) => {
        // Only allow numbers and limit to 10 digits
        const numericText = text.replace(/[^0-9]/g, '').slice(0, 10);
        setPhoneNumber(numericText);

        // Clear error when user starts typing
        if (error) {
            setError('');
        }
    };

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

            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}

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

    const renderOTPStep = () => (
        <View style={styles.otpSection}>
            <View style={styles.iconContainer}>
                <Text style={styles.otpIcon}>🔐</Text>
            </View>

            <Text style={styles.inputLabel}>Enter Verification Code</Text>
            <Text style={styles.inputSubLabel}>
                OTP sent to +91{phoneNumber}
            </Text>
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

            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <View style={styles.timerContainer}>
                {timer > 0 ? (
                    <Text style={styles.timerText}>
                        Resend OTP in {timer} seconds
                    </Text>
                ) : (
                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={handleResendOTP}
                        disabled={!canResend || isLoading}
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

                    {/* Phone or OTP Step */}
                    {currentStep === 'phone' ? renderPhoneStep() : renderOTPStep()}

                    {/* Info Section - Only show on phone step */}
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