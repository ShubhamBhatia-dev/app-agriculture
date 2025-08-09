import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaFrameContext, SafeAreaView } from "react-native-safe-area-context";

export default Language = ({ navigation, route }) => {
    //langauges : Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani, Maithili, Malayalam, Manipuri, Marathi, Nepali, Oriya, Punjabi, Sanskrit, Santhali, Sindhi, Tamil, Telugu, and Urdu
    // Each language wuld have a button that when clicked would change the language of the app
    // For now we will display languages like some buttons with gradinets and color change on choosing so they are touchableopacity
    const langauges = {
        Assamese: "অসমীয়া",
        Bengali: "বাংলা",
        Bodo: "बड़ो",
        Dogri: "डोगरी",
        Gujarati: "ગુજરાતી",
        Hindi: "हिन्दी",
        Kannada: "ಕನ್ನಡ",
        Kashmiri: "कश्मीरी",
        Konkani: "कोंकणी",
        Maithili: "मैथिली",
        Malayalam: "മലയാളം",
        Manipuri: "মণিপুরী",
        Marathi: "मराठी",
        Nepali: "नेपाली",
        Oriya: "ଓଡ଼ିଆ",
        Punjabi: "ਪੰਜਾਬੀ",
        Sanskrit: "संस्कृतम्",
        Santhali: "ᱥᱟᱱᱛᱟᱲᱤ",
        Sindhi: "سنڌي",
        Tamil: "தமிழ்",
        Telugu: "తెలుగు",
        Urdu: "اردو",
        English: "English"
    }

    const styles = StyleSheet.create({
        container: {

            flex: 1,
            backgroundColor: '#dee4e2ff',

            alignItems: 'center',
            justifyContent: 'center',
        },
        title: {
            fontSize: 30,
            fontWeight: 'bold',
            color: '#000',
            marginBottom: 20,
        },
        scrollView: {
            width: '100%',
            paddingHorizontal: 20,
        },
        button: {
            backgroundColor: '#782ae6ff',
            padding: 15,
            borderRadius: 10,
            marginVertical: 5,
            alignItems: 'center',
        },
        buttonText: {
            color: '#fff',
            fontSize: 18,
        },
    });

    function handleLanguageSelection(language) {
        // Save the selected language to AsyncStorage   
        AsyncStorage.setItem('user_language', language)
            .then(() => {
                const usertype = route.params?.userType;
                if (usertype) {
                    navigation.navigate('Address', { userType: usertype });
                }
                else {
                    console.log("USER TYPE EMPTY");
                }
            })
            .catch(error => {
                console.error("Error saving language:", error);
            });
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Select Language</Text>
            <ScrollView style={styles.scrollView}>
                {Object.keys(langauges).map((lang, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.button}
                        onPress={() => handleLanguageSelection(lang)}
                    >
                        <Text style={styles.buttonText}>{langauges[lang]}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}