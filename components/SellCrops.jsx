import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    TextInput,
    Modal,
    Alert,
    FlatList,
    RefreshControl,
    Dimensions,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NETWORK } from './constants';
import axios from 'axios';

const { height } = Dimensions.get('window');

// --- Helper Data and Functions ---

const units = [
    { label: 'Quintal (क्विंटल)', value: 'quintal' },
    { label: 'Ton (टन)', value: 'ton' },
    { label: 'Man (मन)', value: 'man' }
];

const cropEmojis = {
    'wheat': '🌾', 'rice': '🌾', 'sugarcane': '🎋', 'cotton': '🤍',
    'maize': '🌽', 'soybean': '🟤', 'mustard': '🟡', 'barley': '🌾',
    'gram': '🟫', 'onion': '🧅', 'potato': '🥔', 'tomato': '🍅'
};

const getCropEmoji = (cropName) => {
    const name = cropName.toLowerCase();
    return cropEmojis[name] || '🌱';
};

const getHindiName = (cropName) => {
    const hindiNames = {
        'wheat': 'गेहूं', 'rice': 'चावल', 'sugarcane': 'गन्ना', 'cotton': 'कपास',
        'maize': 'मक्का', 'soybean': 'सोयाबीन', 'mustard': 'सरसों', 'barley': 'जौ',
        'gram': 'चना', 'onion': 'प्याज', 'potato': 'आलू', 'tomato': 'टमाटर'
    };
    return hindiNames[cropName.toLowerCase()] || cropName;
};

// --- Memoized Child Components ---

const CropCard = React.memo(({ crop, onDelete }) => (
    <View style={styles.cropCard}>
        <View style={styles.cropHeader}>
            <View style={styles.cropInfo}>
                <Text style={styles.cropEmoji}>🌾</Text>
                <View style={styles.cropDetails}>
                    <Text style={styles.cropName}>{crop.crop_name}</Text>
                </View>
            </View>
            <View style={styles.priceContainer}>
                <Text style={styles.price}>₹{crop.crop_price.toLocaleString('en-IN')}</Text>
                <Text style={styles.unit}>per {crop.unit}</Text>
            </View>
        </View>

        <View style={styles.cropMetrics}>
            <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>📦 Quantity</Text>
                <Text style={styles.metricValue}>{crop.quantity} {crop.unit}</Text>
            </View>
            <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>📅 Listed</Text>
                <Text style={styles.metricValue}>{crop.created_at ? crop.created_at.slice(0, 10) : 'Today'}</Text>
            </View>
        </View>

        <View style={styles.cardActions}>
            <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => onDelete(crop.id)}
            >
                <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
        </View>
    </View>
));

const AddCropModal = React.memo(({
    visible,
    onClose,
    formData,
    handleInputChange,
    handleAddCrop,
    isSubmitting,
    userPhone
}) => (
    <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
    >
        <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.addCropModal}>
                <Text style={styles.modalTitle}>Add New Crop</Text>
                <Text style={styles.modalSubtitle}>नई फसल जोड़ें</Text>

                <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Crop Name *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter crop name (e.g., Wheat, Rice)"
                            value={formData.crop_name}
                            onChangeText={(value) => handleInputChange('crop_name', value)}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Price (₹) *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter price per unit"
                            value={formData.crop_price}
                            onChangeText={(value) => handleInputChange('crop_price', value)}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Quantity *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter available quantity"
                            value={formData.quantity}
                            onChangeText={(value) => handleInputChange('quantity', value)}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Unit *</Text>
                        <View style={styles.unitSelector}>
                            {units.map((unit) => (
                                <TouchableOpacity
                                    key={unit.value}
                                    style={[
                                        styles.unitOption,
                                        formData.unit === unit.value && styles.selectedUnit
                                    ]}
                                    onPress={() => handleInputChange('unit', unit.value)}
                                >
                                    <Text style={[
                                        styles.unitText,
                                        formData.unit === unit.value && styles.selectedUnitText
                                    ]}>
                                        {unit.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.phoneInfo}>
                        <Text style={styles.phoneInfoText}>
                            📱 Contact: {userPhone || 'Not available'}
                        </Text>
                        <Text style={styles.phoneInfoSubtext}>
                            (Contact number will be automatically set from your profile)
                        </Text>
                    </View>
                </ScrollView>

                <View style={styles.modalActions}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.addButtonModal, isSubmitting && styles.addButtonDisabled]}
                        onPress={handleAddCrop}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.addButtonText}>Add Crop</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    </Modal>
));

