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
    const images: string[] = Array.isArray(body.imagesBase64)
      ? body.imagesBase64
      : body.imageBase64
        ? [body.imageBase64]
        : [];

    if (images.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (images.length > 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum 10 pages per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${images.length} image(s) for vocabulary extraction...`);

    const systemPrompt = `You are a vocabulary extraction expert. Analyze the image(s) of book pages and identify ALL highlighted or marked words across ALL pages. Merge duplicates (a word highlighted on more than one page should appear only once). For each highlighted word, provide:

1. The word exactly as it appears
2. A clear, concise definition
3. The CEFR difficulty level of the word: one of "A1", "A2", "B1", "B2", "C1", "C2"
4. The Arabic translation of the word
5. Two example sentences showing the word in context (label as "Example 1:" and "Example 2:")
6. 3-5 common collocations (words often used with this word, e.g., "~ truth", "~ change", "~ principle")
7. 2-3 synonyms
8. 2-3 antonyms (if applicable, otherwise say "N/A")

IMPORTANT: Return ONLY a valid JSON array. Do not include any text before or after the JSON.

Format your response as a JSON array with this exact structure:
[
  {
    "word": "example",
    "definition": "Clear definition here",
    "difficulty": "B1",
    "arabicTranslation": "مثال",
    "examples": ["Example 1: First sentence using the word.", "Example 2: Second sentence using the word."],
    "collocations": ["~ truth", "~ change", "~ principle"],
    "synonyms": ["synonym1", "synonym2"],
    "antonyms": ["antonym1", "antonym2"]
  }
]

If you cannot identify any highlighted words, return an empty array: []`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please analyze these ${images.length} book page image(s) and extract all highlighted/marked words with their definitions, examples, synonyms, and antonyms. Combine the results from all pages into one JSON array, without duplicates.`
              },
              ...images.map((url: string) => ({
                type: 'image_url',
                image_url: { url }
              }))
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process image with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Response received, parsing vocabulary...');

    // Parse the JSON response - handle potential markdown code blocks
    let vocabulary;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      vocabulary = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw content:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse vocabulary data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully extracted ${vocabulary.length} words`);

    return new Response(
      JSON.stringify({ success: true, vocabulary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-vocabulary:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});