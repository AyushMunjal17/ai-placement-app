const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Support both Gemini and Groq APIs
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Prefer Groq if available (easier to set up)
const AI_PROVIDER = GROQ_API_KEY ? 'groq' : 'gemini';

// @route   POST /api/ai/debug
// @desc    Get AI-powered debugging help for code errors
// @access  Private
router.post('/debug', authenticateToken, async (req, res) => {
  try {
    console.log('🤖 AI Debug request received');
    console.log('Request body:', { 
      hasCode: !!req.body.code, 
      language: req.body.language, 
      hasError: !!req.body.error 
    });
    
    const { code, language, error, problemDescription } = req.body;

    if (!code || !language || !error) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        message: 'Code, language, and error are required'
      });
    }

    // Check if API key is configured
    console.log('🔑 Checking API key...');
    console.log('AI Provider:', AI_PROVIDER);
    console.log('Groq Key exists:', !!GROQ_API_KEY);
    console.log('Gemini Key exists:', !!GEMINI_API_KEY);
    
    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      console.log('❌ No API key configured');
      return res.status(503).json({
        message: 'AI debugging is not configured. Please add GROQ_API_KEY or GEMINI_API_KEY to environment variables.',
        hint: 'Get a free Groq API key from https://console.groq.com/keys (recommended, easier setup)'
      });
    }
    
    console.log(`✅ API key configured, making request to ${AI_PROVIDER}...`);

    // Prepare the prompt for AI
    const prompt = `You are an expert programming tutor helping a student debug their code.

**Problem Context:**
${problemDescription || 'A coding problem'}

**Programming Language:** ${language}

**Student's Code:**
\`\`\`${language}
${code}
\`\`\`

**Error/Issue:**
${error}

Please provide:
1. **What's Wrong**: Explain the error in simple terms
2. **Why It Happened**: Explain the root cause
3. **How to Fix**: Provide specific suggestions (don't give the complete solution, just hints)
4. **Learning Tip**: A quick tip to avoid this error in the future

Keep your response concise, friendly, and educational. Format your response in markdown.`;

    // Call AI API based on provider
    let aiResponse;
    
    if (AI_PROVIDER === 'groq') {
      // Use Groq API (simpler and more reliable)
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Got response from Groq');
      aiResponse = response.data?.choices?.[0]?.message?.content;
    } else {
      // Use Gemini API
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await axios.post(
        apiUrl,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Got response from Gemini');
      aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    res.json({
      success: true,
      debugging: aiResponse
    });

  } catch (error) {
    console.error('❌ AI Debug error details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
    console.error('Full error:', error);
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        message: 'AI service rate limit reached. Please try again in a moment.'
      });
    }

    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.log('❌ 400 Error details:', errorMsg);
      return res.status(400).json({
        message: 'Invalid API request: ' + errorMsg,
        error: errorMsg,
        details: error.response?.data,
        hint: 'Check if your API key is valid and has proper permissions'
      });
    }

    res.status(500).json({
      message: 'Failed to get AI debugging help',
      error: error.message,
      details: error.response?.data?.error?.message || 'Unknown error'
    });
  }
});

// @route   POST /api/ai/explain
// @desc    Get AI explanation for code
// @access  Private
router.post('/explain', authenticateToken, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        message: 'Code and language are required'
      });
    }

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      return res.status(503).json({
        message: 'AI service is not configured.'
      });
    }

    const prompt = `Explain this ${language} code in simple terms. Break it down line by line if needed:

\`\`\`${language}
${code}
\`\`\`

Provide a clear, beginner-friendly explanation.`;

    let aiResponse;
    
    if (AI_PROVIDER === 'groq') {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      aiResponse = response.data?.choices?.[0]?.message?.content;
    } else {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await axios.post(
        apiUrl,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    res.json({
      success: true,
      explanation: aiResponse
    });

  } catch (error) {
    console.error('AI Explain error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to get AI explanation',
      error: error.message
    });
  }
});

module.exports = router;
