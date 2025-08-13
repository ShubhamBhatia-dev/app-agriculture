import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import crop from '../assets/crop.png';

export default function LoadingScreen({ navigation }) {
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));

                const storedUser = await AsyncStorage.getItem('userProfile');
                const user = storedUser ? JSON.parse(storedUser) : null;

                if (!user) {
                    navigation.replace('Number');
                    return;
                }

                if (user.userType === 'farmer') {
                    navigation.replace('Home');
                } else if (user.userType === 'vendor') {
                    navigation.replace('Vendor');
                } else {
                    navigation.replace('Number');
                }
            } catch (e) {
                console.error("Error checking onboarding status:", e);
                navigation.replace('Number');
            }
        };

        checkOnboardingStatus();
    }, []);

    return (
        <View style={styles.container}>

            <Text style={styles.logotext}>KISAN DOST</Text>
            <ActivityIndicator size="large" color="#4aa533ff" />

            <Image
                source={crop}

                style={{
                    width: '100%',
                    height: 380,
                    position: 'absolute',
                    bottom: 0,
                    resizeMode: 'cover',
                }}
            />
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 2,
        backgroundColor: '#dee4e2ff',
        alignItems: 'center',
        justifyContent: 'center',


    },
    logotext: {
        fontSize: 50,
        fontWeight: '800',
        color: '#13bc19ff',
        marginTop: 0,
    },
});
