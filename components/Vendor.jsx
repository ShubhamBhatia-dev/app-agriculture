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
import axios from 'axios';
import { NETWORK } from './constants';

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

    // Sidebar animation with proper initial values
    const sidebarAnimation = useRef(new Animated.Value(-width * 0.8)).current;
    const overlayAnimation = useRef(new Animated.Value(0)).current;



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

    // Separate useEffect for BackHandler to avoid dependency issues
    useEffect(() => {
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
            } else {
                // Set default user profile if none exists
                setUserProfile({
                    name: 'Demo User',
                    userType: 'vendor',
                    contact: '9876543210'
                });
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Set fallback profile
            setUserProfile({
                name: 'Demo User',
                userType: 'vendor',
                contact: '9876543210'
            });
        }
    };

    const loadCrops = async () => {
        setIsLoading(true);
        try {
            const crops = await axios.get(`${NETWORK}app/farmer-crops/`);
            console.log('Crops loaded:', crops.data);
            setCrops(crops.data);
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

        if (selectedState !== 'All States') {
            filtered = filtered.filter(crop => String(crop.farmer.state).toLowerCase() === String(selectedState).toLowerCase());
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(crop =>
                crop.crop_name.toLowerCase().includes(query) ||

                crop.farmer.name.toLowerCase().includes(query) ||
                crop.farmer.state.toLowerCase().includes(query) ||
                crop.farmer.district.toLowerCase().includes(query)
            );
        }

        setFilteredCrops(filtered);
    };

    const openSidebar = () => {
        setIsSidebarVisible(true);

        // Animate to open position
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
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.clear();
                            closeSidebar();

                            Alert.alert('Signed Out', 'You have been signed out successfully.');
                            navigation.replace('Number')
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
        navigation.navigate('userSettings');
    };

    const handleMyOrders = () => {
        closeSidebar();
        navigation.navigate('Talking');

    };

    const handleBuyPress = async (farmer) => {

        let vendor = await AsyncStorage.getItem("userProfile")
        vendor = JSON.parse(vendor)
        const response = await axios.get(`${NETWORK}app/chat-history`, {
            params: {
                farmer_name: farmer.name,
                vendor_name: vendor.name,
                farmer_phoneNumber: farmer.phone,
                vendor_phoneNumber: vendor.phone

            }
        })
        handleMyOrders();

        console.log(response.data)

    };

    const confirmPurchase = async () => {
        try {
            const purchaseData = {
                cropId: selectedCrop.id,
                cropName: selectedCrop.cropName,
                farmerName: selectedCrop.farmerName,
                price: selectedCrop.price,
                quantity: selectedCrop.quantity,
                purchaseDate: new Date().toISOString(),
                vendorInfo: userProfile
            };

            const existingPurchases = await AsyncStorage.getItem('purchases');
            const purchases = existingPurchases ? JSON.parse(existingPurchases) : [];
            purchases.push(purchaseData);
            await AsyncStorage.setItem('purchases', JSON.stringify(purchases));

            setIsPurchaseModalVisible(false);
            Alert.alert(
                'Purchase Confirmed!',
                `You have successfully placed an order for ${selectedCrop.cropName} from ${selectedCrop.farmerName}. The farmer will contact you soon.`,
                [
                    { text: 'View Orders', onPress: handleMyOrders },
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
                        <Text style={styles.cropName}>{crop.crop_name}</Text>


                    </View>
                </View>
                <View style={styles.priceContainer}>
                    <Text style={styles.price}>₹{crop.crop_price.toLocaleString('en-IN')}</Text>
                    <Text style={styles.unit}>{crop.unit}</Text>
                </View>
            </View>

            <View style={styles.farmerInfo}>
                <Text style={styles.farmerLabel}>👨‍🌾 Farmer:</Text>
                <Text style={styles.farmerName}>{crop.farmer.name}</Text>
            </View>

            <View style={styles.locationInfo}>
                <Text style={styles.locationText}>📍 {crop.farmer.district}, {crop.farmer.state}</Text>
                <Text style={styles.quantityText}>📦 {crop.quantity} {crop.unit} </Text>
            </View>

            <Text style={styles.description}>{crop.description}</Text>

            <View style={styles.metaInfo}>
                <Text style={styles.harvestDate}>🗓️ UPLOADED : {crop.created_at.slice(0, 10)}</Text>
            </View>

            <TouchableOpacity
                style={styles.buyButton}
                onPress={() => handleBuyPress(crop.farmer)}
            >
                <Text style={styles.buyButtonText}>CHAT NOW</Text>
            </TouchableOpacity>
        </View>
    );

    // Sidebar Components -------------------------------------------------------->

    const Sidebar = () => (
        <Modal
            visible={isSidebarVisible}
            transparent={true}
            animationType="none"
            onRequestClose={closeSidebar}
            statusBarTranslucent={true}
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

                        <View style={styles.userInfo}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {userProfile?.name || 'User'}
                            </Text>
                            <Text style={styles.userType}>
                                {userProfile?.userType === 'vendor' ? '🏪 Vendor' : '👨‍🌾 Farmer'}
                            </Text>
                            <Text style={styles.userPhone}>
                                📱 {userProfile?.phone || 'N/A'}
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
                            Alert.alert('About Kisan Dost', 'Version 1.0.0\nYour Smart Farming Companion\n\n');
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
            <View style={styles.modalPurchaseOverlay}>
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
                                ₹{selectedCrop.crop_price.toLocaleString('en-IN')} {selectedCrop.unit}
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
                            <Text style={styles.confirmButtonText}>Connect To Farmer</Text>
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
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={openSidebar}
                    activeOpacity={0.7}
                >
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
                    contentContainerStyle={{ paddingBottom: 16 }}
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
    },
    menuButtonText: {
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
        padding: 20,
        marginTop: height * 0.1,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
    // Sidebar Styles
    sidebarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        flexDirection: 'row',
    },
    sidebarOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    overlayTouchable: {
        flex: 1,
    },
    sidebar: {
        width: width * 0.8,
        height: '100%',
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        top: 0,
        left: 0,
        paddingTop: StatusBar.currentHeight || 0,
    },
    sidebarHeader: {
        padding: 20,
        backgroundColor: '#F1F8E9',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
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
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    userType: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    userPhone: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    sidebarMenu: {
        flex: 1,
        paddingVertical: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    menuIcon: {
        fontSize: 22,
        marginRight: 20,
        width: 30,
        textAlign: 'center',
    },
    menuTextContainer: {
        flex: 1,
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    menuSubtext: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    menuArrow: {
        fontSize: 20,
        color: '#ccc',
    },
    sidebarFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        marginBottom: 10,
    },
    signOutIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    signOutText: {
        color: '#D32F2F',
        fontSize: 16,
        fontWeight: 'bold',
    },
    appVersion: {
        textAlign: 'center',
        fontSize: 12,
        color: '#aaa',
    },
    // Filter Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    filterModal: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    stateList: {
        flexGrow: 0,
    },
    stateItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedState: {
        backgroundColor: '#E8F5E8',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginHorizontal: -12,
    },
    stateText: {
        fontSize: 18,
        color: '#555',
    },
    selectedStateText: {
        color: '#2E7D32',
        fontWeight: 'bold',
    },
    checkmark: {
        fontSize: 18,
        color: '#4CAF50',
    },
    closeButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Purchase Modal Styles
    modalPurchaseOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    purchaseModal: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
    },
    purchaseTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 8,
    },
    purchaseSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    purchaseDetails: {
        alignSelf: 'stretch',
        marginBottom: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#eee',
        paddingVertical: 16,
    },
    purchaseItem: {
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
        lineHeight: 22,
    },
    purchaseLabel: {
        fontWeight: 'bold',
        color: '#555',
    },
    purchaseNote: {
        fontSize: 13,
        color: '#757575',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 24,
        lineHeight: 18,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#999',
        alignItems: 'center',
        marginRight: 8,
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: 'bold',
        fontSize: 16,
    },
    confirmButton: {
        flex: 1.5,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        marginLeft: 8,
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default VendorMarketplaceScreen;