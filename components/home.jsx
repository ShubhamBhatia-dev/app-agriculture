import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Dimensions,
    Alert,
    Modal,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ai from '../assets/ai.png';

const { width, height } = Dimensions.get('window');

const Home = ({ navigation }) => {
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [sidebarAnimation] = useState(new Animated.Value(-width * 0.8));
    const [weatherData, setWeatherData] = useState({
        location: 'Shimla, Himachal Pradesh',
        temperature: '22°C',
        condition: 'Partly Cloudy',
        humidity: '65%',
        windSpeed: '12 km/h',
        icon: '⛅'
    });

    const toggleSidebar = () => {
        if (sidebarVisible) {
            // Hide sidebar
            Animated.timing(sidebarAnimation, {
                toValue: -width * 0.8,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setSidebarVisible(false));
        } else {
            // Show sidebar
            setSidebarVisible(true);
            Animated.timing(sidebarAnimation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    const handleSidebarItemPress = (screen) => {
        toggleSidebar();
        setTimeout(() => {
            navigation.navigate(screen);
        }, 300);
    };

    const handleChatPress = () => {
        navigation.navigate('Chat');
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => {
                        AsyncStorage.clear();
                        navigation.replace('Number');
                    },
                },
            ]
        );
    };

    // Simulate fetching weather data (replace with actual API call)
    useEffect(() => {
        const fetchWeatherData = () => {
            setWeatherData({
                location: 'Shimla, Himachal Pradesh',
                temperature: '22°C',
                condition: 'Partly Cloudy',
                humidity: '65%',
                windSpeed: '12 km/h',
                icon: '⛅'
            });
        };

        fetchWeatherData();
    }, []);

    const features = [
        {
            id: 1,
            title: 'Weather Updates',
            subtitle: 'मौसम की जानकारी',
            icon: '🌤️',
            description: 'Get real-time weather forecasts'
        },
        {
            id: 2,
            title: 'Crop Advisory',
            subtitle: 'फसल सलाह',
            icon: '🌾',
            description: 'Expert advice for your crops'
        },
        {
            id: 3,
            title: 'Market Prices',
            subtitle: 'बाज़ार भाव',
            icon: '💰',
            description: 'Latest market rates'
        },
        {
            id: 4,
            title: 'Pest Control',
            subtitle: 'कीट नियंत्रण',
            icon: '🐛',
            description: 'Identify and control pests'
        }
    ];

    const sidebarItems = [
        {
            id: 1,
            title: 'Profile Settings',
            subtitle: 'प्रोफाइल सेटिंग्स',
            icon: '👤',
            screen: 'userSettings'
        },
        {
            id: 2,
            title: 'Language',
            subtitle: 'भाषा',
            icon: '🌐',
            screen: 'LanguageSettings'
        },
        {
            id: 3,
            title: 'Notifications',
            subtitle: 'सूचनाएं',
            icon: '🔔',
            screen: 'NotificationSettings'
        },
        {
            id: 4,
            title: 'Help & Support',
            subtitle: 'सहायता',
            icon: '❓',
            screen: 'Help'
        },
        {
            id: 5,
            title: 'About',
            subtitle: 'के बारे में',
            icon: 'ℹ️',
            screen: 'About'
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Header with Menu and Sign Out Button */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={toggleSidebar}
                    >
                        <Text style={styles.menuIcon}>☰</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Kisan Dost</Text>
                        <Text style={styles.headerSubtitle}>किसान दोस्त</Text>
                    </View>

                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Weather Section */}
                <View style={styles.weatherSection}>
                    <View style={styles.weatherHeader}>
                        <Text style={styles.weatherTitle}>Current Weather</Text>
                        <Text style={styles.weatherSubtitle}>मौजूदा मौसम</Text>
                    </View>

                    <View style={styles.weatherContent}>
                        <View style={styles.weatherMainInfo}>
                            <Text style={styles.weatherIcon}>{weatherData.icon}</Text>
                            <View style={styles.weatherTextContainer}>
                                <Text style={styles.temperature}>{weatherData.temperature}</Text>
                                <Text style={styles.weatherCondition}>{weatherData.condition}</Text>
                                <Text style={styles.location}>{weatherData.location}</Text>
                            </View>
                        </View>

                        <View style={styles.weatherDetails}>
                            <View style={styles.weatherDetailItem}>
                                <Text style={styles.weatherDetailIcon}>💧</Text>
                                <Text style={styles.weatherDetailLabel}>Humidity</Text>
                                <Text style={styles.weatherDetailValue}>{weatherData.humidity}</Text>
                            </View>
                            <View style={styles.weatherDetailItem}>
                                <Text style={styles.weatherDetailIcon}>💨</Text>
                                <Text style={styles.weatherDetailLabel}>Wind Speed</Text>
                                <Text style={styles.weatherDetailValue}>{weatherData.windSpeed}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* AI Chat Section */}
                <TouchableOpacity style={styles.aiChatContainer} onPress={handleChatPress}>
                    <View style={styles.aiChatContent}>
                        <View style={styles.aiImageContainer}>
                            <Image source={ai} style={styles.aiImage} />
                        </View>
                        <View style={styles.aiTextContainer}>
                            <Text style={styles.aiChatTitle}>CHAT WITH ME</Text>
                            <Text style={styles.aiChatSubtitle}>मुझसे बात करें</Text>
                            <Text style={styles.aiChatDescription}>
                                Ask questions about farming, weather, crops, and get instant answers in Hindi, Punjabi, and other languages
                            </Text>
                            <View style={styles.chatButton}>
                                <Text style={styles.chatButtonText}>Start Chatting →</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Features Grid */}
                <View style={styles.featuresSection}>
                    <Text style={styles.sectionTitle}>What I can help with</Text>
                    <Text style={styles.sectionSubtitle}>मैं आपकी कैसे मदद कर सकता हूं</Text>

                    <View style={styles.featuresGrid}>
                        {features.map((feature) => (
                            <TouchableOpacity key={feature.id} style={styles.featureCard}>
                                <Text style={styles.featureIcon}>{feature.icon}</Text>
                                <Text style={styles.featureTitle}>{feature.title}</Text>
                                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                                <Text style={styles.featureDescription}>{feature.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Helping Farmers Across India</Text>
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>50K+</Text>
                            <Text style={styles.statLabel}>Farmers</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>10+</Text>
                            <Text style={styles.statLabel}>Languages</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>24/7</Text>
                            <Text style={styles.statLabel}>Support</Text>
                        </View>
                    </View>
                </View>

                {/* Bottom spacing */}
                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Sidebar Modal */}
            <Modal
                visible={sidebarVisible}
                transparent={true}
                animationType="none"
                onRequestClose={toggleSidebar}
            >
                <View style={styles.sidebarOverlay}>
                    <TouchableOpacity
                        style={styles.sidebarBackground}
                        activeOpacity={1}
                        onPress={toggleSidebar}
                    />
                    <Animated.View
                        style={[
                            styles.sidebar,
                            { transform: [{ translateX: sidebarAnimation }] }
                        ]}
                    >
                        {/* Sidebar Header */}
                        <View style={styles.sidebarHeader}>
                            <View style={styles.sidebarProfileContainer}>
                                <View style={styles.sidebarProfileImage}>
                                    <Text style={styles.sidebarProfileInitials}>RS</Text>
                                </View>
                                <View style={styles.sidebarProfileInfo}>
                                    <Text style={styles.sidebarProfileName}>राम सिंह</Text>
                                    <Text style={styles.sidebarProfileSubtitle}>Ram Singh</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.closeSidebarButton}
                                onPress={toggleSidebar}
                            >
                                <Text style={styles.closeSidebarText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Sidebar Items */}
                        <ScrollView style={styles.sidebarContent}>
                            {sidebarItems.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.sidebarItem}
                                    onPress={() => handleSidebarItemPress(item.screen)}
                                >
                                    <Text style={styles.sidebarItemIcon}>{item.icon}</Text>
                                    <View style={styles.sidebarItemTextContainer}>
                                        <Text style={styles.sidebarItemTitle}>{item.title}</Text>
                                        <Text style={styles.sidebarItemSubtitle}>{item.subtitle}</Text>
                                    </View>
                                    <Text style={styles.sidebarItemArrow}>→</Text>
                                </TouchableOpacity>
                            ))}

                            {/* Divider */}
                            <View style={styles.sidebarDivider} />

                            {/* Sign Out in Sidebar */}
                            <TouchableOpacity
                                style={styles.sidebarSignOutItem}
                                onPress={() => {
                                    toggleSidebar();
                                    setTimeout(handleSignOut, 300);
                                }}
                            >
                                <Text style={styles.sidebarSignOutIcon}>🚪</Text>
                                <View style={styles.sidebarItemTextContainer}>
                                    <Text style={styles.sidebarSignOutTitle}>Sign Out</Text>
                                    <Text style={styles.sidebarSignOutSubtitle}>साइन आउट</Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Sidebar Footer */}
                        <View style={styles.sidebarFooter}>
                            <Text style={styles.sidebarFooterText}>Kisan Dost v1.0</Text>
                            <Text style={styles.sidebarFooterSubtext}>Made with ❤️ for farmers</Text>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Home;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F8E9',
    },
    header: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 20,
        paddingVertical: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    menuButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    menuIcon: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerTextContainer: {
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#C8E6C9',
        textAlign: 'center',
    },
    signOutButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    signOutText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    weatherSection: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        overflow: 'hidden',
    },
    weatherHeader: {
        backgroundColor: '#E3F2FD',
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    weatherTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1976D2',
        marginBottom: 2,
    },
    weatherSubtitle: {
        fontSize: 14,
        color: '#42A5F5',
    },
    weatherContent: {
        padding: 20,
    },
    weatherMainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    weatherIcon: {
        fontSize: 60,
        marginRight: 20,
    },
    weatherTextContainer: {
        flex: 1,
    },
    temperature: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    weatherCondition: {
        fontSize: 18,
        color: '#4CAF50',
        marginBottom: 4,
    },
    location: {
        fontSize: 14,
        color: '#666',
    },
    weatherDetails: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
    },
    weatherDetailItem: {
        alignItems: 'center',
        flex: 1,
    },
    weatherDetailIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    weatherDetailLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    weatherDetailValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    aiChatContainer: {
        margin: 16,
        backgroundColor: '#fff',
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 4.65,
        overflow: 'hidden',
    },
    aiChatContent: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
    },
    aiImageContainer: {
        marginRight: 20,
    },
    aiImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#4CAF50',
    },
    aiTextContainer: {
        flex: 1,
    },
    aiChatTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    aiChatSubtitle: {
        fontSize: 16,
        color: '#4CAF50',
        marginBottom: 8,
    },
    aiChatDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
        marginBottom: 12,
    },
    chatButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    chatButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    featuresSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 16,
        color: '#4CAF50',
        textAlign: 'center',
        marginBottom: 20,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    featureCard: {
        width: (width - 48) / 2,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.22,
    },
    featureIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 4,
    },
    featureSubtitle: {
        fontSize: 12,
        color: '#4CAF50',
        textAlign: 'center',
        marginBottom: 6,
    },
    featureDescription: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        lineHeight: 14,
    },
    statsSection: {
        margin: 16,
        backgroundColor: '#2E7D32',
        borderRadius: 16,
        padding: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: '#C8E6C9',
    },
    // Sidebar Styles
    sidebarOverlay: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebarBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sidebar: {
        width: width * 0.8,
        maxWidth: 300,
        backgroundColor: '#fff',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    sidebarHeader: {
        backgroundColor: '#2E7D32',
        paddingTop: 20,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    sidebarProfileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sidebarProfileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sidebarProfileInitials: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    sidebarProfileInfo: {
        flex: 1,
    },
    sidebarProfileName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    sidebarProfileSubtitle: {
        fontSize: 14,
        color: '#C8E6C9',
    },
    closeSidebarButton: {
        padding: 8,
    },
    closeSidebarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sidebarContent: {
        flex: 1,
        paddingTop: 20,
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    sidebarItemIcon: {
        fontSize: 24,
        marginRight: 16,
        width: 30,
        textAlign: 'center',
    },
    sidebarItemTextContainer: {
        flex: 1,
    },
    sidebarItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    sidebarItemSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    sidebarItemArrow: {
        fontSize: 16,
        color: '#999',
    },
    sidebarDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 10,
        marginHorizontal: 20,
    },
    sidebarSignOutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFEBEE',
    },
    sidebarSignOutIcon: {
        fontSize: 24,
        marginRight: 16,
        width: 30,
        textAlign: 'center',
    },
    sidebarSignOutTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#D32F2F',
        marginBottom: 2,
    },
    sidebarSignOutSubtitle: {
        fontSize: 14,
        color: '#F44336',
    },
    sidebarFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        alignItems: 'center',
    },
    sidebarFooterText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    sidebarFooterSubtext: {
        fontSize: 10,
        color: '#BBB',
    },
});