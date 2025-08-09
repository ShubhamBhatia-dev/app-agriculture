import React, { useState, useEffect } from 'react';
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
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const VendorMarketplaceScreen = ({ navigation }) => {
    const [crops, setCrops] = useState([]);
    const [filteredCrops, setFilteredCrops] = useState([]);
    const [selectedState, setSelectedState] = useState('All States');
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

    // Sample data - In real app, this would come from API
    const sampleCrops = [
        {
            id: '1',
            cropName: 'Wheat',
            cropNameHindi: 'गेहूं',
            farmerName: 'Rajesh Kumar',
            price: 2050,
            unit: 'per quintal',
            quantity: 50,
            state: 'Punjab',
            district: 'Ludhiana',
            quality: 'Grade A',
            harvestDate: '2024-01-15',
            contact: '9876543210',
            description: 'High quality wheat, organic farming',
            image: '🌾'
        },
        {
            id: '2',
            cropName: 'Rice',
            cropNameHindi: 'चावल',
            farmerName: 'Suresh Patel',
            price: 2200,
            unit: 'per quintal',
            quantity: 30,
            state: 'Haryana',
            district: 'Karnal',
            quality: 'Grade A+',
            harvestDate: '2024-01-10',
            contact: '9876543211',
            description: 'Basmati rice, premium quality',
            image: '🌾'
        },
        {
            id: '3',
            cropName: 'Sugarcane',
            cropNameHindi: 'गन्ना',
            farmerName: 'Amit Singh',
            price: 320,
            unit: 'per quintal',
            quantity: 100,
            state: 'Uttar Pradesh',
            district: 'Meerut',
            quality: 'Grade A',
            harvestDate: '2024-01-12',
            contact: '9876543212',
            description: 'Fresh sugarcane with high sugar content',
            image: '🎋'
        },
        {
            id: '4',
            cropName: 'Cotton',
            cropNameHindi: 'कपास',
            farmerName: 'Prakash Joshi',
            price: 5800,
            unit: 'per quintal',
            quantity: 20,
            state: 'Gujarat',
            district: 'Bharuch',
            quality: 'Grade B+',
            harvestDate: '2024-01-08',
            contact: '9876543213',
            description: 'Long staple cotton, good quality',
            image: '🤍'
        },
        {
            id: '5',
            cropName: 'Maize',
            cropNameHindi: 'मक्का',
            farmerName: 'Ravi Sharma',
            price: 1800,
            unit: 'per quintal',
            quantity: 75,
            state: 'Maharashtra',
            district: 'Nashik',
            quality: 'Grade A',
            harvestDate: '2024-01-14',
            contact: '9876543214',
            description: 'Yellow maize, moisture content 14%',
            image: '🌽'
        },
        {
            id: '6',
            cropName: 'Soybean',
            cropNameHindi: 'सोयाबीन',
            farmerName: 'Mahesh Patil',
            price: 4200,
            unit: 'per quintal',
            quantity: 40,
            state: 'Madhya Pradesh',
            district: 'Indore',
            quality: 'Grade A',
            harvestDate: '2024-01-11',
            contact: '9876543215',
            description: 'Organic soybean, high protein content',
            image: '🟤'
        }
    ];

    const indianStates = [
        'All States', 'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat',
        'Haryana', 'Himachal Pradesh', 'Karnataka', 'Kerala', 'Madhya Pradesh',
        'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
        'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
    ];

    useEffect(() => {
        loadUserProfile();
        loadCrops();
    }, []);

    useEffect(() => {
        filterCrops();
    }, [selectedState, searchQuery, crops]);

    const loadUserProfile = async () => {
        try {
            const profile = await AsyncStorage.getItem('userProfile');
            if (profile) {
                setUserProfile(JSON.parse(profile));
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    };

    const loadCrops = async () => {
        setIsLoading(true);
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            setCrops(sampleCrops);
        } catch (error) {
            console.error('Error loading crops:', error);
            Alert.alert('Error', 'Failed to load crops. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = async () => {
        setIsRefreshing(true);
        await loadCrops();
        setIsRefreshing(false);
    };

    const filterCrops = () => {
        let filtered = crops;

        // Filter by state
        if (selectedState !== 'All States') {
            filtered = filtered.filter(crop => crop.state === selectedState);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(crop =>
                crop.cropName.toLowerCase().includes(query) ||
                crop.cropNameHindi.includes(query) ||
                crop.farmerName.toLowerCase().includes(query) ||
                crop.state.toLowerCase().includes(query) ||
                crop.district.toLowerCase().includes(query)
            );
        }

        setFilteredCrops(filtered);
    };

    const handleBuyPress = (crop) => {
        setSelectedCrop(crop);
        setIsPurchaseModalVisible(true);
    };

    const confirmPurchase = async () => {
        try {
            // Here you would typically make an API call to process the purchase
            const purchaseData = {
                cropId: selectedCrop.id,
                cropName: selectedCrop.cropName,
                farmerName: selectedCrop.farmerName,
                price: selectedCrop.price,
                quantity: selectedCrop.quantity,
                purchaseDate: new Date().toISOString(),
                vendorInfo: userProfile
            };

            // Save purchase to AsyncStorage (in real app, send to server)
            const existingPurchases = await AsyncStorage.getItem('purchases');
            const purchases = existingPurchases ? JSON.parse(existingPurchases) : [];
            purchases.push(purchaseData);
            await AsyncStorage.setItem('purchases', JSON.stringify(purchases));

            setIsPurchaseModalVisible(false);
            Alert.alert(
                'Purchase Confirmed!',
                `You have successfully placed an order for ${selectedCrop.cropName} from ${selectedCrop.farmerName}. The farmer will contact you soon.`,
                [
                    {
                        text: 'View Orders',
                        onPress: () => {
                            // navigation.navigate('Orders');
                            console.log('Navigate to orders');
                        }
                    },
                    { text: 'Continue Shopping', style: 'cancel' }
                ]
            );
        } catch (error) {
            console.error('Purchase error:', error);
            Alert.alert('Error', 'Failed to place order. Please try again.');
        }
    };

    const CropCard = ({ crop }) => (
        <View style={styles.cropCard}>
            <View style={styles.cropHeader}>
                <View style={styles.cropInfo}>
                    <Text style={styles.cropEmoji}>{crop.image}</Text>
                    <View style={styles.cropDetails}>
                        <Text style={styles.cropName}>{crop.cropName}</Text>
                        <Text style={styles.cropNameHindi}>{crop.cropNameHindi}</Text>
                        <Text style={styles.qualityBadge}>{crop.quality}</Text>
                    </View>
                </View>
                <View style={styles.priceContainer}>
                    <Text style={styles.price}>₹{crop.price.toLocaleString('en-IN')}</Text>
                    <Text style={styles.unit}>{crop.unit}</Text>
                </View>
            </View>

            <View style={styles.farmerInfo}>
                <Text style={styles.farmerLabel}>👨‍🌾 Farmer:</Text>
                <Text style={styles.farmerName}>{crop.farmerName}</Text>
            </View>

            <View style={styles.locationInfo}>
                <Text style={styles.locationText}>📍 {crop.district}, {crop.state}</Text>
                <Text style={styles.quantityText}>📦 {crop.quantity} quintals available</Text>
            </View>

            <Text style={styles.description}>{crop.description}</Text>

            <View style={styles.metaInfo}>
                <Text style={styles.harvestDate}>🗓️ Harvested: {crop.harvestDate}</Text>
            </View>

            <TouchableOpacity
                style={styles.buyButton}
                onPress={() => handleBuyPress(crop)}
            >
                <Text style={styles.buyButtonText}>🛒 BUY NOW</Text>
            </TouchableOpacity>
        </View>
    );

    const FilterModal = () => (
        <Modal
            visible={isFilterModalVisible}
            transparent
            animationType="slide"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.filterModal}>
                    <Text style={styles.modalTitle}>Filter by State</Text>
                    <ScrollView style={styles.stateList}>
                        {indianStates.map((state) => (
                            <TouchableOpacity
                                key={state}
                                style={[
                                    styles.stateItem,
                                    selectedState === state && styles.selectedState
                                ]}
                                onPress={() => {
                                    setSelectedState(state);
                                    setIsFilterModalVisible(false);
                                }}
                            >
                                <Text style={[
                                    styles.stateText,
                                    selectedState === state && styles.selectedStateText
                                ]}>
                                    {state}
                                </Text>
                                {selectedState === state && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setIsFilterModalVisible(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const PurchaseModal = () => (
        <Modal
            visible={isPurchaseModalVisible}
            transparent
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.purchaseModal}>
                    <Text style={styles.purchaseTitle}>Confirm Purchase</Text>
                    <Text style={styles.purchaseSubtitle}>क्या आप वाकई खरीदना चाहते हैं?</Text>

                    {selectedCrop && (
                        <View style={styles.purchaseDetails}>
                            <Text style={styles.purchaseItem}>
                                <Text style={styles.purchaseLabel}>Crop: </Text>
                                {selectedCrop.cropName} ({selectedCrop.cropNameHindi})
                            </Text>
                            <Text style={styles.purchaseItem}>
                                <Text style={styles.purchaseLabel}>Farmer: </Text>
                                {selectedCrop.farmerName}
                            </Text>
                            <Text style={styles.purchaseItem}>
                                <Text style={styles.purchaseLabel}>Price: </Text>
                                ₹{selectedCrop.price.toLocaleString('en-IN')} {selectedCrop.unit}
                            </Text>
                            <Text style={styles.purchaseItem}>
                                <Text style={styles.purchaseLabel}>Available: </Text>
                                {selectedCrop.quantity} quintals
                            </Text>
                            <Text style={styles.purchaseItem}>
                                <Text style={styles.purchaseLabel}>Location: </Text>
                                {selectedCrop.district}, {selectedCrop.state}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.purchaseNote}>
                        The farmer will contact you directly to discuss quantity,
                        delivery, and payment terms.
                    </Text>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setIsPurchaseModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={confirmPurchase}
                        >
                            <Text style={styles.confirmButtonText}>Confirm Purchase</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Crop Marketplace</Text>
                <Text style={styles.headerSubtitle}>फसल बाज़ार</Text>
            </View>

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search crops, farmers..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <Text style={styles.searchIcon}>🔍</Text>
                </View>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setIsFilterModalVisible(true)}
                >
                    <Text style={styles.filterIcon}>🗂️</Text>
                </TouchableOpacity>
            </View>

            {/* Selected Filter Display */}
            {selectedState !== 'All States' && (
                <View style={styles.activeFilter}>
                    <Text style={styles.activeFilterText}>📍 {selectedState}</Text>
                    <TouchableOpacity onPress={() => setSelectedState('All States')}>
                        <Text style={styles.clearFilter}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Stats */}
            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                    {filteredCrops.length} crops available
                    {selectedState !== 'All States' && ` in ${selectedState}`}
                </Text>
            </View>

            {/* Crops List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading crops...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredCrops}
                    renderItem={({ item }) => <CropCard crop={item} />}
                    keyExtractor={item => item.id}
                    style={styles.cropsList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            colors={['#4CAF50']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>😔 No crops found</Text>
                            <Text style={styles.emptySubtext}>
                                Try adjusting your search or filter criteria
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Modals */}
            <FilterModal />
            <PurchaseModal />
        </SafeAreaView>
    );
};

export default VendorMarketplaceScreen;

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
    searchContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        paddingVertical: 12,
    },
    searchIcon: {
        fontSize: 18,
    },
    filterButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    filterIcon: {
        fontSize: 20,
    },
    activeFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E8',
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    activeFilterText: {
        color: '#2E7D32',
        fontWeight: '600',
        marginRight: 8,
    },
    clearFilter: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: 'bold',
    },
    statsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    statsText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
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
        paddingHorizontal: 16,
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
        marginBottom: 12,
    },
    cropInfo: {
        flexDirection: 'row',
        alignItems: 'center',
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
        marginBottom: 2,
    },
    cropNameHindi: {
        fontSize: 14,
        color: '#4CAF50',
        marginBottom: 4,
    },
    qualityBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#E8F5E8',
        color: '#2E7D32',
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#F44336',
        marginBottom: 2,
    },
    unit: {
        fontSize: 12,
        color: '#666',
    },
    farmerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    farmerLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 4,
    },
    farmerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    locationInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    locationText: {
        fontSize: 14,
        color: '#666',
    },
    quantityText: {
        fontSize: 14,
        color: '#666',
    },
    description: {
        fontSize: 14,
        color: '#555',
        lineHeight: 18,
        marginBottom: 8,
    },
    metaInfo: {
        marginBottom: 12,
    },
    harvestDate: {
        fontSize: 12,
        color: '#999',
    },
    buyButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 2,
    },
    buyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterModal: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: width * 0.85,
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 16,
    },
    stateList: {
        maxHeight: 300,
    },
    stateItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedState: {
        backgroundColor: '#E8F5E8',
    },
    stateText: {
        fontSize: 16,
        color: '#333',
    },
    selectedStateText: {
        color: '#2E7D32',
        fontWeight: '600',
    },
    checkmark: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    purchaseModal: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: width * 0.9,
        maxHeight: '80%',
    },
    purchaseTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 4,
    },
    purchaseSubtitle: {
        fontSize: 16,
        color: '#4CAF50',
        textAlign: 'center',
        marginBottom: 20,
    },
    purchaseDetails: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    purchaseItem: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
        lineHeight: 20,
    },
    purchaseLabel: {
        fontWeight: '600',
        color: '#2E7D32',
    },
    purchaseNote: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 18,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: '#4CAF50',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});