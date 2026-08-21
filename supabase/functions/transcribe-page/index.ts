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
    const image: string | undefined = body.imageBase64;

    if (!image) {
      return new Response(
        JSON.stringify({ success: false, error: 'An image is required' }),
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              'You transcribe book pages. Return the page text EXACTLY as written, preserving paragraph breaks with blank lines. Do not add commentary, headings, or markdown. If the page is unreadable, return an empty string.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transcribe the text of this book page.' },
              { type: 'image_url', image_url: { url: image } },
            ],
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
            : 'Failed to read the page';
      return new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content?.trim() ?? '';

    if (!text) {
      return new Response(
        JSON.stringify({ success: false, error: 'No readable text found on this page' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true, text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in transcribe-page:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
