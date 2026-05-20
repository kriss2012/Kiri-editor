const fs = require('fs');
require('dotenv').config();
const geminiKey = process.env.GEMINI_API_KEY;
const groqKey = process.env.GROQ_API_KEY;

const fullPrompt = 'Respond ONLY with JSON format: {"explanation": "test", "files": [], "commands": []}';
const systemPrompt = 'Respond ONLY with JSON.';

async function test() {
  let lastError = null;
  console.log('Testing Gemini...');
  if (geminiKey) {
    try {
      const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + geminiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error('Gemini API Error: ' + (data.error?.message || JSON.stringify(data)));
      console.log('Gemini Success!', data.candidates[0].content.parts[0].text.substring(0, 50));
    } catch (err) {
      console.error('Gemini Failed:', err.message);
      lastError = err;
    }
  } else {
    console.log("No Gemini Key");
  }

  console.log('Testing Groq...');
  if (groqKey) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: fullPrompt }],
          response_format: { type: 'json_object' }
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error('Groq API Error: ' + (data.error?.message || JSON.stringify(data)));
      console.log('Groq Success!', data.choices[0].message.content.substring(0, 50));
    } catch (err) {
      console.error('Groq Failed:', err.message);
      lastError = err;
    }
  } else {
    console.log("No Groq Key");
  }
}
test();
