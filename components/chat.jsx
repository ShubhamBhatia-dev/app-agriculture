import React, { useState, useEffect, useRef, use } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Pressable,
    StatusBar,
    PermissionsAndroid,
    Dimensions,
    Alert,
    Keyboard
} from 'react-native';


import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NETWORK } from './constants'; // Adjust the import path as necessary
import AsyncStorage from '@react-native-async-storage/async-storage';
const { height: screenHeight } = Dimensions.get('window');

const Chat = () => {

    const [text, setText] = useState('');
    const [currentTitle, setCurrentTitle] = useState(null);
    const [messages, setMessages] = useState([
        { id: '1', text: 'Hello! How can I help you with your farming today?', sender: 'ai' }
    ]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [previousChats, setPreviousChats] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('hi');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const scrollViewRef = useRef();

    // Language options for Indian languages
    const languages = [
        { code: 'hi', name: 'Hindi', ttsCode: 'hi' },
        { code: 'en', name: 'English', ttsCode: 'pa' },
        { code: 'mr', name: 'Marathi', ttsCode: 'bn' },
        { code: 'ta', name: 'Tamil', ttsCode: 'ta' },
        { code: 'te', name: 'Telugu', ttsCode: 'te' },
        { code: 'gu', name: 'Gujarati', ttsCode: 'gu' },
        { code: 'kn', name: 'Kannada', ttsCode: 'kn' },
        { code: 'pa', name: 'Punjabi', ttsCode: 'pa' }

    ];

    useEffect(() => {

        // Start New Chat Eeverytime 
        startNewChat();

        //   Function to fetch previous chats heading 

        const fetchPreviousChats = async () => {

            const phoneNumer = await AsyncStorage.getItem('userPhone');
            const api = `${NETWORK}app/history/?phone=${phoneNumer}`;
            console.log("Fetching previous chats from API:", api);
            try {
                const response = await axios.get(api);
                console.log(response.data);
                if (response.data && Array.isArray(response.data.data)) {
                    setPreviousChats(response.data.data);
                    console.log("Previous chats fetched successfully:", response.data.data);
                } else {
                    console.warn("Invalid chat data format:", response.data);
                }
            } catch (error) {
                console.error("Failed to fetch previous chats:", error);
            }
        }
        fetchPreviousChats();
    }, [])





    const openPrevChat = async (title) => {
        const api = `${NETWORK}app/ai/`;
        try {
            const response = await axios.get(api, {
                params: {
                    title: title,
                    phone: await AsyncStorage.getItem('userPhone')
                }
            });
            console.log("Previous chat response:", response.data);
            if (response.data.success) {
                setMessages(response.data.data.content);
                setCurrentTitle(title);
                setIsSidebarOpen(false);
                console.log("Previous chat loaded successfully:", response.data.content);
            }

        } catch (error) {
            console.error("Failed to fetch previous chat:", error);
        }
    };

    const handleSendMessage = async () => {
        if (text.trim()) {
            const newMessage = { id: Date.now().toString(), text: text.trim(), sender: 'user' };
            setMessages(prev => [...prev, newMessage]);
            setText('');

            // Scroll to bottom after adding message
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

            let message = messages;
            message.push({
                id: (Date.now() + 1).toString(), text: text.trim(), sender: 'user'
            });
            setMessages(message);
            let data = {
                phone: await AsyncStorage.getItem('userPhone'),
                title: currentTitle,
                content: messages,
            }

            console.log("Saving chat history:", data);
            // let response = await axios.post(`${NETWORK}app/history/`, data);


            // if (response.data.success) {
            //     console.log("Chat history saved successfully");
            // }

            let response = await axios.post(`${NETWORK}app/ai/`, {
                ...data, language: selectedLanguage.toString()
            });

            if (response.data) {
                console.log(response.data);
            }



            const aiResponse = response.data.reply;
            const aiMessage = { id: (Date.now() + 1).toString(), text: aiResponse, sender: 'ai' };
            setMessages(prev => [...prev, aiMessage]);
            // Code to shift to newest message and close keyboard 
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
                Keyboard.dismiss();
            }, 100);



        }
    };


    const startNewChat = () => {
        setMessages([
            { id: '1', text: 'Hello! How can I help you with your farming today?', sender: 'ai' }
        ]);
        let date = new Date().toLocaleTimeString() + " " + new Date().toDateString()


        setCurrentTitle('KISAN DOST ' + date);
        setIsSidebarOpen(false);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Sidebar */}
            <Modal transparent visible={isSidebarOpen} animationType="slide">
                <Pressable style={styles.sidebarOverlay} onPress={() => setIsSidebarOpen(false)}>
                    <View style={styles.sidebar} onStartShouldSetResponder={() => true}>
                        <Text style={styles.sidebarHeaderText}>Kisan Dost</Text>

                        <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
                            <Text style={styles.newChatButtonText}>+ New Chat</Text>
                        </TouchableOpacity>


                        <Text style={styles.sectionHeader}>Language / भाषा</Text>
                        <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
                            {languages.map((lang, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.languageItem,
                                        selectedLanguage === lang.code && styles.selectedLanguage
                                    ]}
                                    onPress={() => { setSelectedLanguage(lang.code); setIsSidebarOpen(false) }}
                                >
                                    <Text style={[
                                        styles.languageText,
                                        selectedLanguage === lang.code && styles.selectedLanguageText
                                    ]}>
                                        {lang.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {
                            currentTitle ? (
                                <View>
                                    <Text style={styles.sectionHeader}>Current Chat</Text>
                                    <TouchableOpacity>
                                        <Text>
                                            {currentTitle}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null
                        }

                        <Text style={styles.sectionHeader}>Previous Chats</Text>
                        <ScrollView style={styles.chatHistoryList}>
                            {(previousChats || []).map((chat, index) => (
                                <TouchableOpacity key={index} style={styles.chatHistoryItem} onPress={() => openPrevChat(chat)}>
                                    <Text style={styles.chatHistoryText}>{chat}</Text>

                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
                        <Text style={styles.menuIcon}>☰</Text>
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerText}>Kisan Dost</Text>
                        <Text style={styles.headerSubtext}>
                            {/* CODE FOR SHOWING CURRENT LANGUAGE */}
                            {languages.find(l => l.code === selectedLanguage)?.name || 'Hindi'}
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        {/* <TouchableOpacity onPress={() => Tts.stop()} disabled={!isSpeaking}>
                            <Text style={[styles.speakerIcon, !isSpeaking && styles.disabledIcon]}>
                                {true ? '🔊' : '🔇'}
                            </Text>
                        </TouchableOpacity> */}
                    </View>
                </View>

                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messageList}
                    contentContainerStyle={[
                        styles.messageListContent,
                        { paddingBottom: keyboardHeight > 0 ? 10 : 80 }
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.map((msg, index) => (
                        <View key={index} style={[
                            styles.messageBubble,
                            msg.sender === 'user' ? styles.userMessage : styles.aiMessage
                        ]}>
                            <Text style={[
                                styles.messageText,
                                msg.sender === 'user' && styles.userMessageText
                            ]}>
                                {msg.text}
                            </Text>

                        </View>
                    ))}
                </ScrollView>

                {/* Input */}
                <View style={[styles.inputContainer, keyboardHeight > 0 && { marginBottom: 0 }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.chatInput}
                            onChangeText={setText}
                            value={text}
                            placeholder={`Type in ${languages.find(l => l.code === selectedLanguage)?.name}...`}
                            placeholderTextColor="#999"
                            multiline
                            maxLength={1000}
                            returnKeyType="send"
                            onSubmitEditing={handleSendMessage}
                            blurOnSubmit={false}
                        />
                        <View style={styles.buttonContainer}>

                            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                                <Text style={styles.buttonText}>Send</Text>
                            </TouchableOpacity>


                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#2E7D32'
    },
    container: {
        flex: 1,
        backgroundColor: '#F1F8E9'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2E7D32',
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuButton: {
        padding: 4,
    },
    menuIcon: {
        color: '#fff',
        fontSize: 22
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold'
    },
    headerSubtext: {
        color: '#C8E6C9',
        fontSize: 12,
        marginTop: 2,
    },
    headerRight: {
        padding: 4,
    },
    speakerIcon: {
        fontSize: 20,
    },
    disabledIcon: {
        opacity: 0.5,
    },
    messageList: {
        flex: 1,
    },
    messageListContent: {
        padding: 16,
        flexGrow: 1,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        maxWidth: '85%',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    userMessage: {
        backgroundColor: '#4CAF50',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    aiMessage: {
        backgroundColor: '#fff',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        position: 'relative',
    },
    messageText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
    },
    userMessageText: {
        color: '#fff'
    },
    speakButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
    },
    speakButtonText: {
        fontSize: 14,
    },
    inputContainer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        minHeight: 60,
    },
    chatInput: {
        flex: 1,
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 25,
        marginRight: 8,
        maxHeight: 100,
        textAlignVertical: 'top',
    },
    buttonContainer: {
        justifyContent: 'flex-end',
    },
    sendButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 12,
        minWidth: 60,
        alignItems: 'center',
    },
    voiceButton: {
        backgroundColor: '#2196F3',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minWidth: 80,
        alignItems: 'center',
    },
    listeningButton: {
        backgroundColor: '#F44336',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    sidebarOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row'
    },
    sidebar: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 20,
        paddingTop: 40,
    },
    sidebarHeaderText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 20,
        textAlign: 'center',
    },
    newChatButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        alignItems: 'center',
    },
    newChatButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2E7D32',
        marginBottom: 10,
        marginTop: 10,
    },
    languageList: {
        maxHeight: 200,
        marginBottom: 20,
    },
    languageItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 4,
    },
    selectedLanguage: {
        backgroundColor: '#E8F5E8',
    },
    languageText: {
        fontSize: 16,
        color: '#333',
    },
    selectedLanguageText: {
        color: '#2E7D32',
        fontWeight: '600',
    },
    chatHistoryList: {
        flex: 1,
    },
    chatHistoryItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    chatHistoryText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 4,
    },
    chatHistoryDate: {
        fontSize: 12,
        color: '#666',
    },
});

export default Chat;