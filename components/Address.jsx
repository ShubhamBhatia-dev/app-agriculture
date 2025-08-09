import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Alert,
    ActivityIndicator,
    PermissionsAndroid,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';

// --- FIX 1: Moved InputField component outside of AddressPhoneScreen ---
// This prevents the component from being re-created on every render,
// which was causing the TextInput to lose focus and the keyboard to dismiss.
const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', error, maxLength }) => (
    <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
            style={[styles.textInput, error && styles.inputError]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            keyboardType={keyboardType}
            maxLength={maxLength}
            placeholderTextColor="#999"
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);


const AddressPhoneScreen = ({ navigation, route }) => {
    const [userType] = useState(route?.params?.userType || 'farmer');
    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        district: '',
        country: 'India'
    });
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // --- OPTIMIZATION: Debounced pincode validation ---
    // This state holds the pincode value that will be validated after the user stops typing.
    const [debouncedPincode, setDebouncedPincode] = useState('');

    const indianStates = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
        'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
        'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
        'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
        'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
        'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
        'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu',
        'Lakshadweep'
    ];

    useEffect(() => {
        loadSavedData();
    }, []);

    // Effect for handling debounced pincode validation
    useEffect(() => {
        // If the debounced pincode is not 6 digits, do nothing.
        if (debouncedPincode.length !== 6) {
            // Clear any previous invalid pincode error if user deletes characters
            if (errors.pincode === 'Invalid pincode') {
                setErrors(prev => ({ ...prev, pincode: '' }));
            }
            return;
        }

        // Set a timer to validate the pincode 500ms after the user stops typing.
        const handler = setTimeout(() => {
            handlePincodeValidation(debouncedPincode);
        }, 500);

        // Cleanup function: This clears the timer if the user types again
        // before the 500ms is up. This is the core of debouncing.
        return () => {
            clearTimeout(handler);
        };
    }, [debouncedPincode]); // This effect runs only when debouncedPincode changes

    const loadSavedData = async () => {
        try {
            const savedData = await AsyncStorage.getItem('userProfile');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                setFormData(prev => ({
                    ...prev,
                    name: parsedData.name || '',
                    phoneNumber: parsedData.phoneNumber || '',
                    address: parsedData.address || '',
                    city: parsedData.city || '',
                    state: parsedData.state || '',
                    pincode: parsedData.pincode || '',
                    district: parsedData.district || ''
                }));
                // Also set the debounced pincode if it exists
                if (parsedData.pincode) {
                    setDebouncedPincode(parsedData.pincode);
                }
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    };

    const requestLocationPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'This app needs access to location to help fill your address automatically.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    };

    const getCurrentLocation = async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            Alert.alert('Permission Required', 'Location permission is required to auto-fill address.');
            return;
        }

        setIsLoadingLocation(true);

        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ latitude, longitude });
                await reverseGeocode(latitude, longitude);
                setIsLoadingLocation(false);
            },
            (error) => {
                console.error('Location error:', error);
                setIsLoadingLocation(false);
                Alert.alert(
                    'Location Error',
                    'Unable to get current location. Please enter address manually.'
                );
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            // Using OpenCage Geocoding API (free tier available)
            // You can also use Google Maps Geocoding API with your API key
            const response = await fetch(
                `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=YOUR_OPENCAGE_API_KEY&language=en&pretty=1`
            );

            if (!response.ok) {
                throw new Error('Geocoding failed');
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                const components = result.components;

                setFormData(prev => ({
                    ...prev,
                    address: result.formatted || '',
                    city: components.city || components.town || components.village || '',
                    state: components.state || '',
                    pincode: components.postcode || '',
                    district: components.state_district || '',
                    country: components.country || 'India'
                }));
                // Set debounced pincode as well
                if (components.postcode) {
                    setDebouncedPincode(components.postcode);
                }

                Alert.alert('Success', 'Address filled automatically!');
            } else {
                throw new Error('No address found');
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            // Fallback: Fill with basic location info
            setFormData(prev => ({
                ...prev,
                address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
            }));
            Alert.alert(
                'Partial Success',
                'Location detected but couldn\'t get full address. Please complete manually.'
            );
        }
    };

    const validatePincode = async (pincode) => {
        if (pincode.length !== 6) return false;

        try {
            // Using India Post API to validate pincode
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            const data = await response.json();

            if (data && data[0] && data[0].Status === 'Success') {
                const postOffice = data[0].PostOffice[0];

                // Auto-fill city, district, state from pincode
                setFormData(prev => ({
                    ...prev,
                    city: postOffice.Division || prev.city,
                    district: postOffice.District || prev.district,
                    state: postOffice.State || prev.state
                }));
                // Clear any existing pincode error
                setErrors(prev => ({ ...prev, pincode: '' }));

                return true;
            }
            return false;
        } catch (error) {
            console.error('Pincode validation error:', error);
            return false;
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // For pincode, update the debounced state instead of calling validation directly
        if (field === 'pincode') {
            const numericValue = value.replace(/[^0-9]/g, '');
            setDebouncedPincode(numericValue);
        }

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handlePincodeValidation = async (pincode) => {
        const isValid = await validatePincode(pincode);
        if (!isValid) {
            setErrors(prev => ({ ...prev, pincode: 'Invalid pincode' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.phoneNumber || formData.phoneNumber.length !== 10) {
            newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
        }

        if (!formData.address.trim()) {
            newErrors.address = 'Address is required';
        }

        if (!formData.city.trim()) {
            newErrors.city = 'City is required';
        }

        if (!formData.state.trim()) {
            newErrors.state = 'State is required';
        }

        if (!formData.pincode || formData.pincode.length !== 6) {
            newErrors.pincode = 'Please enter a valid 6-digit pincode';
        }

        // Also check the pincode error state from API validation
        if (errors.pincode) {
            newErrors.pincode = errors.pincode;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveUserProfile = async () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fill all required fields correctly.');
            return;
        }

        setIsSaving(true);

        try {
            const userProfile = {
                userType,
                ...formData,
                location: currentLocation,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
            await AsyncStorage.setItem('isProfileComplete', 'true');

            Alert.alert(
                'Success!',
                'Your profile has been saved successfully.',
                [
                    {
                        text: 'Continue',
                        onPress: () => {
                            if (userType === 'farmer') {
                                navigation.replace('Home', { userProfile });
                            } else {
                                navigation.replace('Vendor', { userProfile });


                                console.log('Profile saved:', userProfile);
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // The InputField component is now defined outside and above this component.

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Complete Your Profile</Text>
                <Text style={styles.headerSubtitle}>अपनी प्रोफ़ाइल पूरी करें</Text>
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                    {/* User Type Display */}
                    <View style={styles.userTypeContainer}>
                        <Text style={styles.userTypeText}>
                            You selected: <Text style={styles.userTypeBold}>
                                {userType === 'farmer' ? '👨‍🌾 Farmer (किसान)' : '🏪 Vendor (व्यापारी)'}
                            </Text>
                        </Text>
                    </View>
                    {/* Name */}
                    <InputField
                        label="Name / नाम *"
                        value={formData.name}
                        onChangeText={(value) => handleInputChange('name', value.replace(/[^a-zA-Z\s]/g, ''))}
                        placeholder="Enter your full name"
                        keyboardType="default"
                        maxLength={40}
                        error={errors.name}
                    />
                    {/* Phone Number */}
                    <InputField
                        label="Phone Number / फ़ोन नंबर *"
                        value={formData.phoneNumber}
                        onChangeText={(value) => handleInputChange('phoneNumber', value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter 10-digit mobile number"
                        keyboardType="numeric"
                        maxLength={10}
                        error={errors.phoneNumber}
                    />

                    {/* Location Button */}
                    <TouchableOpacity
                        style={styles.locationButton}
                        onPress={getCurrentLocation}
                        disabled={isLoadingLocation}
                    >
                        {isLoadingLocation ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.locationButtonText}>📍 Use Current Location</Text>
                        )}
                    </TouchableOpacity>

                    {/* Address */}
                    <InputField
                        label="Full Address / पूरा पता *"
                        value={formData.address}
                        onChangeText={(value) => handleInputChange('address', value)}
                        placeholder="House no, Street, Area"
                        error={errors.address}
                    />

                    {/* City */}
                    <InputField
                        label="City / शहर *"
                        value={formData.city}
                        onChangeText={(value) => handleInputChange('city', value)}
                        placeholder="Enter your city"
                        error={errors.city}
                    />

                    {/* District */}
                    <InputField
                        label="District / जिला"
                        value={formData.district}
                        onChangeText={(value) => handleInputChange('district', value)}
                        placeholder="Enter your district"
                    />

                    {/* Pincode */}
                    <InputField
                        label="Pincode / पिन कोड *"
                        value={formData.pincode}
                        // The debouncing is now handled by the useEffect hook
                        onChangeText={(value) => handleInputChange('pincode', value)}
                        placeholder="6-digit pincode"
                        keyboardType="numeric"
                        maxLength={6}
                        error={errors.pincode}
                    />

                    {/* State */}
                    <InputField
                        label="State / राज्य *"
                        value={formData.state}
                        onChangeText={(value) => handleInputChange('state', value)}
                        placeholder="Select or enter your state"
                        error={errors.state}
                    />

                    {/* Country (Read-only) */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Country / देश</Text>
                        <View style={[styles.textInput, styles.readOnlyInput]}>
                            <Text style={styles.readOnlyText}>🇮🇳 India</Text>
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.disabledButton]}
                        onPress={saveUserProfile}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save & Continue</Text>
                        )}
                    </TouchableOpacity>

                    {/* Info */}
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoTitle}>🔒 Privacy Notice</Text>
                        <Text style={styles.infoText}>
                            Your information is stored securely on your device and will be used only to
                            provide personalized farming assistance and local weather updates.
                        </Text>
                    </View>

                    <View style={{ height: 30 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default AddressPhoneScreen;

// Styles remain unchanged
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F8E9',
    },
    header: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 20,
        paddingVertical: 20,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#C8E6C9',
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    scrollView: {
        padding: 16,
    },
    userTypeContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.22,
    },
    userTypeText: {

        fontSize: 16,

        color: '#666',

        textAlign: 'center',

    },

    userTypeBold: {

        fontWeight: 'bold',

        color: '#2E7D32',

    },

    inputContainer: {

        marginBottom: 16,

    },

    inputLabel: {

        fontSize: 16,

        fontWeight: '600',

        color: '#2E7D32',

        marginBottom: 8,

    },

    textInput: {

        backgroundColor: '#fff',

        borderWidth: 1,

        borderColor: '#ddd',

        borderRadius: 12,

        paddingHorizontal: 16,

        paddingVertical: 14,

        fontSize: 16,

        color: '#333',

        elevation: 1,

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 1 },

        shadowOpacity: 0.1,

        shadowRadius: 1,

    },

    inputError: {

        borderColor: '#F44336',

    },

    errorText: {

        color: '#F44336',

        fontSize: 12,

        marginTop: 4,

        marginLeft: 4,

    },

    readOnlyInput: {

        backgroundColor: '#f5f5f5',

        borderColor: '#e0e0e0',

    },

    readOnlyText: {

        fontSize: 16,

        color: '#666',

    },

    locationButton: {

        backgroundColor: '#2196F3',

        paddingVertical: 14,

        paddingHorizontal: 20,

        borderRadius: 12,

        alignItems: 'center',

        marginBottom: 20,

        flexDirection: 'row',

        justifyContent: 'center',

    },

    locationButtonText: {

        color: '#fff',

        fontSize: 16,

        fontWeight: '600',

    },

    saveButton: {

        backgroundColor: '#4CAF50',

        paddingVertical: 16,

        paddingHorizontal: 20,

        borderRadius: 12,

        alignItems: 'center',

        marginTop: 20,

        elevation: 3,

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.2,

        shadowRadius: 3.84,

    },

    disabledButton: {

        backgroundColor: '#ccc',

    },

    saveButtonText: {

        color: '#fff',

        fontSize: 18,

        fontWeight: 'bold',

    },

    infoContainer: {

        backgroundColor: '#E3F2FD',

        padding: 16,

        borderRadius: 12,

        marginTop: 20,

        borderLeftWidth: 4,

        borderLeftColor: '#2196F3',

    },

    infoTitle: {

        fontSize: 16,

        fontWeight: '600',

        color: '#1976D2',

        marginBottom: 8,

    },

    infoText: {

        fontSize: 13,

        color: '#555',

        lineHeight: 18,

    },

});  