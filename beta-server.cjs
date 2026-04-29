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

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>YUNIX AI Functions - Beta Preview</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; }
        .container { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; }
        h1 { text-align: center; margin-bottom: 30px; font-size: 2.5em; }
        .endpoint { background: rgba(255, 255, 255, 0.1); border-radius: 15px; padding: 20px; margin: 20px 0; }
        .endpoint h3 { color: #ffd700; margin-top: 0; }
        .method { background: #ffd700; color: #333; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
        pre { background: rgba(0, 0, 0, 0.2); padding: 10px; border-radius: 5px; overflow-x: auto; }
        a { color: #ffd700; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 YUNIX AI Functions - Beta Preview</h1>
        
        <div class="endpoint">
            <h3><span class="method">POST</span> /daily-checkin-ai</h3>
            <p>Daily check-in AI coaching functionality</p>
            <pre>{
  "mood": "confident",
  "confidence_level": 8,
  "stress_level": 3,
  "sleep_quality": "good",
  "trading_plan": "Focus on London setups",
  "planned_pairs": ["EURUSD", "GBPUSD"],
  "daily_risk_limit": 2,
  "max_trades": 3
}</pre>
        </div>

        <div class="endpoint">
            <h3><span class="method">POST</span> /ai-support-chat</h3>
            <p>AI support assistant with escalation logic</p>
            <pre>{
  "messages": [
    { "role": "user", "content": "I have a billing question" }
  ]
}</pre>
        </div>

        <div class="endpoint">
            <h3><span class="method">POST</span> /chat</h3>
            <p>General AI chat functionality</p>
            <pre>{
  "messages": [
    { "role": "user", "content": "Hello, how are you?" }
  ]
}</pre>
        </div>

        <p style="text-align: center; margin-top: 30px;">
            📖 <a href="/beta-preview.html">Open Interactive Test Interface</a>
        </p>
    </div>
</body>
</html>
  `);
});

// Serve the beta preview HTML file
app.get('/beta-preview.html', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const htmlPath = path.join(__dirname, 'beta-preview.html');
  
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send('Beta preview file not found');
  }
});

app.listen(port, () => {
  console.log(`🚀 YUNIX AI Functions Server running on http://localhost:${port}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   GET  / - API documentation`);
  console.log(`   GET  /beta-preview.html - Interactive test interface`);
  console.log(`   POST /daily-checkin-ai - Daily check-in AI coaching`);
  console.log(`   POST /ai-support-chat - Support AI assistant`);
  console.log(`   POST /chat - General AI chat`);
  console.log(`\n🔗 Beta preview ready!`);
  console.log(`\n🌐 Open http://localhost:${port} in your browser`);
});
