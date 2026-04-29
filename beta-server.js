const express = require('express');
const cors = require('cors');
const app = express();
const port = 54321;

app.use(cors());
app.use(express.json());

// Mock daily-checkin-ai endpoint
app.post('/daily-checkin-ai', async (req, res) => {
  console.log('Daily check-in AI request:', req.body);
  
  try {
    const { mood, confidence_level, stress_level, sleep_quality, trading_plan, planned_pairs, daily_risk_limit, max_trades } = req.body;
    
    // Mock AI response based on mood
    let response = '';
    if (mood === 'confident' || mood === 'excited') {
      response = "Great energy today! Stay focused on your plan and don't let overconfidence lead to impulsive trades. 🎯";
    } else if (mood === 'anxious' || mood === 'frustrated') {
      response = "Take a deep breath. Consider reducing position size today and focus on your best setups. Patience is key. 🧘";
    } else {
      response = "Solid mindset. Stick to your trading plan and manage risk carefully. You've got this! 💪";
    }
    
    res.json({ message: response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mock ai-support-chat endpoint
app.post('/ai-support-chat', async (req, res) => {
  console.log('AI support chat request:', req.body);
  
  try {
    const { messages } = req.body;
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Simple mock responses
    let response = '';
    let shouldEscalate = false;
    
    if (lastMessage.toLowerCase().includes('payment') || lastMessage.toLowerCase().includes('billing')) {
      response = "I understand you have a payment question. Let me connect you with our billing team who can help you better.";
      shouldEscalate = true;
    } else if (lastMessage.toLowerCase().includes('security') || lastMessage.toLowerCase().includes('hack')) {
      response = "For security concerns, I'll immediately connect you with our security team.";
      shouldEscalate = true;
    } else {
      response = "I can help you with general questions about YUNIX. Could you provide more details about what you need assistance with?";
    }
    
    res.json({ message, shouldEscalate });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mock chat endpoint
app.post('/chat', async (req, res) => {
  console.log('Chat request:', req.body);
  
  try {
    const { messages } = req.body;
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Simple mock response
    const response = `I understand you're asking about: "${lastMessage}". This is a mock response for beta preview. The actual AI integration will be available soon.`;
    
    res.json({ response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 YUNIX AI Functions Server running on http://localhost:${port}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /daily-checkin-ai - Daily check-in AI coaching`);
  console.log(`   POST /ai-support-chat - Support AI assistant`);
  console.log(`   POST /chat - General AI chat`);
  console.log(`\n🔗 Beta preview ready!`);
});
