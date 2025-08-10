import React, { useState, useEffect, useRef } from 'react';
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
    Animated,
    BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

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
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);

    // Sidebar animation
    const sidebarAnimation = useRef(new Animated.Value(-width * 0.8)).current;
    const overlayAnimation = useRef(new Animated.Value(0)).current;

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

        // Handle Android back button for sidebar
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [isSidebarVisible]);

    useEffect(() => {
        filterCrops();
    }, [selectedState, searchQuery, crops]);

    const handleBackPress = () => {
        if (isSidebarVisible) {
            closeSidebar();
            return true;
        }
        return false;
    };

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

    const openSidebar = () => {
        setIsSidebarVisible(true);
        Animated.parallel([
            Animated.timing(sidebarAnimation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(overlayAnimation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    };

    const closeSidebar = () => {
        Animated.parallel([
            Animated.timing(sidebarAnimation, {
                toValue: -width * 0.8,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(overlayAnimation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            setIsSidebarVisible(false);
        });
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'क्या आप वाकई साइन आउट करना चाहते हैं?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Clear stored data
                            await AsyncStorage.multiRemove([
                                'userProfile',
                                'userPhone',
                                'isProfileComplete'
                            ]);

                            // Close sidebar first
                            closeSidebar();

                            // Navigate to login screen after a brief delay
                            setTimeout(() => {
                                navigation.replace('PhoneAuth');
                            }, 300);
                        } catch (error) {
                            console.error('Sign out error:', error);
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleUserSettings = () => {
        closeSidebar();
        // Navigate to settings screen
        // navigation.navigate('UserSettings');
        Alert.alert(
            'User Settings',
            'Settings screen will be implemented here. You can edit your profile, change preferences, etc.',
            [{ text: 'OK' }]
        );
    };

    const handleMyOrders = () => {
        closeSidebar();
        // navigation.navigate('MyOrders');
        Alert.alert(
            'My Orders',
            'Orders screen will show your purchase history and current orders.',
            [{ text: 'OK' }]
        );
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
                        onPress: handleMyOrders
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

    const Sidebar = () => (
        <Modal
            visible={isSidebarVisible}
            transparent
            animationType="none"
            onRequestClose={closeSidebar}
        >
            <View style={styles.sidebarContainer}>
                {/* Overlay */}
                <Animated.View
                    style={[
                        styles.sidebarOverlay,
                        { opacity: overlayAnimation }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.overlayTouchable}
                        onPress={closeSidebar}
                        activeOpacity={1}
                    />
                </Animated.View>

                {/* Sidebar */}
                <Animated.View
                    style={[
                        styles.sidebar,
                        { transform: [{ translateX: sidebarAnimation }] }
                    ]}
                >
                    {/* User Profile Section */}
                    <View style={styles.sidebarHeader}>
                        <View style={styles.userAvatar}>
                            <Text style={styles.avatarText}>
                                {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>
                                {userProfile?.name || 'User'}
                            </Text>
                            <Text style={styles.userType}>
                                {userProfile?.userType === 'vendor' ? '🏪 Vendor' : '👨‍🌾 Farmer'}
                            </Text>
                            <Text style={styles.userPhone}>
                                📱 {userProfile?.contact || 'N/A'}
                            </Text>
                        </View>
                    </View>

                    {/* Menu Items */}
                    <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
                        <TouchableOpacity style={styles.menuItem} onPress={handleMyOrders}>
                            <Text style={styles.menuIcon}>📦</Text>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuText}>My Orders</Text>
                                <Text style={styles.menuSubtext}>View purchase history</Text>
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleUserSettings}>
                            <Text style={styles.menuIcon}>⚙️</Text>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuText}>Settings</Text>
                                <Text style={styles.menuSubtext}>Account & preferences</Text>
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            closeSidebar();
                            Alert.alert('Help & Support', 'Contact our support team for assistance.');
                        }}>
                            <Text style={styles.menuIcon}>❓</Text>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuText}>Help & Support</Text>
                                <Text style={styles.menuSubtext}>Get help & contact us</Text>
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            closeSidebar();
                            Alert.alert('About Kisan Dost', 'Version 1.0.0\nYour Smart Farming Companion\n\n© 2024 Kisan Dost. All rights reserved.');
                        }}>
                            <Text style={styles.menuIcon}>ℹ️</Text>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuText}>About</Text>
                                <Text style={styles.menuSubtext}>App info & version</Text>
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Sign Out Button */}
                    <View style={styles.sidebarFooter}>
                        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                            <Text style={styles.signOutIcon}>🚪</Text>
                            <Text style={styles.signOutText}>Sign Out</Text>
                        </TouchableOpacity>
                        <Text style={styles.appVersion}>Kisan Dost v1.0.0</Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
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
                <TouchableOpacity style={styles.menuButton} onPress={openSidebar}>
                    <Text style={styles.menuButtonText}>☰</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Crop Marketplace</Text>
                    <Text style={styles.headerSubtitle}>फसल बाज़ार</Text>
                </View>
                <View style={styles.headerRight} />
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
            <Sidebar />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    menuButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    menuButtonText: {
        fontSize: 20,
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
    headerRight: {
        width: 40,
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
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: '600',
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
    farmerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    farmerLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
    },
    farmerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2E7D32',
        flex: 1,
    },
    locationInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    locationText: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    quantityText: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    metaInfo: {
        marginBottom: 16,
    },
    harvestDate: {
        fontSize: 13,
        color: '#999',
    },
    buyButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        elevation: 2,
    },
    buyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        fontSize: 24,
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    // Sidebar Styles
    sidebarContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebarOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    overlayTouchable: {
        flex: 1,
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: width * 0.8,
        backgroundColor: '#fff',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    sidebarHeader: {
        backgroundColor: '#2E7D32',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    userType: {
        fontSize: 14,
        color: '#C8E6C9',
        marginBottom: 2,
    },
    userPhone: {
        fontSize: 12,
        color: '#C8E6C9',
    },
    sidebarMenu: {
        flex: 1,
        paddingTop: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    menuIcon: {
        fontSize: 24,
        width: 40,
        textAlign: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    menuSubtext: {
        fontSize: 12,
        color: '#666',
    },
    menuArrow: {
        fontSize: 20,
        color: '#ccc',
    },
    sidebarFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE5E5',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    signOutIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#D32F2F',
    },
    appVersion: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    filterModal: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    stateList: {
        maxHeight: 400,
    },
    stateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
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
        fontSize: 18,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    purchaseModal: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    purchaseTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 8,
    },
    purchaseSubtitle: {
        fontSize: 16,
        color: '#4CAF50',
        textAlign: 'center',
        marginBottom: 20,
    },
    purchaseDetails: {
        backgroundColor: '#F8F8F8',
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
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    purchaseNote: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 24,
        lineHeight: 18,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});