import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
    Image,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const UserSettings = ({ navigation }) => {
    // User data state
    const [userDetails, setUserDetails] = useState({
        name: 'राम सिंह',
        nameEnglish: 'Ram Singh',
        phone: '+91 9876543210',
        email: 'ramsingh@email.com',
        address: 'Village Kalka, Shimla',
        addressHindi: 'गांव कालका, शिमला',
        farmSize: '5 acres',
        farmSizeHindi: '5 एकड़',
        crops: 'Wheat, Rice, Vegetables',
        cropsHindi: 'गेहूं, चावल, सब्जियां',
        language: 'Hindi'
    });

    const [isEditing, setIsEditing] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const languages = [
        { code: 'hi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
        { code: 'ur', name: 'اردو (Urdu)', flag: '🇵🇰' },
        { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇧🇩' }
    ];

    const handleInputChange = (field, value) => {
        setUserDetails(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);

        // Simulate API call
        setTimeout(() => {
            setIsSaving(false);
            setIsEditing(false);
            Alert.alert(
                'Success',
                'Your profile has been updated successfully!',
                [{ text: 'OK', style: 'default' }]
            );
        }, 1500);
    };

    const handleCancel = () => {
        Alert.alert(
            'Discard Changes',
            'Are you sure you want to discard your changes?',
            [
                { text: 'Continue Editing', style: 'cancel' },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => setIsEditing(false)
                }
            ]
        );
    };

    const selectLanguage = (language) => {
        handleInputChange('language', language.name);
        setShowLanguageModal(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>User Settings</Text>
                <Text style={styles.headerSubtitle}>उपयोगकर्ता सेटिंग्स</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Picture Section */}
                <View style={styles.profileSection}>
                    <View style={styles.profileImageContainer}>
                        <View style={styles.profileImage}>
                            <Text style={styles.profileInitials}>
                                {userDetails.nameEnglish.split(' ').map(n => n[0]).join('')}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.editImageButton}>
                            <Text style={styles.editImageText}>📷</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.profileName}>{userDetails.name}</Text>
                    <Text style={styles.profileNameEnglish}>{userDetails.nameEnglish}</Text>
                </View>

                {/* Edit Toggle Button */}
                <View style={styles.editToggleContainer}>
                    {!isEditing ? (
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setIsEditing(true)}
                        >
                            <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.editActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCancel}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, isSaving && styles.savingButton]}
                                onPress={handleSave}
                                disabled={isSaving}
                            >
                                <Text style={styles.saveButtonText}>
                                    {isSaving ? 'Saving...' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Form Fields */}
                <View style={styles.formContainer}>
                    {/* Personal Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                        <Text style={styles.sectionSubtitle}>व्यक्तिगत जानकारी</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Name (Hindi) / नाम</Text>
                            <TextInput
                                style={[styles.textInput, !isEditing && styles.disabledInput]}
                                value={userDetails.name}
                                onChangeText={(text) => handleInputChange('name', text)}
                                editable={isEditing}
                                placeholder="अपना नाम दर्ज करें"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Name (English)</Text>
                            <TextInput
                                style={[styles.textInput, !isEditing && styles.disabledInput]}
                                value={userDetails.nameEnglish}
                                onChangeText={(text) => handleInputChange('nameEnglish', text)}
                                editable={isEditing}
                                placeholder="Enter your name"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Phone Number / फ़ोन नंबर</Text>
                            <TextInput
                                style={[styles.textInput, !isEditing && styles.disabledInput]}
                                value={userDetails.phone}
                                onChangeText={(text) => handleInputChange('phone', text)}
                                editable={isEditing}
                                placeholder="+91 XXXXXXXXXX"
                                placeholderTextColor="#999"
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                style={[styles.textInput, !isEditing && styles.disabledInput]}
                                value={userDetails.email}
                                onChangeText={(text) => handleInputChange('email', text)}
                                editable={isEditing}
                                placeholder="your.email@example.com"
                                placeholderTextColor="#999"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Location Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Location Information</Text>
                        <Text style={styles.sectionSubtitle}>स्थान की जानकारी</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Address / पता</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea, !isEditing && styles.disabledInput]}
                                value={userDetails.address}
                                onChangeText={(text) => handleInputChange('address', text)}
                                editable={isEditing}
                                placeholder="Enter your address"
                                placeholderTextColor="#999"
                                multiline={true}
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Address (Hindi) / पता (हिंदी में)</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea, !isEditing && styles.disabledInput]}
                                value={userDetails.addressHindi}
                                onChangeText={(text) => handleInputChange('addressHindi', text)}
                                editable={isEditing}
                                placeholder="अपना पता दर्ज करें"
                                placeholderTextColor="#999"
                                multiline={true}
                                numberOfLines={3}
                            />
                        </View>
                    </View>

                    {/* Farming Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Farming Information</Text>
                        <Text style={styles.sectionSubtitle}>खेती की जानकारी</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Farm Size / खेत का आकार</Text>
                            <TextInput
                                style={[styles.textInput, !isEditing && styles.disabledInput]}
                                value={userDetails.farmSize}
                                onChangeText={(text) => handleInputChange('farmSize', text)}
                                editable={isEditing}
                                placeholder="e.g., 5 acres"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Farm Size (Hindi) / खेत का आकार (हिंदी में)</Text>
                            <TextInput
                                style={[styles.textInput, !isEditing && styles.disabledInput]}
                                value={userDetails.farmSizeHindi}
                                onChangeText={(text) => handleInputChange('farmSizeHindi', text)}
                                editable={isEditing}
                                placeholder="उदा. 5 एकड़"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Crops Grown / उगाई जाने वाली फसलें</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea, !isEditing && styles.disabledInput]}
                                value={userDetails.crops}
                                onChangeText={(text) => handleInputChange('crops', text)}
                                editable={isEditing}
                                placeholder="e.g., Wheat, Rice, Vegetables"
                                placeholderTextColor="#999"
                                multiline={true}
                                numberOfLines={2}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Crops (Hindi) / फसलें (हिंदी में)</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea, !isEditing && styles.disabledInput]}
                                value={userDetails.cropsHindi}
                                onChangeText={(text) => handleInputChange('cropsHindi', text)}
                                editable={isEditing}
                                placeholder="उदा. गेहूं, चावल, सब्जियां"
                                placeholderTextColor="#999"
                                multiline={true}
                                numberOfLines={2}
                            />
                        </View>
                    </View>

                    {/* App Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>App Preferences</Text>
                        <Text style={styles.sectionSubtitle}>ऐप प्राथमिकताएं</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Preferred Language / पसंदीदा भाषा</Text>
                            <TouchableOpacity
                                style={[styles.textInput, styles.languageSelector, !isEditing && styles.disabledInput]}
                                onPress={() => isEditing && setShowLanguageModal(true)}
                                disabled={!isEditing}
                            >
                                <Text style={[styles.languageSelectorText, !isEditing && styles.disabledText]}>
                                    {userDetails.language}
                                </Text>
                                {isEditing && <Text style={styles.dropdownIcon}>▼</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Bottom spacing */}
                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Language Selection Modal */}
            <Modal
                visible={showLanguageModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Language</Text>
                        <Text style={styles.modalSubtitle}>भाषा चुनें</Text>

                        {languages.map((language) => (
                            <TouchableOpacity
                                key={language.code}
                                style={[
                                    styles.languageOption,
                                    userDetails.language === language.name && styles.selectedLanguage
                                ]}
                                onPress={() => selectLanguage(language)}
                            >
                                <Text style={styles.languageFlag}>{language.flag}</Text>
                                <Text style={[
                                    styles.languageOptionText,
                                    userDetails.language === language.name && styles.selectedLanguageText
                                ]}>
                                    {language.name}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={() => setShowLanguageModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default UserSettings;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F8E9',
    },
    header: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 20,
        paddingVertical: 15,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#C8E6C9',
    },
    content: {
        flex: 1,
    },
    profileSection: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 30,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.22,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#C8E6C9',
    },
    profileInitials: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    editImageButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2E7D32',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    editImageText: {
        fontSize: 14,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    profileNameEnglish: {
        fontSize: 18,
        color: '#4CAF50',
    },
    editToggleContainer: {
        margin: 16,
        alignItems: 'center',
    },
    editButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.22,
    },
    editButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.22,
    },
    savingButton: {
        backgroundColor: '#81C784',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    formContainer: {
        paddingHorizontal: 16,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.22,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 16,
        color: '#4CAF50',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    disabledInput: {
        backgroundColor: '#F5F5F5',
        color: '#666',
    },
    languageSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    languageSelectorText: {
        fontSize: 16,
        color: '#333',
    },
    disabledText: {
        color: '#666',
    },
    dropdownIcon: {
        fontSize: 12,
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '80%',
        maxWidth: 300,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#4CAF50',
        textAlign: 'center',
        marginBottom: 20,
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    selectedLanguage: {
        backgroundColor: '#E8F5E8',
    },
    languageFlag: {
        fontSize: 20,
        marginRight: 12,
    },
    languageOptionText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    selectedLanguageText: {
        color: '#2E7D32',
        fontWeight: '600',
    },
    modalCancelButton: {
        backgroundColor: '#E0E0E0',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 12,
    },
    modalCancelText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        fontWeight: '600',
    },
});