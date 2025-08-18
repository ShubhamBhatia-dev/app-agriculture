import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    FlatList,
    Alert
} from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NETWORK, WS } from './constants';

// Main App Component
const Talking = ({ }) => {
    const [currentScreen, setCurrentScreen] = useState('contacts');
    const [selectedContact, setSelectedContact] = useState(null);
    const [currentUserType, setCurrentUserType] = useState("farmer");

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const user = await AsyncStorage.getItem("userProfile");
                if (user) {
                    const parsedUser = JSON.parse(user);
                    setCurrentUserType(parsedUser.userType);
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        };
        fetchUserProfile();
    }, []);

    const navigateToChat = (contact) => {
        setSelectedContact(contact);
        setCurrentScreen('chat');
    };

    const navigateBack = () => {
        setCurrentScreen('contacts');
        setSelectedContact(null);
    };

    if (currentScreen === 'contacts') {
        return <ContactsList onSelectContact={navigateToChat} />;
    } else {
        return <ChatScreen contact={selectedContact} onGoBack={navigateBack} currentUserType={currentUserType} />;
    }
};

// Contacts List Screen
const ContactsList = ({ onSelectContact }) => {
    const [contacts, setContacts] = useState([]);
    const [userType, setUserType] = useState('farmer');

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const userProfile = await AsyncStorage.getItem('userProfile');
                let userType = userProfile ? JSON.parse(userProfile).userType : 'farmer';
                console.log(userType);
                setUserType(userType);

                let paramKey = userType === 'farmer' ? 'farmer_phoneNumber' : 'vender_phoneNumber';
                let phoneNumber = await AsyncStorage.getItem('userPhone');
                console.log(paramKey, "  ", phoneNumber);
                const response = await axios.get(`${NETWORK}app/chat-history/`, {
                    params: {
                        [paramKey]: phoneNumber.toString()
                    }
                });

                console.log('Contacts fetched:', response.data);
                if (response.data && response.data.chats) {
                    setContacts(response.data.chats);
                } else {
                    setContacts([]);
                }
            } catch (error) {
                console.error('Error fetching contacts:', error);
                setContacts([]);
            }
        };

        fetchContacts();
    }, []);

    const renderContactItem = ({ item }) => (
        <TouchableOpacity
            style={styles.contactItem}
            onPress={() => onSelectContact(item)}
        >
            <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                    {userType === 'farmer'
                        ? (item.vender_name ? item.vender_name.charAt(0).toUpperCase() : 'V')
                        : (item.farmer_name ? item.farmer_name.charAt(0).toUpperCase() : 'F')
                    }
                </Text>
            </View>
            <View style={styles.contactInfo}>
                <View style={styles.contactHeader}>
                    <Text style={styles.contactName}>
                        {userType === 'farmer' ? item.vender_name : item.farmer_name}
                    </Text>
                    <Text style={styles.contactTime}>
                        {userType === 'farmer' ? item.vender_phoneNumber : item.farmer_phoneNumber}
                    </Text>
                </View>
                <View style={styles.contactLastMessage}>
                    <Text style={styles.lastMessageText} numberOfLines={1}>
                        {item.lastMessage || 'No messages yet'}
                    </Text>
                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {item.unreadCount > 99 ? '99+' : item.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            <View style={styles.contactsHeader}>
                <Text style={styles.contactsHeaderTitle}>Chats</Text>
                <View style={styles.contactsHeaderActions}>

                </View>
            </View>
            <FlatList
                data={contacts}
                keyExtractor={(item, index) => `${item.farmer_phoneNumber}-${item.vender_phoneNumber}-${index}`}
                renderItem={renderContactItem}
                style={styles.contactsList}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const ChatScreen = ({ contact, onGoBack, currentUserType }) => {
    const [text, setText] = useState('');
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [onlineStatus, setOnlineStatus] = useState('last seen recently');
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const scrollViewRef = useRef();
    const ws = useRef(null);

    useEffect(() => {
        console.log("Setting up WebSocket connection...");
        const wsUrl = `ws://${WS}/ws/chat/`;
        console.log("WebSocket URL:", wsUrl);

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log("WebSocket connected successfully");
            setConnectionStatus('connected');

            // Send initial connection message
            const initMessage = {
                farmer_phoneNumber: contact.farmer_phoneNumber,
                vender_phoneNumber: contact.vender_phoneNumber,
                farmer_name: contact.farmer_name,
                vender_name: contact.vender_name,
                from_message: 'farmer',
                to_message: 'vender',
                message: "",
                type: 'connect'
            };

            ws.current.send(JSON.stringify(initMessage));
        };

        ws.current.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                console.log("Received WebSocket message:", data);

                // Only add to messages if it's an actual message (not a connection acknowledgment)
                if (data.message && data.message.trim() !== '') {
                    setMessages((prev) => {
                        // Check if message already exists to prevent duplicates
                        const messageExists = prev.some(msg =>
                            msg.message === data.message &&
                            msg.timestamp === data.timestamp &&
                            msg.from_message === data.from_message
                        );

                        if (!messageExists) {
                            return [...prev, data];
                        }
                        return prev;
                    });
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        ws.current.onerror = (error) => {
            console.error("WebSocket error:", error);
            setConnectionStatus('error');
        };

        ws.current.onclose = (event) => {
            console.log("WebSocket disconnected. Code:", event.code, "Reason:", event.reason);
            setConnectionStatus('disconnected');
        };

        return () => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.close();
            }
        };
    }, [contact]);

    useEffect(() => {
        loadMessages();
    }, [contact]);

    const loadMessages = async () => {
        try {
            const usertype = currentUserType === "farmer" ? "farmer_phoneNumber" : "vender_phoneNumber";
            const phoneNumber = currentUserType === "farmer" ? contact.farmer_phoneNumber : contact.vender_phoneNumber;

            console.log("Loading messages for:", usertype, phoneNumber);

            const response = await axios.post(`${NETWORK}app/chat-history/`, {
                [usertype]: phoneNumber
            }); 3



            console.log("Chat history response:", response.data);

            if (response.data && response.data.chats) {
                setMessages(response.data.chats);
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            }
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    };

    const handleSendMessage = async () => {
        if (text.trim() && ws.current && ws.current.readyState === WebSocket.OPEN) {
            const messageToSend = text.trim();

            const newMessage = {
                farmer_phoneNumber: contact.farmer_phoneNumber,
                vender_phoneNumber: contact.vender_phoneNumber,
                farmer_name: contact.farmer_name,
                vender_name: contact.vender_name, // Fixed: was vendor_name
                message: messageToSend,
                from_message: currentUserType === "farmer" ? "farmer" : "vender",
                to_message: currentUserType === "farmer" ? "vender" : "farmer",
                timestamp: new Date().toISOString(),
                type: 'message'
            };

            try {
                // Send via WebSocket
                ws.current.send(JSON.stringify(newMessage));
                console.log("Message sent:", newMessage);

                // Clear input immediately
                setText('');

                // Don't add to local messages here - let WebSocket onmessage handle it
                // This prevents duplicate messages

                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

            } catch (error) {
                console.error("Error sending message:", error);
                // Restore text if sending failed
                setText(messageToSend);
            }
        } else if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket is not connected. Current state:", ws.current.readyState);
            Alert.alert("Connection Error", "Unable to send message. Please check your connection.");
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />

            {/* Connection Status Indicator */}
            {connectionStatus !== 'connected' && (
                <View style={styles.connectionStatus}>
                    <Text style={styles.connectionStatusText}>
                        {connectionStatus === 'connecting' && 'Connecting...'}
                        {connectionStatus === 'disconnected' && 'Disconnected'}
                        {connectionStatus === 'error' && 'Connection Error'}
                    </Text>
                </View>
            )}

            {/* Chat Header */}
            <View style={styles.chatHeader}>
                <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.chatHeaderInfo}>
                    <View style={styles.chatAvatar}>
                        <Text style={styles.chatAvatarText}>
                            {currentUserType === 'farmer'
                                ? (contact.vender_name ? contact.vender_name.charAt(0).toUpperCase() : 'V')
                                : (contact.farmer_name ? contact.farmer_name.charAt(0).toUpperCase() : 'F')
                            }
                        </Text>
                    </View>
                    <View style={styles.chatHeaderTextContainer}>
                        <Text style={styles.chatHeaderName}>
                            {currentUserType === 'farmer'
                                ? (contact.vender_name || 'Vendor').toUpperCase()
                                : (contact.farmer_name || 'Farmer').toUpperCase()
                            }
                        </Text>
                        <Text style={styles.chatHeaderStatus}>
                            {isTyping ? 'typing...' : onlineStatus}
                        </Text>
                    </View>
                </View>
                <View style={styles.chatHeaderActions}>

                </View>
            </View>

            <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messageList}
                    contentContainerStyle={styles.messageListContent}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.map((msg, idx) => {
                        // Skip if msg.message is null, undefined, or an empty string
                        if (!msg.message || msg.message.trim() === '') return null;

                        const isMyMessage =
                            ((currentUserType === 'farmer') && (msg.from_message === "farmer")) ||
                            ((currentUserType === 'vendor' || currentUserType === 'vender') &&
                                (msg.from_message === 'vender' || msg.from_message === "vendor"));

                        return (
                            <View
                                key={`${idx}-${msg.timestamp || Date.now()}`}
                                style={[
                                    styles.messageBubble,
                                    isMyMessage ? styles.userMessage : styles.otherMessage
                                ]}
                            >
                                <Text style={[
                                    styles.messageText,
                                    isMyMessage ? styles.userMessageText : styles.otherMessageText
                                ]}>
                                    {msg.message}
                                </Text>

                                <View style={[
                                    styles.messageTail,
                                    isMyMessage ? styles.userMessageTail : styles.otherMessageTail
                                ]} />
                            </View>
                        );
                    })}

                </ScrollView>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>

                        <View style={styles.textInputContainer}>
                            <TextInput
                                style={styles.chatInput}
                                value={text}
                                onChangeText={setText}
                                placeholder="Type a message"
                                placeholderTextColor="#999"
                                multiline
                                textAlignVertical="center"
                                editable={connectionStatus === 'connected'}
                            />

                        </View>
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                connectionStatus !== 'connected' && styles.sendButtonDisabled
                            ]}
                            onPress={handleSendMessage}
                            disabled={connectionStatus !== 'connected'}
                        >
                            <Text style={styles.sendButtonText}>➤</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#075E54',
    },
    connectionStatus: {
        backgroundColor: '#FF6B6B',
        padding: 8,
        alignItems: 'center',
    },
    connectionStatusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
    sendButtonDisabled: {
        backgroundColor: '#CCCCCC',
    },

    // Contacts List Styles
    contactsHeader: {
        backgroundColor: '#075E54',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contactsHeaderTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    contactsHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerActionButton: {
        padding: 8,
        marginLeft: 8,
    },
    headerActionText: {
        fontSize: 18,
        color: '#FFFFFF',
    },
    contactsList: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    contactItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFFFFF',
    },
    contactAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#075E54',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contactAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    contactInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    contactHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    contactTime: {
        fontSize: 12,
        color: '#999999',
    },
    contactLastMessage: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessageText: {
        fontSize: 14,
        color: '#666666',
        flex: 1,
    },
    unreadBadge: {
        backgroundColor: '#25D366',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginLeft: 8,
    },
    unreadCount: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },

    // Chat Screen Styles
    chatHeader: {
        backgroundColor: '#075E54',
        paddingHorizontal: 8,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    backButtonText: {
        fontSize: 20,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    chatHeaderInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chatAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    chatAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#075E54',
    },
    chatHeaderTextContainer: {
        flex: 1,
    },
    chatHeaderName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    chatHeaderStatus: {
        fontSize: 13,
        color: '#B3B3B3',
        marginTop: 1,
    },
    chatHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chatHeaderButton: {
        padding: 8,
        marginLeft: 4,
    },
    chatHeaderButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
    },
    chatContainer: {
        flex: 1,
        backgroundColor: '#ECE5DD',
    },
    messageList: {
        flex: 1,
    },
    messageListContent: {
        padding: 8,
        flexGrow: 1,
        paddingBottom: 10,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 8,
        margin: 4,
        borderRadius: 8,
        position: 'relative',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#DCF8C6',
        borderBottomRightRadius: 2,
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 2,
    },
    messageText: {
        fontSize: 16,
        color: '#000',
        lineHeight: 20,
    },
    userMessageText: {
        color: '#000',
    },
    otherMessageText: {
        color: '#000',
    },
    messageFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4,
    },
    messageTime: {
        fontSize: 11,
        color: '#666',
        marginRight: 4,
    },
    userMessageTime: {
        color: '#666',
    },
    otherMessageTime: {
        color: '#666',
    },
    messageTail: {
        position: 'absolute',
        bottom: 0,
        width: 0,
        height: 0,
    },
    userMessageTail: {
        right: -6,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 6,
        borderLeftColor: '#DCF8C6',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    otherMessageTail: {
        left: -6,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: '#FFFFFF',
        borderBottomColor: 'transparent',
    },

    // Input Area Styles
    inputContainer: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    attachButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    attachButtonText: {
        fontSize: 20,
        color: '#666',
    },
    textInputContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 15,
        paddingVertical: 5,
        marginRight: 8,
        minHeight: 40,
        maxHeight: 120,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    chatInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        paddingVertical: 8,
        textAlignVertical: 'center',
    },
    emojiButton: {
        paddingLeft: 8,
        paddingBottom: 8,
    },
    emojiButtonText: {
        fontSize: 20,
    },
    sendButton: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#075E54',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
});

export default Talking;