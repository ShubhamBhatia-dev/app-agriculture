import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    Image,
    ScrollView,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const UserSelectionScreen = ({ navigation }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const scaleValue = new Animated.Value(1);

    const handleUserSelection = (userType) => {
        setSelectedUser(userType);
        // Store the selected user type in AsyncStorage
        AsyncStorage.setItem('user_type', userType);

        // Animation effect
        Animated.sequence([
            Animated.timing(scaleValue, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        // Navigate after a brief delay
        setTimeout(() => {
            navigation.replace('Address', { userType });
            console.log(`Selected user type: ${userType}`);
        }, 2000);
    };

    const UserCard = ({ type, title, subtitle, description, features, icon, onPress, isSelected }) => (
        <Animated.View style={[
            styles.userCard,
            isSelected && styles.selectedCard,
            { transform: [{ scale: isSelected ? scaleValue : 1 }] }
        ]}>
            <TouchableOpacity
                style={styles.cardTouchable}
                onPress={() => onPress(type)}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: type === 'farmer' ? '#E8F5E8' : '#E3F2FD' }]}>
                        <Text style={styles.iconText}>{icon}</Text>
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.cardTitle}>{title}</Text>
                        <Text style={[styles.cardSubtitle, { color: type === 'farmer' ? '#4CAF50' : '#2196F3' }]}>
                            {subtitle}
                        </Text>
                    </View>
                    {isSelected && (
                        <View style={[styles.checkmark, { backgroundColor: type === 'farmer' ? '#4CAF50' : '#2196F3' }]}>
                            <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.cardDescription}>{description}</Text>

                <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>What you can do:</Text>
                    {features.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <Text style={styles.featureBullet}>•</Text>
                            <Text style={styles.featureText}>{feature}</Text>
                        </View>
                    ))}
                </View>

                <View style={[
                    styles.selectButton,
                    { backgroundColor: type === 'farmer' ? '#4CAF50' : '#2196F3' },
                    isSelected && styles.selectedButton
                ]}>
                    <Text style={styles.selectButtonText}>
                        {isSelected ? 'Selected!' : `I am a ${title}`}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Welcome to Kisan Dost</Text>
                <Text style={styles.headerSubtitle}>किसान दोस्त में आपका स्वागत है</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Introduction */}
                <View style={styles.introSection}>
                    <Text style={styles.introTitle}>Who are you?</Text>
                    <Text style={styles.introSubtitle}>आप कौन हैं?</Text>
                    <Text style={styles.introDescription}>
                        Choose your role to get personalized features and recommendations
                    </Text>
                </View>

                {/* User Selection Cards */}
                <View style={styles.cardsContainer}>
                    <UserCard
                        type="farmer"
                        title="Farmer"
                        subtitle="किसान"
                        description="I grow crops and need farming guidance, weather updates, and market information"
                        features={[
                            "Get crop advisory and farming tips",
                            "Receive weather forecasts",
                            "Check market prices for crops",
                            "Pest and disease identification",
                            "Government schemes information"
                        ]}
                        icon="👨‍🌾"
                        onPress={handleUserSelection}
                        isSelected={selectedUser === 'farmer'}
                    />

                    <UserCard
                        type="vendor"
                        title="Vendor"
                        subtitle="व्यापारी"
                        description="I buy agricultural products and need market insights and business information"
                        features={[
                            "Market price trends and analysis",
                            "Demand and supply information",
                            "Connect with farmers and buyers",
                            "Transportation and logistics help",
                            "Business opportunities updates"
                        ]}
                        icon="🏪"
                        onPress={handleUserSelection}
                        isSelected={selectedUser === 'vendor'}
                    />
                </View>

                {/* Additional Info */}
                <View style={styles.footerSection}>
                    <Text style={styles.footerTitle}>Why choose your role?</Text>
                    <View style={styles.benefitsContainer}>
                        <View style={styles.benefitItem}>
                            <Text style={styles.benefitIcon}>🎯</Text>
                            <Text style={styles.benefitText}>Personalized content based on your needs</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Text style={styles.benefitIcon}>🌍</Text>
                            <Text style={styles.benefitText}>Multilingual support in your local language</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Text style={styles.benefitIcon}>📱</Text>
                            <Text style={styles.benefitText}>Easy-to-use interface designed for you</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Text style={styles.benefitIcon}>🤝</Text>
                            <Text style={styles.benefitText}>Connect with the right community</Text>
                        </View>
                    </View>
                </View>

                {/* Bottom spacing */}
                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

export default UserSelectionScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F8E9',
    },
    header: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 20,
        paddingVertical: 25,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    headerTitle: {
        fontSize: 26,
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
    introSection: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.22,
    },
    introTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    introSubtitle: {
        fontSize: 18,
        color: '#4CAF50',
        marginBottom: 12,
    },
    introDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    cardsContainer: {
        padding: 16,
        gap: 16,
    },
    userCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        marginBottom: 8,
    },
    selectedCard: {
        borderWidth: 3,
        borderColor: '#4CAF50',
        elevation: 6,
        shadowOpacity: 0.2,
    },
    cardTouchable: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconText: {
        fontSize: 28,
    },
    headerText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    checkmark: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cardDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 16,
    },
    featuresContainer: {
        marginBottom: 20,
    },
    featuresTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2E7D32',
        marginBottom: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    featureBullet: {
        fontSize: 16,
        color: '#4CAF50',
        marginRight: 8,
        marginTop: 2,
    },
    featureText: {
        fontSize: 13,
        color: '#555',
        flex: 1,
        lineHeight: 18,
    },
    selectButton: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 8,
    },
    selectedButton: {
        backgroundColor: '#4CAF50',
    },
    selectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footerSection: {
        margin: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.22,
    },
    footerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 16,
        textAlign: 'center',
    },
    benefitsContainer: {
        gap: 12,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    benefitIcon: {
        fontSize: 20,
        marginRight: 12,
        width: 30,
        textAlign: 'center',
    },
    benefitText: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        lineHeight: 18,
    },
});