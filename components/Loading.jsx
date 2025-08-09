import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import crop from '../assets/crop.png'; // Adjust the path as necessary

export default function LoadingScreen({ navigation }) {
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                // sleep for 1 seconds to simulate loading
                await new Promise(resolve => setTimeout(resolve, 1000));
                const language = await AsyncStorage.getItem('user_language');
                const address = await AsyncStorage.getItem('user_address');
                const type = await AsyncStorage.getItem('user_type');
                const number = await AsyncStorage.getItem('user_number');

                if (type && type == 'farmer') {
                        navigation.replace('Home', { language, address });
                } else if (type && type == 'vendor') {
                    navigation.replace('Vendor', { language, address, number });
                } else {
                    // Otherwise, start the onboarding process
                    navigation.replace('Number');
                }
            } catch (e) {
                // Handle errors here, e.g., log them or show a fallback screen
                console.error("Error checking onboarding status:", e);
                navigation.replace('Language'); // Fallback to onboarding
            }
        };

        checkOnboardingStatus();
    }, []); // The empty array ensures this effect runs only once

    return (
        <View style={styles.container}>

            <Text style={styles.logotext}>KISAN DOST</Text>
            <ActivityIndicator size="large" color="#7352f5ff" />

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
        color: '#7352f5ff',
        marginTop: 0,
    },
});
