import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, View, Text, TextInput,
    FlatList, TouchableOpacity, KeyboardAvoidingView,
    Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStressStore } from '../store/useStressStore';
import { getLiveInsights, getCoachPersonality } from '../logic/aiCoach';
import type { AppScreen } from '../../app/(tabs)';

const { width } = Dimensions.get('window');

interface Message {
    id: string;
    text: string;
    sender: 'COACH' | 'USER';
    timestamp: number;
}

export const CoachChatScreen = ({ onNavigate }: { onNavigate: (s: AppScreen) => void }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const stressScore = useStressStore((s) => s.stressScore);
    const personality = getCoachPersonality();
    const flatListRef = useRef<FlatList>(null);

    // Initial greeting based on current state
    useEffect(() => {
        const insights = getLiveInsights(stressScore);
        const greeting: Message = {
            id: 'init',
            text: `${personality.intro}\n\n${insights.empathy}`,
            sender: 'COACH',
            timestamp: Date.now(),
        };
        setMessages([greeting]);
    }, []);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'USER',
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        // Simulate AI thinking and replying
        setTimeout(() => {
            generateReply(input);
        }, 1000);
    };

    const generateReply = (userText: string) => {
        const lower = userText.toLowerCase();
        const insights = getLiveInsights(stressScore);
        let reply = "";

        if (lower.includes('lonely') || lower.includes('sad') || lower.includes('alone')) {
            reply = "I'm right here. Even though I'm a system, I'm tuned specifically to you. What's on your mind?";
        } else if (lower.includes('stress') || lower.includes('anxious') || lower.includes('worried')) {
            reply = `I can feel the load is at ${stressScore}%. Let's try to bring that down. Want to start a quick breathing session?`;
        } else if (lower.includes('thank') || lower.includes('thanks')) {
            reply = "Always. My only job is to watch your back.";
        } else {
            reply = "I understand. I'm monitoring your patterns to make sure you stay balanced. Tell me more about how you're feeling.";
        }

        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: reply,
            sender: 'COACH',
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[
            styles.msgWrapper,
            item.sender === 'USER' ? styles.userWrapper : styles.coachWrapper
        ]}>
            <View style={[
                styles.msgBubble,
                item.sender === 'USER' ? styles.userBubble : styles.coachBubble
            ]}>
                <Text style={styles.msgText}>{item.text}</Text>
            </View>
        </View>
    );

    return (
        <LinearGradient colors={['#000D1A', '#001A2C']} style={styles.container}>
            <SafeAreaView style={styles.safe}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => onNavigate('HOME')} style={styles.backBtn}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTitleArea}>
                        <Text style={styles.title}>{personality.name}</Text>
                        <View style={styles.statusRow}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>{getLiveInsights(stressScore).status}</Text>
                        </View>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Chat Area */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.chatList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                />

                {/* Input Area */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={20}
                >
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Talk to Nerv..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={input}
                            onChangeText={setInput}
                            multiline
                        />
                        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                            <Text style={styles.sendIcon}>🏹</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 15,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    backBtn: { padding: 5 },
    backText: { color: '#00FFDD', fontSize: 16 },
    headerTitleArea: { alignItems: 'center' },
    title: { color: '#FFF', fontSize: 20, fontWeight: '800' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FFDD', marginRight: 6 },
    statusText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

    chatList: { padding: 20, paddingBottom: 40 },
    msgWrapper: { marginBottom: 15, width: '100%' },
    userWrapper: { alignItems: 'flex-end' },
    coachWrapper: { alignItems: 'flex-start' },
    msgBubble: {
        maxWidth: width * 0.75,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    userBubble: {
        backgroundColor: 'rgba(0,255,221,0.15)',
        borderBottomRightRadius: 4,
        borderWidth: 1, borderColor: 'rgba(0,255,221,0.3)'
    },
    coachBubble: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderBottomLeftRadius: 4,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    msgText: { color: '#FFF', fontSize: 15, lineHeight: 22 },

    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        padding: 15, paddingTop: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)'
    },
    input: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10,
        color: '#FFF', fontSize: 15, maxHeight: 100
    },
    sendBtn: {
        width: 45, height: 45, borderRadius: 22.5,
        backgroundColor: 'rgba(0,255,221,0.2)',
        alignItems: 'center', justifyContent: 'center', marginLeft: 10
    },
    sendIcon: { fontSize: 22 }
});
