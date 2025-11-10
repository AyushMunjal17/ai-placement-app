const express = require('express');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const Resume = require('../models/Resume');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_PROVIDER = GROQ_API_KEY ? 'groq' : 'gemini';

// @route   POST /api/resume
// @desc    Create or update resume
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeData = req.body;

    // Check if resume exists
    let resume = await Resume.findOne({ userId });

    if (resume) {
      // Update existing resume
      Object.assign(resume, resumeData);
      await resume.save();
    } else {
      // Create new resume
      resume = new Resume({
        userId,
        ...resumeData
      });
      await resume.save();
    }

    res.json({
      message: 'Resume saved successfully',
      resume
    });
  } catch (error) {
    console.error('Save resume error:', error);
    res.status(500).json({
      message: 'Failed to save resume',
      error: error.message
    });
  }
});

// @route   GET /api/resume
// @desc    Get user's resume
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const resume = await Resume.findOne({ userId });

    if (!resume) {
      return res.status(404).json({
        message: 'Resume not found'
      });
    }

    res.json({
      message: 'Resume retrieved successfully',
      resume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      message: 'Failed to retrieve resume',
      error: error.message
    });
  }
});

// @route   POST /api/resume/enhance
// @desc    Enhance resume content with AI
// @access  Private
router.post('/enhance', authenticateToken, async (req, res) => {
  try {
    const { text, type } = req.body; // type: 'summary', 'experience', 'project'

    if (!text) {
      return res.status(400).json({
        message: 'Text is required'
      });
    }

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      return res.status(503).json({
        message: 'AI service is not configured'
      });
    }

    let prompt = '';
    
    switch(type) {
      case 'summary':
        prompt = `Enhance this resume summary to be more professional, ATS-friendly, and impactful. Keep it concise (2-3 sentences). Focus on skills, experience, and career goals:\n\n"${text}"\n\nProvide only the enhanced summary, no explanations.`;
        break;
      case 'experience':
        prompt = `Enhance this job experience description to be more professional and ATS-friendly. Use action verbs and quantify achievements where possible:\n\n"${text}"\n\nProvide only the enhanced description with bullet points, no explanations.`;
        break;
      case 'project':
        prompt = `Enhance this project description to be more professional and highlight technical skills and impact:\n\n"${text}"\n\nProvide only the enhanced description with bullet points, no explanations.`;
        break;
      default:
        prompt = `Enhance this resume content to be more professional and ATS-friendly:\n\n"${text}"\n\nProvide only the enhanced content, no explanations.`;
    }

    let enhancedText;

    if (AI_PROVIDER === 'groq') {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a professional resume writer specializing in ATS-friendly resumes. Provide concise, impactful content.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      enhancedText = response.data?.choices?.[0]?.message?.content;
    } else {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await axios.post(
        apiUrl,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      enhancedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    res.json({
      success: true,
      original: text,
      enhanced: enhancedText
    });
  } catch (error) {
    console.error('Enhance resume error:', error);
    res.status(500).json({
      message: 'Failed to enhance content',
      error: error.message
    });
  }
});

// @route   GET /api/resume/download/:id
// @desc    Download resume as PDF
// @access  Private
router.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({
        message: 'Resume not found'
      });
    }

    // Check if user owns this resume
    if (resume.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Unauthorized'
      });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=resume-${resume.personalInfo.fullName.replace(/\s+/g, '-')}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Generate PDF based on template
    generatePDF(doc, resume);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
});

