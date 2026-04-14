const express = require('express');
const axios = require('axios');
const Interview = require('../models/Interview');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_PROVIDER = GROQ_API_KEY ? 'groq' : 'gemini';

const SYSTEM_PROMPT = `You are an expert technical interviewer. Your goal is to conduct a realistic, challenging, and professional technical interview.
Follow these rules:
1. Start by introducing yourself and stating the role being interviewed for.
2. Ask one question at a time.
3. Wait for the user's response before providing feedback or asking the next question.
4. Provide constructive, brief feedback after each answer.
5. If the user's answer is incomplete, ask a follow-up question.
6. After exactly 3 user answers, conclude the interview. You MUST say "The interview is now concluded. I will now generate your performance report."
7. Maintain a professional yet encouraging tone.`;

async function callAI(messages, temperature = 0.7) {
    if (AI_PROVIDER === 'groq') {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages,
                temperature,
                max_tokens: 1000
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data?.choices?.[0]?.message?.content;
    } else {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        // Convert OpenAI messages to Gemini parts
        const contents = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // Note: Gemini 1.5 doesn't have a direct "system" role in the same way, 
        // but we can prepend it to the first user message or use systemInstruction in newer SDKs.
        // For this implementation, we'll keep it simple for axios.

        const response = await axios.post(
            apiUrl,
            {
                contents,
                generationConfig: { temperature, maxOutputTokens: 1000 }
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }
}

// @route   POST /api/interview/start
// @desc    Start a new interview session
// @access  Private
router.post('/start', authenticateToken, async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) return res.status(400).json({ message: 'Role is required' });

        const interview = new Interview({
            userId: req.user._id,
            role,
            status: 'in-progress'
        });

        const messages = [
            { role: 'user', content: SYSTEM_PROMPT },
            { role: 'user', content: `Start the interview for the role of ${role}.` }
        ];

        const aiResponse = await callAI(messages);

        interview.transcript.push({
            role: 'assistant',
            content: aiResponse
        });

        await interview.save();

        res.json({
            success: true,
            interviewId: interview._id,
            message: aiResponse
        });
    } catch (error) {
        console.error('Start interview error:', error);
        res.status(500).json({ message: 'Failed to start interview', error: error.message });
    }
});

// @route   POST /api/interview/answer
// @desc    Submit an answer and get feedback/next question
// @access  Private
router.post('/answer', authenticateToken, async (req, res) => {
    try {
        const { interviewId, answer } = req.body;
        const interview = await Interview.findById(interviewId);

        if (!interview || interview.status !== 'in-progress') {
            return res.status(404).json({ message: 'Active interview not found' });
        }

        // Add user answer to transcript
        interview.transcript.push({
            role: 'user',
            content: answer
        });

        // Prepare messages for AI
        const messages = [
            { role: 'user', content: SYSTEM_PROMPT },
            ...interview.transcript.map(t => ({ role: t.role, content: t.content }))
        ];

        const aiResponse = await callAI(messages);

        // Check if AI is concluding (look for keywords or just add to transcript)
        interview.transcript.push({
            role: 'assistant',
            content: aiResponse
        });

        // Simple heuristic to check for conclusion
        if (aiResponse.toLowerCase().includes('concluded') ||
            aiResponse.toLowerCase().includes('summary') ||
            interview.transcript.length >= 7) { // 3 User Answers + Intro + 3 Qs = 7
            interview.status = 'completed';
            interview.completedAt = Date.now();

            // Request a final score and summary in the background or separately
            const reportPrompt = `Based on the transcript above, provide a JSON report with:
      - overallScore (0-100)
      - feedbackSummary (string)
      - strengths (array of strings)
      - weaknesses (array of strings)
      - improvementTips (array of strings)`;

            const reportResponse = await callAI([...messages, { role: 'assistant', content: aiResponse }, { role: 'user', content: reportPrompt }]);

            try {
                // AI might return Markdown, so try to extract JSON
                const jsonMatch = reportResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const report = JSON.parse(jsonMatch[0]);
                    interview.overallScore = report.overallScore || 0;
                    interview.feedbackSummary = report.feedbackSummary || '';
                    interview.strengths = report.strengths || [];
                    interview.weaknesses = report.weaknesses || [];
                    interview.improvementTips = report.improvementTips || [];
                }
            } catch (e) {
                console.warn('Failed to parse AI report JSON', e);
            }
        }

        await interview.save();

        res.json({
            success: true,
            message: aiResponse,
            status: interview.status,
            report: interview.status === 'completed' ? {
                score: interview.overallScore,
                summary: interview.feedbackSummary,
                strengths: interview.strengths,
                weaknesses: interview.weaknesses,
                tips: interview.improvementTips
            } : null
        });
    } catch (error) {
        console.error('Answer interview error:', error);
        res.status(500).json({ message: 'Failed to process answer', error: error.message });
    }
});

// @route   GET /api/interview/:id
// @desc    Get interview details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) return res.status(404).json({ message: 'Interview not found' });
        if (interview.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });

        res.json({ success: true, interview });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving interview', error: error.message });
    }
});

module.exports = router;
