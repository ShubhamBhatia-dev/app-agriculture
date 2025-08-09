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

const { width, height } = Dimensions.get('window');

const PhoneAuthScreen = ({ navigation }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

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

    const checkExistingSession = async () => {
        try {
            const existingUser = await AsyncStorage.getItem('userProfile');
            const isProfileComplete = await AsyncStorage.getItem('isProfileComplete');

            if (existingUser && isProfileComplete === 'true') {
                const userProfile = JSON.parse(existingUser);
                // Auto-login user
                setTimeout(() => {
                    navigation.replace('Home', { userProfile });
                }, 1000);
            }
        } catch (error) {
            console.error('Error checking existing session:', error);
        }
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
                isProfileComplete: false, // Incomplete profile
                registrationDate: '2024-01-15T00:00:00.000Z'
            }
        ];

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Find user in mock database
        const user = mockDatabase.find(u => u.phoneNumber === phone);

        if (user) {
            return {
                exists: true,
                userData: user
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
            // Check if user exists in database
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
            console.error('Error checking user:', error);
            Alert.alert(
                'Connection Error',
                'Unable to connect to server. Please check your internet connection and try again.',
                [
                    { text: 'Retry', onPress: handlePhoneSubmit },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } finally {
            setIsLoading(false);
        }
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

    const QuickLoginButton = ({ phone, name, onPress }) => (
        <TouchableOpacity style={styles.quickLoginButton} onPress={() => onPress(phone)}>
            <View style={styles.quickLoginInfo}>
                <Text style={styles.quickLoginPhone}>📱 {phone}</Text>
                <Text style={styles.quickLoginName}>{name}</Text>
            </View>
            <Text style={styles.quickLoginArrow}>→</Text>
        </TouchableOpacity>
    );

    const handleQuickLogin = (phone) => {
        setPhoneNumber(phone);
        // Auto-submit after setting phone number
        setTimeout(() => {
            handlePhoneSubmit();
        }, 500);
    };

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

                    {/* Phone Input Section */}
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
                                    <Text style={styles.loadingText}>Checking...</Text>
                                </View>
                            ) : (
                                <Text style={styles.continueButtonText}>Continue</Text>
                            )}
                        </TouchableOpacity>
                    </View>



                    {/* Info Section */}
                    <View style={styles.infoSection}>
                        <Text style={styles.infoTitle}>🌱 Why Kisan Dost?</Text>
                        <View style={styles.featuresList}>
                            <Text style={styles.featureItem}>• Get expert farming advice in your language</Text>
                            <Text style={styles.featureItem}>• Real-time weather and market updates</Text>
                            <Text style={styles.featureItem}>• Connect with farmers and vendors</Text>
                            <Text style={styles.featureItem}>• Government schemes information</Text>
                        </View>
                    </View>

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
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    phoneIcon: {
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
        marginBottom: 20,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        borderWidth: 2,
        borderColor: '#ddd',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
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
    inputError: {
        borderColor: '#F44336',
    },
    errorText: {
        color: '#F44336',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
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
    quickLoginSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.22,
    },
    quickLoginTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 4,
    },
    quickLoginSubtitle: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
    },
    quickLoginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    quickLoginInfo: {
        flex: 1,
    },
    quickLoginPhone: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2E7D32',
        marginBottom: 4,
    },
    quickLoginName: {
        fontSize: 14,
        color: '#666',
    },
    quickLoginArrow: {
        fontSize: 18,
        color: '#4CAF50',
        fontWeight: 'bold',
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