// Helper function to generate PDF
function generatePDF(doc, resume) {
  const { personalInfo, education, experience, projects, skills, certifications, achievements, template } = resume;

  // Colors based on template
  const colors = {
    professional: { primary: '#2C3E50', secondary: '#34495E', accent: '#3498DB' },
    creative: { primary: '#8E44AD', secondary: '#9B59B6', accent: '#E74C3C' },
    technical: { primary: '#16A085', secondary: '#1ABC9C', accent: '#2980B9' },
    minimal: { primary: '#2C3E50', secondary: '#7F8C8D', accent: '#95A5A6' }
  };

  const color = colors[template] || colors.professional;

  // Header - Name and Contact
  doc.fontSize(28).fillColor(color.primary).text(personalInfo.fullName, { align: 'center' });
  doc.moveDown(0.3);
  
  doc.fontSize(10).fillColor(color.secondary);
  const contactInfo = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location
  ].filter(Boolean).join(' | ');
  doc.text(contactInfo, { align: 'center' });
  
  if (personalInfo.linkedin || personalInfo.github || personalInfo.portfolio) {
    doc.moveDown(0.2);
    const links = [];
    if (personalInfo.linkedin) links.push(personalInfo.linkedin);
    if (personalInfo.github) links.push(personalInfo.github);
    if (personalInfo.portfolio) links.push(personalInfo.portfolio);
    doc.fontSize(9).fillColor(color.accent).text(links.join(' | '), { align: 'center', link: links[0] });
  }

  doc.moveDown(1);
  addLine(doc, color.primary);

  // Summary
  if (personalInfo.summary) {
    addSection(doc, 'PROFESSIONAL SUMMARY', color);
    doc.fontSize(10).fillColor('#000000').text(personalInfo.summary, { align: 'justify' });
    doc.moveDown(1);
  }

  // Education
  if (education && education.length > 0) {
    addSection(doc, 'EDUCATION', color);
    education.forEach((edu, index) => {
      doc.fontSize(11).fillColor(color.primary).text(edu.institution, { continued: true });
      doc.fontSize(9).fillColor(color.secondary).text(` | ${edu.startDate} - ${edu.endDate}`, { align: 'right' });
      doc.fontSize(10).fillColor('#000000').text(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`);
      if (edu.grade) doc.fontSize(9).text(`Grade: ${edu.grade}`);
      if (edu.description) doc.fontSize(9).text(edu.description);
      if (index < education.length - 1) doc.moveDown(0.5);
    });
    doc.moveDown(1);
  }

  // Experience
  if (experience && experience.length > 0) {
    addSection(doc, 'WORK EXPERIENCE', color);
    experience.forEach((exp, index) => {
      doc.fontSize(11).fillColor(color.primary).text(exp.position, { continued: true });
      doc.fontSize(9).fillColor(color.secondary).text(` | ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`, { align: 'right' });
      doc.fontSize(10).fillColor('#000000').text(`${exp.company}${exp.location ? ', ' + exp.location : ''}`);
      if (exp.description) {
        doc.fontSize(9).text(exp.description);
      }
      if (exp.achievements && exp.achievements.length > 0) {
        exp.achievements.forEach(achievement => {
          doc.fontSize(9).text(`• ${achievement}`, { indent: 10 });
        });
      }
      if (index < experience.length - 1) doc.moveDown(0.5);
    });
    doc.moveDown(1);
  }

  // Projects
  if (projects && projects.length > 0) {
    addSection(doc, 'PROJECTS', color);
    projects.forEach((project, index) => {
      doc.fontSize(11).fillColor(color.primary).text(project.name);
      if (project.technologies && project.technologies.length > 0) {
        doc.fontSize(9).fillColor(color.secondary).text(`Technologies: ${project.technologies.join(', ')}`);
      }
      if (project.description) {
        doc.fontSize(9).fillColor('#000000').text(project.description);
      }
      if (project.highlights && project.highlights.length > 0) {
        project.highlights.forEach(highlight => {
          doc.fontSize(9).text(`• ${highlight}`, { indent: 10 });
        });
      }
      if (project.link || project.github) {
        const links = [];
        if (project.link) links.push(`Demo: ${project.link}`);
        if (project.github) links.push(`GitHub: ${project.github}`);
        doc.fontSize(8).fillColor(color.accent).text(links.join(' | '));
      }
      if (index < projects.length - 1) doc.moveDown(0.5);
    });
    doc.moveDown(1);
  }

  // Skills
  if (skills && (skills.technical?.length || skills.soft?.length || skills.languages?.length || skills.tools?.length)) {
    addSection(doc, 'SKILLS', color);
    if (skills.technical && skills.technical.length > 0) {
      doc.fontSize(10).fillColor(color.primary).text('Technical: ', { continued: true });
      doc.fillColor('#000000').text(skills.technical.join(', '));
    }
    if (skills.tools && skills.tools.length > 0) {
      doc.fontSize(10).fillColor(color.primary).text('Tools & Frameworks: ', { continued: true });
      doc.fillColor('#000000').text(skills.tools.join(', '));
    }
    if (skills.soft && skills.soft.length > 0) {
      doc.fontSize(10).fillColor(color.primary).text('Soft Skills: ', { continued: true });
      doc.fillColor('#000000').text(skills.soft.join(', '));
    }
    if (skills.languages && skills.languages.length > 0) {
      doc.fontSize(10).fillColor(color.primary).text('Languages: ', { continued: true });
      doc.fillColor('#000000').text(skills.languages.join(', '));
    }
    doc.moveDown(1);
  }

  // Certifications
  if (certifications && certifications.length > 0) {
    addSection(doc, 'CERTIFICATIONS', color);
    certifications.forEach(cert => {
      doc.fontSize(10).fillColor('#000000').text(`• ${cert.name}`, { continued: true });
      doc.fontSize(9).fillColor(color.secondary).text(` - ${cert.issuer} (${cert.date})`, { align: 'left' });
    });
    doc.moveDown(1);
  }

  // Achievements
  if (achievements && achievements.length > 0) {
    addSection(doc, 'ACHIEVEMENTS', color);
    achievements.forEach(achievement => {
      doc.fontSize(9).fillColor('#000000').text(`• ${achievement}`);
    });
  }
}

function addSection(doc, title, color) {
  doc.fontSize(13).fillColor(color.primary).text(title, { underline: false });
  doc.moveDown(0.3);
  addLine(doc, color.accent, 1);
  doc.moveDown(0.5);
}

function addLine(doc, color, width = 2) {
  const y = doc.y;
  doc.strokeColor(color).lineWidth(width).moveTo(50, y).lineTo(545, y).stroke();
  doc.moveDown(0.5);
}

module.exports = router;
