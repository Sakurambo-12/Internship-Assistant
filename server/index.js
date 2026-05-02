require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.post('/api/analyse', async (req, res) => {
  const { cvText, jobDescription, company, role } = req.body;
  const cleanCv = cvText.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').substring(0, 8000);

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `You are an expert career coach. Analyse this CV against the job description.

CV: ${cleanCv}

Job Description: ${jobDescription}

Company: ${company}
Role: ${role}

Respond in this exact JSON format with no markdown, no backticks, just raw JSON:
{
  "fitScore": 75,
  "fitReason": "brief explanation",
  "skillGaps": [
    { "skill": "Docker", "advice": "Take a free Docker tutorial on YouTube and add a project using it" }
  ],
  "coverLetter": "full cover letter text here"
}`
        }],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const rawText = response.data.choices[0].message.content;
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const { error } = await supabase
      .from('applications')
      .insert({
        company,
        role,
        fit_score: parsed.fitScore,
        skill_gaps: parsed.skillGaps,
        cover_letter: parsed.coverLetter
      });

    if (error) console.error('Supabase error:', error.message);

    res.json(parsed);
  } catch (err) {
    console.error('Full error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/api/applications', async (req, res) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});