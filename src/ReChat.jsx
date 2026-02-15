import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageSquare, Sparkles } from 'lucide-react';
import { getCompletion } from './ai.js';

function ResponseOption({ label, emoji, color, text, onSend }) {
  const [editedText, setEditedText] = useState(text);
  const [isEditing, setIsEditing] = useState(false);

  const colorMap = {
    green: {
      bg: 'bg-green-400/20',
      border: 'border-green-300/50',
      text: 'text-green-700',
      hover: 'hover:bg-green-400/30'
    },
    blue: {
      bg: 'bg-blue-400/20',
      border: 'border-blue-300/50',
      text: 'text-blue-700',
      hover: 'hover:bg-blue-400/30'
    },
    purple: {
      bg: 'bg-purple-400/20',
      border: 'border-purple-300/50',
      text: 'text-purple-700',
      hover: 'hover:bg-purple-400/30'
    }
  };

  const colors = colorMap[color];

  return (
    <div className={`bg-white/60 backdrop-blur-md border-2 ${colors.border} rounded-xl p-3 shadow-lg`}>
      <div className={`text-xs font-semibold ${colors.text} mb-2`}>
        {emoji} {label}
      </div>
      
      {isEditing ? (
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full text-sm text-gray-800 bg-white/50 border border-gray-300 rounded-lg p-2 mb-2 min-h-[60px] focus:ring-2 focus:ring-teal-500"
          autoFocus
        />
      ) : (
        <div className="text-sm text-gray-800 mb-2">{editedText}</div>
      )}

      <div className="flex gap-2">
        {isEditing ? (
          <>
            <button
              onClick={() => onSend(editedText)}
              className={`flex-1 px-3 py-1.5 ${colors.bg} backdrop-blur-sm ${colors.text} rounded-lg ${colors.hover} transition text-sm font-medium`}
            >
              Send This
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-gray-200/50 text-gray-600 rounded-lg hover:bg-gray-200/70 transition text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onSend(editedText)}
              className={`flex-1 px-3 py-1.5 ${colors.bg} backdrop-blur-sm ${colors.text} rounded-lg ${colors.hover} transition text-sm font-medium`}
            >
              Send
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 bg-gray-200/50 text-gray-600 rounded-lg hover:bg-gray-200/70 transition text-sm"
            >
              Edit First
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReChat() {
  const [screen, setScreen] = useState('welcome');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [messageAnalysis, setMessageAnalysis] = useState(null);
  const [responseSuggestions, setResponseSuggestions] = useState(null);
  const [wisdomAnalysis, setWisdomAnalysis] = useState(null);
  const [angerCalmDown, setAngerCalmDown] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [lastSync, setLastSync] = useState(Date.now());
  const [showFeedback, setShowFeedback] = useState(null);
  const [emotionLevel, setEmotionLevel] = useState('calm');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [redFlagAnalysis, setRedFlagAnalysis] = useState(null);
  const [selfBarometer, setSelfBarometer] = useState({ level: 'green', score: 100, patterns: [] });
  const [showBarometerDetail, setShowBarometerDetail] = useState(false);
  
  const messagesEndRef = useRef(null);
  const roomIdInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (screen === 'chat' && roomId) {
      const interval = setInterval(() => syncRoomData(), 2000);
      return () => clearInterval(interval);
    }
  }, [screen, roomId, lastSync]);

  const detectEmotion = (text) => {
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    const hasMultipleExclamation = (text.match(/!/g) || []).length > 1;
    const angryWords = ['hate', 'pissed', 'angry', 'furious', 'fuck', 'shit', 'damn', 'wtf', 'frustrated', 'annoyed'];
    const hasAngryWords = angryWords.some(word => text.toLowerCase().includes(word));
    
    if ((capsRatio > 0.5 && text.length > 10) || hasMultipleExclamation || hasAngryWords) {
      return 'angry';
    } else if (text.length > 100) {
      return 'upset';
    }
    return 'calm';
  };

  const enterRoom = async () => {
    if (!tempName.trim()) {
      alert('Please enter your name');
      return;
    }

    setUserName(tempName);

    try {
      let existingRoom;
      try {
        existingRoom = await window.storage.get(`room:${roomId}`, true);
      } catch (e) {
        existingRoom = null;
      }
      
      let room;
      
      if (existingRoom) {
        room = JSON.parse(existingRoom.value);
        if (!room.users.includes(tempName)) {
          room.users.push(tempName);
        }
        setRoomName(room.name || 'Chat Room');
      } else {
        room = {
          id: roomId,
          name: 'Chat Room',
          users: [tempName],
          messages: [],
          createdAt: Date.now()
        };
        setRoomName(room.name);
      }

      await window.storage.set(`room:${roomId}`, JSON.stringify(room), true);
      
      setRoomData(room);
      setMessages(room.messages || []);
      setScreen('chat');
    } catch (error) {
      console.error('Error entering room:', error);
      alert('Failed to join room: ' + error.message);
    }
  };

  const syncRoomData = async () => {
    try {
      const result = await window.storage.get(`room:${roomId}`, true);
      if (result) {
        const room = JSON.parse(result.value);
        const oldMessageCount = messages.length;
        const newMessages = room.messages || [];
        
        if (newMessages.length > oldMessageCount) {
          const newestMessage = newMessages[newMessages.length - 1];
          if (newestMessage.userName !== userName) {
            setTimeout(() => analyzeForRedFlags(newestMessage), 500);
          }
        }
        
        setRoomData(room);
        setMessages(newMessages);
        setRoomName(room.name || 'Chat Room');
        setLastSync(Date.now());
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const analyzeOwnHealth = async (messageText) => {
    try {
      const myRecentMessages = messages
        .filter(m => m.userName === userName)
        .slice(-5)
        .map(m => m.text);

      const systemPrompt = `Analyze this person's communication health. Detect unhealthy patterns:

Recent messages: ${myRecentMessages.join('\n')}
Current: "${messageText}"

Patterns to detect:
- Over-apologizing (when they didn't do wrong)
- Over-explaining/justifying excessively
- Self-blame language
- Minimizing own needs
- People-pleasing
- Accepting poor treatment
- Mental gymnastics (rationalizing bad treatment)

Health levels:
- GREEN (85-100): Healthy boundaries, valuing self
- YELLOW (60-84): Starting to over-explain/apologize
- ORANGE (35-59): People-pleasing, self-blame
- RED (0-34): Accepting manipulation, mental gymnastics

Format as JSON:
{
  "level": "green/yellow/orange/red",
  "score": 0-100,
  "patterns": ["specific patterns"],
  "feedback": "Direct feedback",
  "encouragement": "Support or redirect"
}

ONLY valid JSON.`;

      const responseText = await getCompletion(systemPrompt, 800);
      const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanResponse);
      
      setSelfBarometer(analysis);
      
      if (analysis.level === 'orange' || analysis.level === 'red') {
        setShowBarometerDetail(true);
      }
    } catch (error) {
      console.error('Self-barometer error:', error);
    }
  };

  const analyzeForRedFlags = async (message) => {
    try {
      const theirRecentMessages = messages
        .filter(m => m.userName === message.userName)
        .slice(-5)
        .map(m => m.text)
        .join('\n');

      const systemPrompt = `Analyze for manipulation/unhealthy patterns:

Message: "${message.text}"
Recent: ${theirRecentMessages}

Identify red flags: manipulation, gaslighting, guilt-tripping, blame-shifting, dismissiveness, invalidation, controlling language, passive-aggression.

Format as JSON:
{
  "hasRedFlags": true/false,
  "severity": "none/minor/moderate/serious",
  "redFlags": ["patterns"],
  "healthyPatterns": ["healthy patterns"],
  "explanation": "what's happening",
  "recommendation": "what to do"
}

ONLY valid JSON.`;

      const responseText = await getCompletion(systemPrompt, 1000);
      const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanResponse);
      
      if (analysis.hasRedFlags && analysis.severity !== 'none') {
        setRedFlagAnalysis({
          ...analysis,
          messageId: message.id,
          userName: message.userName
        });
      }
    } catch (error) {
      console.error('Red flag error:', error);
    }
  };

  const getAngerCalmDown = async () => {
    const theirMessages = messages.filter(m => m.userName !== userName);
    
    if (theirMessages.length === 0) {
      alert('No messages to analyze yet');
      return;
    }

    setIsLoadingAI(true);
    
    try {
      const lastTheirMessage = theirMessages[theirMessages.length - 1];
      const recentContext = messages.slice(-6).map(m => `${m.userName}: ${m.text}`).join('\n');

      const systemPrompt = `You are providing loving, compassionate emotional first aid to someone who is angry or upset.

Recent conversation:
${recentContext}

Last message from other person:
"${lastTheirMessage.text}"

The user clicked "I'm Angry" - they need calming and validation RIGHT NOW before they respond.

Provide:
1. Validation - Their anger is real and legitimate
2. Understanding - What likely triggered this emotion
3. Calming perspective - A compassionate reframe that helps them regulate
4. Loving guidance - What they need to know before responding

Be warm, gentle, and deeply validating. Help them feel SEEN and SAFE before they respond.

You MUST respond with ONLY valid JSON (no markdown, no backticks):
{
  "validation": "Why their anger/upset is completely valid and understandable",
  "understanding": "What likely triggered this emotion in this specific situation",
  "perspective": "A loving, compassionate reframe that helps them see it differently",
  "guidance": "Gentle guidance on what to do next - take a breath, respond when ready, etc."
}`;

      const responseText = await getCompletion(systemPrompt, 1000);
      const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim();
      const calmDown = JSON.parse(cleanResponse);
      
      setAngerCalmDown(calmDown);
    } catch (error) {
      console.error('Anger calm-down error:', error);
      alert(`Failed to get calming guidance: ${error.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getWisdom = async () => {
    if (messages.length < 2) {
      alert('Need at least 2 messages to provide context');
      return;
    }

    setIsLoadingAI(true);
    
    try {
      const fullConversation = messages.map(m => `${m.userName}: ${m.text}`).join('\n');

      const systemPrompt = `Provide wisdom about this conversation. Help the person understand what's REALLY happening.

Full conversation:
${fullConversation}

Analyze:
- What's actually happening beneath the surface
- Repeated patterns or dynamics
- What they might be missing
- Guidance on how to proceed

Be direct, grounded, and protective. Help them see what they can't see from inside the conversation.

You MUST respond with ONLY valid JSON in this exact format (no markdown, no backticks, no extra text):
{
  "situation": "What is actually happening right now",
  "patterns": "Repeated dynamics you notice",
  "awareness": "What they should be aware of",
  "guidance": "Wise advice on how to proceed",
  "encouragement": "Something supportive or affirming"
}`;

      const responseText = await getCompletion(systemPrompt, 1200);
      const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim();
      const wisdom = JSON.parse(cleanResponse);
      
      if (!wisdom.situation || !wisdom.guidance) throw new Error('Invalid wisdom format');

      setWisdomAnalysis(wisdom);
    } catch (error) {
      console.error('Wisdom error details:', error);
      alert(`Failed to get wisdom: ${error.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getResponseSuggestions = async () => {
    const theirMessages = messages.filter(m => m.userName !== userName);
    if (theirMessages.length === 0) {
      alert('No messages from other person yet');
      return;
    }
    
    const lastTheirMessage = theirMessages[theirMessages.length - 1];
    setIsLoadingAI(true);
    
    try {
      const recentContext = messages.slice(-6).map(m => `${m.userName}: ${m.text}`).join('\n');

      const systemPrompt = `You are helping someone respond to a message. Provide 3 complete, ready-to-send responses.

They received: "${lastTheirMessage.text}"

Recent conversation:
${recentContext}

Provide 3 different response approaches:

1. COMPASSIONATE LISTENING - Validates their feelings, shows empathy, makes them feel heard
   Example: "I hear that you're frustrated. That makes sense given..."

2. NEUTRAL RESPONSE - Balanced, calm, objective. Neither overly warm nor cold.
   Example: "I understand what you're saying. Here's my perspective..."

3. POSITIVE RESPONSE - Encouraging, constructive, solution-focused (if appropriate)
   Example: "I appreciate you sharing that. Let's figure out how we can..."

Each response should be:
- Complete and ready to send (2-3 sentences)
- Natural and authentic
- Appropriate to the context
- Actually different from each other

Format as JSON:
{
  "context": "Brief summary of what they're communicating and what they might need",
  "compassionate": "Empathetic response that validates their feelings",
  "neutral": "Balanced, calm response",
  "positive": "Encouraging, solution-focused response"
}

Respond ONLY with valid JSON. No markdown, no backticks, just pure JSON.`;

      const responseText = await getCompletion(systemPrompt, 1200);
      const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const suggestions = JSON.parse(cleanResponse);
      
      setResponseSuggestions({
        ...suggestions,
        theirMessage: lastTheirMessage.text,
        theirName: lastTheirMessage.userName
      });
    } catch (error) {
      console.error('Response error:', error);
      alert('Failed to generate responses');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const analyzeTheirMessage = async (message) => {
    setIsLoadingAI(true);
    
    try {
      const recentContext = messages.slice(-4).map(m => `${m.userName}: ${m.text}`).join('\n');
      
      const systemPrompt = `You are helping an autistic/disabled person understand what someone REALLY means in a message. Be extremely detailed and helpful.

Message to analyze: "${message.text}"
From: ${message.userName}

Recent context:
${recentContext}

Provide a COMPREHENSIVE analysis covering:

1. EMOTIONAL TONE - What emotions are present? (frustration, sadness, defensiveness, warmth, etc.)
2. LITERAL vs ACTUAL MEANING - What they said vs what they actually mean
3. SUBTEXT - What are they NOT saying directly but implying?
4. THEIR EMOTIONAL NEED - What do they need from you right now? (validation, space, reassurance, action, etc.)
5. WHY THEY SAID IT THIS WAY - What might have caused them to phrase it like this?
6. SOCIAL CUES YOU MIGHT MISS - Any indirect communication, passive-aggression, hints, or coded language
7. RECOMMENDED RESPONSE APPROACH - Should you validate, clarify, give space, address directly, etc.?

Be specific. Use examples. Help them SEE what they might be missing.

Format as JSON:
{
  "emotionalTone": "Detailed description of their emotional state",
  "literalVsActual": "What they said literally vs what they actually mean",
  "subtext": "What they're implying but not saying directly",
  "theirNeed": "What they need from you right now and why",
  "whyThisWay": "Why they communicated it this way instead of directly",
  "socialCues": "Any indirect communication or coded language you might miss",
  "responseApproach": "How to respond - specific actionable guidance"
}

ONLY valid JSON.`;

      const responseText = await getCompletion(systemPrompt, 1500);
      const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanResponse);
      
      setMessageAnalysis({
        ...analysis,
        userName: message.userName,
        messageId: message.id,
        messageText: message.text
      });
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getAIHelp = async () => {
    if (!currentMessage.trim()) {
      alert('Please write a message first');
      return;
    }

    const emotion = detectEmotion(currentMessage);
    setEmotionLevel(emotion);
    setIsLoadingAI(true);
    
    try {
      const recentMessages = messages.slice(-6);
      const conversationContext = recentMessages.map(m => `${m.userName}: ${m.text}`).join('\n');

      let emotionGuidance = '';
      if (emotion === 'angry') {
        emotionGuidance = '\n\nThis person is ANGRY. Help them express truth without damage. Validate feelings, preserve meaning, remove inflammatory language.';
      }

      const systemPrompt = `Compassionate communication assistant.

Help articulate: "${currentMessage}"

Context: ${conversationContext}${emotionGuidance}

Provide 3 versions:
- VULNERABLE: heart-open, emotionally present
- CLEAR: direct and honest
- CONNECTING: acknowledges other, seeks understanding

Format as JSON:
{
  "summary": "core feeling beneath words",
  "vulnerable": "vulnerable version",
  "clear": "clear version",
  "connecting": "connecting version"
}

ONLY valid JSON.`;

      const responseText = await getCompletion(systemPrompt, 1000);
      const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const suggestions = JSON.parse(cleanResponse);
      
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('AI error:', error);
      alert('Failed to get AI help');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const sendMessage = async (text, usedAI = false, suggestionType = null) => {
    if (!text || !text.trim()) return;

    try {
      const newMessage = {
        id: Date.now(),
        userName,
        text: text.trim(),
        timestamp: Date.now(),
        usedAI,
        suggestionType,
        emotionLevel: emotionLevel
      };

      const updatedMessages = [...messages, newMessage];
      const updatedRoom = { ...roomData, messages: updatedMessages };

      await window.storage.set(`room:${roomId}`, JSON.stringify(updatedRoom), true);
      
      setMessages(updatedMessages);
      setRoomData(updatedRoom);
      setCurrentMessage('');
      setAiSuggestions(null);
      setEmotionLevel('calm');
      
      analyzeOwnHealth(text.trim());
      
      if (usedAI) {
        setTimeout(() => setShowFeedback(newMessage.id), 1000);
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send message');
    }
  };

  const useSuggestion = (type) => {
    const text = aiSuggestions[type];
    sendMessage(text, true, type);
  };

  const quickAction = (action) => {
    setShowShortcuts(false);
    
    switch(action) {
      case 'understand':
        const theirMessages = messages.filter(m => m.userName !== userName);
        if (theirMessages.length > 0) {
          analyzeTheirMessage(theirMessages[theirMessages.length - 1]);
        } else {
          alert('No messages from other person yet');
        }
        break;
      case 'respond':
        getResponseSuggestions();
        break;
      case 'wisdom':
        getWisdom();
        break;
      case 'angry':
        getAngerCalmDown();
        break;
    }
  };

  const giveFeedback = async (messageId, helpful) => {
    try {
      const updatedMessages = messages.map(msg => 
        msg.id === messageId ? { ...msg, feedback: helpful ? 'helpful' : 'not_helpful' } : msg
      );
      
      const updatedRoom = { ...roomData, messages: updatedMessages };
      await window.storage.set(`room:${roomId}`, JSON.stringify(updatedRoom), true);
      
      setMessages(updatedMessages);
      setRoomData(updatedRoom);
      setShowFeedback(null);
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  if (screen === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-teal-100 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            {/* TODO: Add your ReChat logo here when deployed */}
            <div className="inline-block p-3 bg-teal-500/20 backdrop-blur-sm rounded-2xl mb-4">
              <MessageSquare className="w-8 h-8 text-teal-700" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">ReChat</h1>
            <p className="text-gray-600">
              AI helps you communicate with compassion
            </p>
          </div>

          <div className="space-y-4">
            {!roomId ? (
              <>
                <button
                  onClick={() => {
                    const newRoomId = 'room_' + Math.random().toString(36).substr(2, 9);
                    setRoomId(newRoomId);
                  }}
                  className="w-full bg-teal-500/90 backdrop-blur-sm text-white py-3 rounded-xl font-semibold hover:bg-teal-600 transition flex items-center justify-center gap-2 shadow-lg"
                >
                  <Users className="w-5 h-5" />
                  Create New Room
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white/80 text-gray-500">or</span>
                  </div>
                </div>

                <input
                  ref={roomIdInputRef}
                  type="text"
                  placeholder="Enter Room ID to join"
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => {
                    const id = roomIdInputRef.current?.value;
                    if (id && id.trim()) setRoomId(id.trim());
                  }}
                  className="w-full bg-white/50 backdrop-blur-sm text-gray-700 py-3 rounded-xl font-semibold hover:bg-white/70 transition"
                >
                  Join Room
                </button>
              </>
            ) : (
              <>
                <div className="bg-teal-500/10 backdrop-blur-sm border border-teal-200/50 rounded-xl p-4 mb-4">
                  <div className="text-sm text-gray-600 mb-1">Room ID:</div>
                  <div className="font-mono text-teal-700 font-semibold">{roomId}</div>
                  <div className="text-xs text-gray-500 mt-2">Share this with the other person</div>
                </div>

                <input
                  type="text"
                  placeholder="Your name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && enterRoom()}
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-teal-500"
                />

                <button
                  onClick={enterRoom}
                  className="w-full bg-teal-500/90 backdrop-blur-sm text-white py-3 rounded-xl font-semibold hover:bg-teal-600 transition shadow-lg"
                >
                  Enter Chat Room
                </button>

                <button
                  onClick={() => setRoomId('')}
                  className="w-full text-sm text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{roomName}</h1>
              <p className="text-sm text-gray-600">
                <span className="font-mono text-xs">{roomId}</span>
                <span className="mx-2">•</span>
                {userName}
              </p>
            </div>
          </div>
          
          {/* Self-Barometer */}
          <div className="mt-3">
            <button
              onClick={() => setShowBarometerDetail(!showBarometerDetail)}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">Your Communication Health</span>
                <span className="text-xs text-gray-500">
                  {selfBarometer.level === 'green' && '🟢 Healthy'}
                  {selfBarometer.level === 'yellow' && '🟡 Caution'}
                  {selfBarometer.level === 'orange' && '🟠 Warning'}
                  {selfBarometer.level === 'red' && '🔴 Concerning'}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200/50 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    selfBarometer.level === 'green' ? 'bg-green-500' :
                    selfBarometer.level === 'yellow' ? 'bg-yellow-500' :
                    selfBarometer.level === 'orange' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${selfBarometer.score}%` }}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Self-Barometer Detail */}
      {showBarometerDetail && selfBarometer.patterns && selfBarometer.patterns.length > 0 && (
        <div className="bg-gradient-to-br from-amber-100/40 to-orange-100/40 backdrop-blur-xl border-b border-white/20 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Self-Awareness Check</h3>
              <button onClick={() => setShowBarometerDetail(false)} className="text-sm text-gray-600">✕</button>
            </div>

            <div className="space-y-3">
              <div className={`backdrop-blur-md rounded-xl p-4 border shadow-lg ${
                selfBarometer.level === 'green' ? 'bg-green-100/60 border-green-300/50' :
                selfBarometer.level === 'yellow' ? 'bg-yellow-100/60 border-yellow-300/50' :
                selfBarometer.level === 'orange' ? 'bg-orange-100/60 border-orange-300/50' :
                'bg-red-100/60 border-red-300/50'
              }`}>
                <div className="text-xs font-semibold mb-2">PATTERNS:</div>
                <ul className="text-sm space-y-1">
                  {selfBarometer.patterns.map((pattern, i) => (
                    <li key={i}>• {pattern}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40 shadow-lg">
                <div className="text-xs font-semibold text-gray-700 mb-1">FEEDBACK</div>
                <div className="text-sm text-gray-800">{selfBarometer.feedback}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Shortcuts */}
      <button
        onClick={() => setShowShortcuts(!showShortcuts)}
        className="fixed right-6 bottom-24 z-50 w-14 h-14 bg-teal-500/90 backdrop-blur-md text-white rounded-full shadow-2xl hover:bg-teal-600 transition flex items-center justify-center border-2 border-white/30"
      >
        <span className="text-2xl">⚡</span>
      </button>

      {showShortcuts && (
        <div className="fixed right-6 bottom-40 z-50 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 p-3 space-y-2">
          <button
            onClick={() => quickAction('understand')}
            disabled={!messages.some(m => m.userName !== userName)}
            className="w-48 px-4 py-3 bg-blue-400/20 border border-blue-300/30 text-blue-700 rounded-xl hover:bg-blue-400/30 transition disabled:opacity-50 text-left flex items-center gap-3"
          >
            <span className="text-xl">🧠</span>
            <span className="text-sm font-medium">Understand Them</span>
          </button>
          
          <button
            onClick={() => quickAction('respond')}
            disabled={!messages.some(m => m.userName !== userName)}
            className="w-48 px-4 py-3 bg-green-400/20 border border-green-300/30 text-green-700 rounded-xl hover:bg-green-400/30 transition disabled:opacity-50 text-left flex items-center gap-3"
          >
            <span className="text-xl">💬</span>
            <span className="text-sm font-medium">Help Me Respond</span>
          </button>
          
          <button
            onClick={() => quickAction('wisdom')}
            disabled={messages.length < 2}
            className="w-48 px-4 py-3 bg-indigo-400/20 border border-indigo-300/30 text-indigo-700 rounded-xl hover:bg-indigo-400/30 transition disabled:opacity-50 text-left flex items-center gap-3"
          >
            <span className="text-xl">💡</span>
            <span className="text-sm font-medium">Get Wisdom</span>
          </button>
          
          <button
            onClick={() => quickAction('angry')}
            className="w-48 px-4 py-3 bg-red-400/20 border border-red-300/30 text-red-700 rounded-xl hover:bg-red-400/30 transition text-left flex items-center gap-3"
          >
            <span className="text-xl">🔥</span>
            <span className="text-sm font-medium">I'm Angry - Help</span>
          </button>

          <button
            onClick={() => setShowShortcuts(false)}
            className="w-48 px-4 py-2 bg-gray-200/50 text-gray-600 rounded-xl hover:bg-gray-200/70 transition text-center text-sm"
          >
            Close
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No messages yet. Start the conversation.</p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.userName === userName ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-lg rounded-2xl px-4 py-3 backdrop-blur-md relative ${
                  msg.userName === userName
                    ? 'bg-teal-500/90 text-white shadow-lg'
                    : 'bg-white/80 border border-white/30 shadow-md'
                }`}
              >
                <div className="text-xs opacity-75 mb-1">{msg.userName}</div>
                <div className="text-sm">{msg.text}</div>
                
                {/* Understand button for other person's messages */}
                {msg.userName !== userName && (
                  <button
                    onClick={() => analyzeTheirMessage(msg)}
                    disabled={isLoadingAI}
                    className="mt-2 px-3 py-1 bg-blue-400/20 border border-blue-300/50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-400/30 transition disabled:opacity-50 flex items-center gap-1"
                  >
                    🧠 Understand this
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Red Flag Warning */}
      {redFlagAnalysis && (
        <div className="border-t border-white/30 bg-gradient-to-br from-red-200/40 to-orange-200/40 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">
                🚨 Communication Warning - {redFlagAnalysis.severity}
              </h3>
              <button onClick={() => setRedFlagAnalysis(null)} className="text-sm text-gray-600">✕</button>
            </div>

            <div className="space-y-3">
              {redFlagAnalysis.redFlags && redFlagAnalysis.redFlags.length > 0 && (
                <div className="bg-red-100/60 backdrop-blur-md rounded-xl p-4 border border-red-300/50">
                  <div className="text-xs font-semibold text-red-800 mb-2">CONCERNING PATTERNS</div>
                  <ul className="text-sm text-red-900">
                    {redFlagAnalysis.redFlags.map((flag, i) => (
                      <li key={i}>• {flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
                <div className="text-xs font-semibold text-gray-700 mb-1">WHAT'S HAPPENING</div>
                <div className="text-sm text-gray-800">{redFlagAnalysis.explanation}</div>
              </div>

              <div className="bg-amber-100/60 backdrop-blur-md rounded-xl p-4 border border-amber-300/50">
                <div className="text-xs font-semibold text-amber-800 mb-1">RECOMMENDATION</div>
                <div className="text-sm text-amber-900">{redFlagAnalysis.recommendation}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anger Calm-Down Panel */}
      {angerCalmDown && (
        <div className="border-t border-white/30 bg-gradient-to-br from-orange-200/40 to-amber-200/40 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🫂</span>
                <h3 className="font-semibold text-gray-800">Take a Breath - I'm Here With You</h3>
              </div>
              <button onClick={() => setAngerCalmDown(null)} className="text-sm text-gray-600">✕</button>
            </div>

            <div className="space-y-3">
              <div className="bg-rose-100/60 backdrop-blur-md rounded-xl p-4 border border-rose-300/50 shadow-lg">
                <div className="text-xs font-semibold text-rose-700 mb-1">💗 YOUR FEELINGS ARE VALID</div>
                <div className="text-sm text-gray-800">{angerCalmDown.validation}</div>
              </div>

              <div className="bg-amber-100/60 backdrop-blur-md rounded-xl p-4 border border-amber-300/50 shadow-lg">
                <div className="text-xs font-semibold text-amber-700 mb-1">🎯 WHAT TRIGGERED THIS</div>
                <div className="text-sm text-gray-800">{angerCalmDown.understanding}</div>
              </div>

              <div className="bg-blue-100/60 backdrop-blur-md rounded-xl p-4 border border-blue-300/50 shadow-lg">
                <div className="text-xs font-semibold text-blue-700 mb-1">🌅 A DIFFERENT VIEW</div>
                <div className="text-sm text-gray-800">{angerCalmDown.perspective}</div>
              </div>

              <div className="bg-green-100/60 backdrop-blur-md rounded-xl p-4 border border-green-300/50 shadow-lg">
                <div className="text-xs font-semibold text-green-700 mb-1">🕊️ WHAT TO DO NOW</div>
                <div className="text-sm text-gray-800">{angerCalmDown.guidance}</div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setAngerCalmDown(null);
                  setEmotionLevel('angry');
                }}
                className="px-6 py-2 bg-teal-500/90 text-white rounded-xl hover:bg-teal-600 transition font-medium"
              >
                I'm ready to respond now
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-600 text-center italic">
              Take all the time you need. Your feelings matter.
            </div>
          </div>
        </div>
      )}

      {/* Wisdom Panel */}
      {wisdomAnalysis && (
        <div className="border-t border-white/30 bg-gradient-to-br from-indigo-200/40 to-purple-200/40 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">💡 Wisdom About This Situation</h3>
              <button onClick={() => setWisdomAnalysis(null)} className="text-sm text-gray-600">✕</button>
            </div>

            <div className="space-y-3">
              <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
                <div className="text-xs font-semibold text-indigo-700 mb-1">WHAT'S HAPPENING</div>
                <div className="text-sm text-gray-800">{wisdomAnalysis.situation}</div>
              </div>

              {wisdomAnalysis.patterns && (
                <div className="bg-purple-100/60 backdrop-blur-md rounded-xl p-4 border border-purple-300/50">
                  <div className="text-xs font-semibold text-purple-700 mb-1">PATTERNS</div>
                  <div className="text-sm text-gray-800">{wisdomAnalysis.patterns}</div>
                </div>
              )}

              <div className="bg-blue-100/60 backdrop-blur-md rounded-xl p-4 border border-blue-300/50">
                <div className="text-xs font-semibold text-blue-700 mb-1">GUIDANCE</div>
                <div className="text-sm text-gray-800">{wisdomAnalysis.guidance}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Suggestions */}
      {responseSuggestions && (
        <div className="border-t border-white/30 bg-gradient-to-br from-green-200/40 to-emerald-200/40 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">💬 Response Suggestions</h3>
              <button onClick={() => setResponseSuggestions(null)} className="text-sm text-gray-600">✕</button>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 mb-3 border border-white/40">
              <div className="text-xs text-gray-600 mb-1">{responseSuggestions.theirName} said:</div>
              <div className="text-sm text-gray-800 italic">"{responseSuggestions.theirMessage}"</div>
            </div>

            <div className="space-y-3">
              <ResponseOption
                label="COMPASSIONATE LISTENING"
                emoji="💚"
                color="green"
                text={responseSuggestions.compassionate}
                onSend={(text) => {
                  sendMessage(text, true, 'compassionate');
                  setResponseSuggestions(null);
                }}
              />

              <ResponseOption
                label="NEUTRAL RESPONSE"
                emoji="💬"
                color="blue"
                text={responseSuggestions.neutral}
                onSend={(text) => {
                  sendMessage(text, true, 'neutral');
                  setResponseSuggestions(null);
                }}
              />

              <ResponseOption
                label="POSITIVE RESPONSE"
                emoji="✨"
                color="purple"
                text={responseSuggestions.positive}
                onSend={(text) => {
                  sendMessage(text, true, 'positive');
                  setResponseSuggestions(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Message Analysis */}
      {messageAnalysis && (
        <div className="border-t border-white/30 bg-gradient-to-br from-blue-200/40 to-indigo-200/40 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">🧠 Understanding {messageAnalysis.userName}</h3>
              <button onClick={() => setMessageAnalysis(null)} className="text-sm text-gray-600">✕</button>
            </div>

            <div className="bg-gray-100/60 backdrop-blur-sm rounded-xl p-3 mb-4 border border-gray-300/50">
              <div className="text-xs text-gray-600 mb-1">Their message:</div>
              <div className="text-sm text-gray-800 italic">"{messageAnalysis.messageText}"</div>
            </div>

            <div className="space-y-3">
              <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40 shadow-lg">
                <div className="text-xs font-semibold text-blue-700 mb-2">😊 EMOTIONAL TONE</div>
                <div className="text-sm text-gray-800">{messageAnalysis.emotionalTone}</div>
              </div>

              <div className="bg-purple-100/60 backdrop-blur-md rounded-xl p-4 border border-purple-300/50 shadow-lg">
                <div className="text-xs font-semibold text-purple-700 mb-2">💬 LITERAL vs ACTUAL MEANING</div>
                <div className="text-sm text-gray-800">{messageAnalysis.literalVsActual}</div>
              </div>

              <div className="bg-indigo-100/60 backdrop-blur-md rounded-xl p-4 border border-indigo-300/50 shadow-lg">
                <div className="text-xs font-semibold text-indigo-700 mb-2">🔍 SUBTEXT (What's Implied)</div>
                <div className="text-sm text-gray-800">{messageAnalysis.subtext}</div>
              </div>

              <div className="bg-green-100/60 backdrop-blur-md rounded-xl p-4 border border-green-300/50 shadow-lg">
                <div className="text-xs font-semibold text-green-700 mb-2">💚 WHAT THEY NEED FROM YOU</div>
                <div className="text-sm text-gray-800">{messageAnalysis.theirNeed}</div>
              </div>

              <div className="bg-amber-100/60 backdrop-blur-md rounded-xl p-4 border border-amber-300/50 shadow-lg">
                <div className="text-xs font-semibold text-amber-700 mb-2">🤔 WHY THEY SAID IT THIS WAY</div>
                <div className="text-sm text-gray-800">{messageAnalysis.whyThisWay}</div>
              </div>

              <div className="bg-rose-100/60 backdrop-blur-md rounded-xl p-4 border border-rose-300/50 shadow-lg">
                <div className="text-xs font-semibold text-rose-700 mb-2">👀 SOCIAL CUES YOU MIGHT MISS</div>
                <div className="text-sm text-gray-800">{messageAnalysis.socialCues}</div>
              </div>

              <div className="bg-teal-100/60 backdrop-blur-md rounded-xl p-4 border border-teal-300/50 shadow-lg">
                <div className="text-xs font-semibold text-teal-700 mb-2">💡 HOW TO RESPOND</div>
                <div className="text-sm text-gray-800">{messageAnalysis.responseApproach}</div>
              </div>
            </div>

            <button
              onClick={() => setMessageAnalysis(null)}
              className="w-full mt-4 px-4 py-2 bg-white/60 text-gray-700 rounded-xl hover:bg-white/80 transition text-sm font-medium"
            >
              Got it - Close
            </button>
          </div>
        </div>
      )}

      {/* Feedback Panel */}
      {showFeedback && (
        <div className="border-t border-white/30 bg-gradient-to-br from-green-200/40 to-teal-200/40 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
              <div className="text-sm font-semibold text-gray-800 mb-3">Did that AI suggestion help?</div>
              <div className="flex gap-3">
                <button
                  onClick={() => giveFeedback(showFeedback, true)}
                  className="flex-1 px-4 py-2 bg-green-400/30 text-green-800 rounded-xl hover:bg-green-400/40 transition font-medium"
                >
                  👍 Yes
                </button>
                <button
                  onClick={() => giveFeedback(showFeedback, false)}
                  className="flex-1 px-4 py-2 bg-gray-200/50 text-gray-700 rounded-xl hover:bg-gray-200/60 transition font-medium"
                >
                  👎 Not really
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions Panel */}
      {aiSuggestions && (
        <div className="border-t border-white/30 bg-gradient-to-br from-teal-200/40 to-cyan-200/40 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            {emotionLevel === 'angry' && (
              <div className="mb-3 bg-amber-300/30 border border-amber-300/50 rounded-xl p-3">
                <div className="text-sm text-amber-900">
                  <strong>I can tell you're angry.</strong> That's valid. Here are suggestions - you can still edit your original or send as-is.
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-teal-700" />
              <h3 className="font-semibold text-gray-800">AI Suggestions (Your Choice)</h3>
            </div>

            <div className="bg-white/60 rounded-xl p-4 mb-3 border border-white/40">
              <div className="text-xs text-gray-600 mb-1">What you seem to be feeling:</div>
              <div className="text-sm text-gray-800 italic">{aiSuggestions.summary}</div>
            </div>

            <div className="bg-white/50 rounded-xl p-3 mb-3 border border-white/40">
              <div className="text-xs text-gray-600 mb-1">YOUR ORIGINAL:</div>
              <div className="text-sm text-gray-800 font-medium">{currentMessage}</div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => sendMessage(currentMessage, false)}
                  className="flex-1 px-3 py-1.5 bg-gray-300/50 text-gray-700 rounded-lg text-sm hover:bg-gray-300/70 transition"
                >
                  Send Original
                </button>
                <button
                  onClick={() => setAiSuggestions(null)}
                  className="flex-1 px-3 py-1.5 bg-gray-200/50 text-gray-600 rounded-lg text-sm hover:bg-gray-200/70 transition"
                >
                  Keep Editing
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => useSuggestion('vulnerable')}
                className="bg-white/60 border-2 border-rose-300/50 hover:border-rose-400/70 rounded-xl p-3 text-left transition"
              >
                <div className="text-xs font-semibold text-rose-700 mb-1">💝 VULNERABLE</div>
                <div className="text-sm text-gray-800">{aiSuggestions.vulnerable}</div>
              </button>

              <button
                onClick={() => useSuggestion('clear')}
                className="bg-white/60 border-2 border-cyan-300/50 hover:border-cyan-400/70 rounded-xl p-3 text-left transition"
              >
                <div className="text-xs font-semibold text-cyan-700 mb-1">💬 CLEAR</div>
                <div className="text-sm text-gray-800">{aiSuggestions.clear}</div>
              </button>

              <button
                onClick={() => useSuggestion('connecting')}
                className="bg-white/60 border-2 border-emerald-300/50 hover:border-emerald-400/70 rounded-xl p-3 text-left transition"
              >
                <div className="text-xs font-semibold text-emerald-700 mb-1">🤝 CONNECTING</div>
                <div className="text-sm text-gray-800">{aiSuggestions.connecting}</div>
              </button>
            </div>

            <button
              onClick={() => setAiSuggestions(null)}
              className="w-full mt-3 text-sm text-gray-600 hover:text-gray-800 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!showFeedback && !aiSuggestions && !messageAnalysis && !responseSuggestions && !wisdomAnalysis && !angerCalmDown && (
        <div className="border-t border-white/30 bg-white/60 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            {messages.some(m => m.userName !== userName) && (
              <div className="mb-3 grid grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    const theirMessages = messages.filter(m => m.userName !== userName);
                    if (theirMessages.length > 0) {
                      analyzeTheirMessage(theirMessages[theirMessages.length - 1]);
                    }
                  }}
                  disabled={isLoadingAI}
                  className="bg-blue-400/20 border border-blue-300/30 text-blue-700 py-2 rounded-xl text-xs font-medium hover:bg-blue-400/30 transition disabled:opacity-50"
                >
                  🧠 Understand
                </button>
                <button
                  onClick={getResponseSuggestions}
                  disabled={isLoadingAI}
                  className="bg-green-400/20 border border-green-300/30 text-green-700 py-2 rounded-xl text-xs font-medium hover:bg-green-400/30 transition disabled:opacity-50"
                >
                  💬 Respond
                </button>
                <button
                  onClick={getWisdom}
                  disabled={isLoadingAI || messages.length < 2}
                  className="bg-indigo-400/20 border border-indigo-300/30 text-indigo-700 py-2 rounded-xl text-xs font-medium hover:bg-indigo-400/30 transition disabled:opacity-50"
                >
                  💡 Wisdom
                </button>
                <button
                  onClick={getAngerCalmDown}
                  disabled={isLoadingAI}
                  className="bg-red-400/20 border border-red-300/30 text-red-700 py-2 rounded-xl text-xs font-medium hover:bg-red-400/30 transition disabled:opacity-50"
                >
                  🔥 Angry
                </button>
              </div>
            )}

            {currentMessage && detectEmotion(currentMessage) !== 'calm' && (
              <div className="mb-3 bg-amber-300/20 border border-amber-200/50 rounded-xl p-2">
                <div className="text-xs text-amber-800">
                  {detectEmotion(currentMessage) === 'angry' && '🔥 I notice strong emotion. I can help you express this safely.'}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => {
                  setCurrentMessage(e.target.value);
                  setEmotionLevel(detectEmotion(e.target.value));
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    getAIHelp();
                  }
                }}
                placeholder="Type your message..."
                autoComplete="off"
                className="flex-1 px-4 py-3 bg-white/50 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={getAIHelp}
                disabled={isLoadingAI || !currentMessage.trim()}
                className="px-6 py-3 bg-teal-500/90 text-white rounded-xl font-semibold hover:bg-teal-600 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isLoadingAI ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => sendMessage(currentMessage, false)}
                disabled={!currentMessage.trim()}
                className="px-4 py-3 bg-gray-300/50 text-gray-700 rounded-xl hover:bg-gray-300/70 transition disabled:opacity-50"
                title="Send without AI"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Press Enter or ✨ for AI suggestions, or → to send as-is
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
