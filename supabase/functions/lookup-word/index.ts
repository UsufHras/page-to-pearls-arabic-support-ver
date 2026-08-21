import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const word: string = typeof body.word === 'string' ? body.word.trim() : '';
    const sentence: string = typeof body.sentence === 'string' ? body.sentence.trim() : '';
    const targetLanguage: string =
      typeof body.targetLanguage === 'string' && body.targetLanguage.trim()
        ? body.targetLanguage.trim()
        : 'Arabic';

    if (!word) {
      return new Response(
        JSON.stringify({ success: false, error: 'A word is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const systemPrompt = `You are a bilingual dictionary. For the requested word, return ONLY a valid JSON object (no markdown, no commentary) with this exact structure:
{
  "word": "the base/dictionary form of the word",
  "pronunciation": "IPA transcription",
  "definition": "clear, concise definition that fits the meaning used in the given sentence",
  "difficulty": "one of A1, A2, B1, B2, C1, C2",
  "translation": "the ${targetLanguage} translation of the word",
  "examples": ["Example sentence one.", "Example sentence two."],
  "collocations": ["~ truth", "~ change"],
  "synonyms": ["synonym1", "synonym2"],
  "antonyms": ["antonym1", "antonym2"]
}
Use an empty array when a field does not apply.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: sentence
              ? `Word: "${word}"\nSentence it appears in: "${sentence}"`
              : `Word: "${word}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      const status = response.status === 429 || response.status === 402 ? response.status : 500;
      const message =
        response.status === 429
          ? 'Rate limit exceeded. Please try again in a moment.'
          : response.status === 402
            ? 'Usage limit reached. Please add credits to continue.'
            : 'Failed to look up this word';
      return new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    let content: string = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (content.startsWith('```json')) content = content.slice(7);
    else if (content.startsWith('```')) content = content.slice(3);
    if (content.endsWith('```')) content = content.slice(0, -3);

    let entry;
    try {
      entry = JSON.parse(content.trim());
    } catch (e) {
      console.error('Failed to parse lookup response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse the dictionary entry' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true, entry }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in lookup-word:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