// --- Main Component ---

const SellCrops = ({ navigation }) => {
    const [myCrops, setMyCrops] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAddCropModalVisible, setIsAddCropModalVisible] = useState(false);
    const [userPhone, setUserPhone] = useState('');

    const [formData, setFormData] = useState({
        crop_name: '',
        crop_price: '',
        quantity: '',
        unit: 'quintal'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            await loadUserData();
            await loadMyCrops();
        };
        loadInitialData();
    }, []);

    const loadUserData = async () => {
        try {
            const phone = await AsyncStorage.getItem('userPhone');
            if (phone) setUserPhone(phone);
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const loadMyCrops = useCallback(async () => {
        setIsLoading(true);
        try {
            const no = await AsyncStorage.getItem('userPhone');
            const resp = await axios.get(`${NETWORK}app/farmer-crops/?phone=${no}`)
            console.log("resp for get : ", resp.data);


            if (resp.data) {
                setMyCrops(resp.data);
            } else {
                setMyCrops([])
            }
        } catch (error) {
            console.error('Error loading crops:', error);
            Alert.alert('Error', 'Failed to load your crops. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadMyCrops();
        setIsRefreshing(false);
    }, []);

    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const validateForm = useCallback(() => {
        if (!formData.crop_name.trim()) {
            Alert.alert('Validation Error', 'Please enter crop name');
            return false;
        }
        if (!formData.crop_price.trim() || isNaN(formData.crop_price) || parseFloat(formData.crop_price) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid price');
            return false;
        }
        if (!formData.quantity.trim() || isNaN(formData.quantity) || parseFloat(formData.quantity) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid quantity');
            return false;
        }
        return true;
    }, [formData]);

    const handleAddCrop = useCallback(async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const newCrop = {
                crop_name: formData.crop_name.trim(),
                crop_price: parseFloat(formData.crop_price),
                quantity: parseFloat(formData.quantity),
                unit: formData.unit,
                phone: userPhone,
            };

            const resp = await axios.post(`${NETWORK}app/farmer-crops/`, { ...newCrop });
            console.log("RESPONSE FOR CROP SELLING PAGE ______________", resp.data);

            // Use the response data from API which should include id and created_at
            const addedCrop = resp.data || {
                ...newCrop,
                id: Date.now().toString(), // Fallback ID
                created_at: new Date().toISOString() // Fallback date
            };

            const updatedCrops = [addedCrop, ...myCrops];
            setMyCrops(updatedCrops);

            setFormData({ crop_name: '', crop_price: '', quantity: '', unit: 'quintal' });
            setIsAddCropModalVisible(false);

            Alert.alert('Success!', 'Your crop has been added successfully.', [{ text: 'OK' }]);
        } catch (error) {
            console.error('Error adding crop:', error);
            Alert.alert('Error', 'Failed to add crop. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [validateForm, formData, userPhone, myCrops]);

    const handleDeleteCrop = useCallback((cropId) => {
        Alert.alert(
            'Delete Crop', 'Are you sure you want to delete this crop?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            const updatedCrops = myCrops.filter(crop => crop.id !== cropId);
                            setMyCrops(updatedCrops);
                            await AsyncStorage.setItem('myCrops', JSON.stringify(updatedCrops));
                        } catch (error) {
                            console.error('Error deleting crop:', error);
                            Alert.alert('Error', 'Failed to delete crop.');
                        }
                    }
                }
            ]
        );
    }, [myCrops]);

    const renderCropCard = useCallback(({ item }) => (
        <CropCard crop={item} onDelete={handleDeleteCrop} />
    ), [handleDeleteCrop]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>My Crops</Text>
                    <Text style={styles.headerSubtitle}>मेरी फसलें</Text>
                </View>
            </View>

            <View style={styles.addCropSection}>
                <TouchableOpacity
                    style={styles.addCropButton}
                    onPress={() => setIsAddCropModalVisible(true)}
                >
                    <Text style={styles.addCropButtonText}>+ Add New Crop to Sell</Text>
                    <Text style={styles.addCropButtonSubtext}>नई फसल बेचने के लिए जोड़ें</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading your crops...</Text>
                </View>
            ) : (
                <FlatList
                    data={myCrops}
                    renderItem={renderCropCard}
                    keyExtractor={item => item.id}
                    style={styles.cropsList}
                    contentContainerStyle={styles.cropsListContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>🌾 No crops listed yet</Text>
                            <Text style={styles.emptySubtext}>Add your first crop to start selling</Text>
                            <TouchableOpacity
                                style={styles.emptyActionButton}
                                onPress={() => setIsAddCropModalVisible(true)}
                            >
                                <Text style={styles.emptyActionButtonText}>+ Add Crop</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <AddCropModal
                visible={isAddCropModalVisible}
                onClose={() => setIsAddCropModalVisible(false)}
                formData={formData}
                handleInputChange={handleInputChange}
                handleAddCrop={handleAddCrop}
                isSubmitting={isSubmitting}
                userPhone={userPhone}
            />
        </SafeAreaView>
    );
};

export default SellCrops;

// --- Styles (Unchanged where possible, unused styles removed) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F8E9',
    },
    header: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 20,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 16,
        top: 16,
        zIndex: 1,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButtonText: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
    },
    headerContent: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#C8E6C9',
    },
    addCropSection: {
        paddingHorizontal: 16,
        paddingTop: 16, // Added padding top for spacing
        paddingBottom: 16,
    },
    addCropButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    addCropButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    addCropButtonSubtext: {
        fontSize: 14,
        color: '#C8E6C9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    cropsList: {
        flex: 1,
    },
    cropsListContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    cropCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    cropHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cropInfo: {
        flexDirection: 'row',
        alignItems: 'center', // Changed to center for better alignment
        flex: 1,
    },
    cropEmoji: {
        fontSize: 32,
        marginRight: 12,
    },
    cropDetails: {
        flex: 1,
    },
    cropName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF6F00',
    },
    unit: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    cropMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Changed for better spacing
        marginBottom: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0'
    },
    metricItem: {
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2E7D32',
    },
    cardActions: {
        flexDirection: 'row',
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: '#F44336',
    },
    deleteButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#D32F2F',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 24,
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginBottom: 20,
    },
    emptyActionButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    emptyActionButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    addCropModal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.9,
        paddingTop: 20,
    },
    modalTitle: {
        fontSize: 24,
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
    formContainer: {
        paddingHorizontal: 20,
        maxHeight: height * 0.6,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
    },
    unitSelector: {
        gap: 8,
    },
    unitOption: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#FAFAFA',
    },
    selectedUnit: {
        borderColor: '#4CAF50',
        backgroundColor: '#E8F5E8',
    },
    unitText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    selectedUnitText: {
        color: '#2E7D32',
        fontWeight: '600',
    },
    phoneInfo: {
        backgroundColor: '#F0F8FF',
        borderRadius: 12,
        padding: 16,
        marginTop: 10,
        marginBottom: 10,
    },
    phoneInfoText: {
        fontSize: 14,
        color: '#1976D2',
        fontWeight: '600',
        marginBottom: 4,
    },
    phoneInfoSubtext: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
    modalActions: {
        flexDirection: 'row',
        padding: 20,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    addButtonModal: { // Renamed from addButton to avoid conflict
        flex: 1,
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    addButtonDisabled: {
        backgroundColor: '#A5D6A7',
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});