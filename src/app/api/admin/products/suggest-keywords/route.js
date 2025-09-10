import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Fallback design-focused keywords in case of API failure
const fallbackKeywords = [
    "red", "blue", "artwork", "pattern", "colorful", "black and white", "minimal", "nature", "anime", "naruto"
];

export async function POST(request) {
    try {
        const { title, mainTags, imageUrl, timestamp } = await request.json();
        console.log('Received data for keyword suggestion:', { title, mainTags, imageUrl, timestamp });
        if (!title && !imageUrl) {
            return NextResponse.json(
                { error: 'Either title or product image is required' },
                { status: 400 }
            );
        }



        const prompt = `
You are an expert SEO specialist and visual design analyst. Your task is to generate search keywords that real customers would type when looking for products with this specific design.

PRODUCT CONTEXT:
- Title: ${title || 'Not provided'}
- Main Tags: ${mainTags ? mainTags.join(', ') : 'Not provided'}

KEYWORD GENERATION RULES:
1. ONLY single words (no phrases like "geometric pattern" - just "geometric")
2. Focus on what customers SEARCH FOR, not product descriptions
3. Think like a customer browsing for designs they like

KEYWORD CATEGORIES TO CONSIDER:
• Colors: red, blue, green, purple, black, white, golden, silver
• Design Styles: minimal, vintage, modern, retro, elegant, bold, cute, cool
• Themes: nature, floral, geometric, abstract, tribal, mandala, galaxy, ocean
• Character/Cultural: anime, cartoon, skull, butterfly, dragon, lotus, om
• Artistic Styles: watercolor, sketch, grunge, neon, glitter, marble, gradient
• Emotions/Vibes: peaceful, energetic, mysterious, romantic, fierce, playful

STRICT REQUIREMENTS:
❌ NO product categories (wrap, cover, case, pillow, shirt)
❌ NO brand names or generic terms
❌ NO multi-word phrases
✅ ONLY single descriptive words
✅ Words people actually type in search bars
✅ Focus on visual appeal and design characteristics

Generate 10 diverse keywords that capture different aspects of this product's visual design and aesthetic appeal.

EXAMPLES OF GOOD KEYWORDS:
floral, geometric, vintage, neon, galaxy, tribal, butterfly, skull, mandala, watercolor, grunge, elegant, bold, peaceful, fierce, golden, marble, abstract, nature, cosmic
    `.trim();

        const messages = [
            {
                role: "system",
                content: "You are an SEO expert specializing in e-commerce search behavior. You understand exactly what single words customers type when searching for products with specific visual designs. Generate ONLY single-word keywords that describe visual aesthetics, colors, themes, and design styles - never product categories or multi-word phrases. Focus on searchable terms that capture the emotional and visual appeal of designs."
            }
        ];

        // If image is provided, use vision model
        if (imageUrl) {
            messages.push({
                role: "user",
                content: [
                    {
                        type: "text",
                        text: prompt
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageUrl
                        }
                    }
                ]
            });
        } else {
            // If no image, just use text
            messages.push({
                role: "user",
                content: prompt
            });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 200,
            temperature: 0.9, // Higher temperature for more varied responses
            seed: timestamp ? Math.floor(timestamp / 1000) : undefined, // Use timestamp-based seed for variation
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "design_keywords_response",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            design_keywords: {
                                type: "array",
                                description: "An array of ten strings, each a distinct design/theme/style element keyword focusing on visual aesthetics, not product categories",
                                items: {
                                    type: "string",
                                    minLength: 3,
                                    maxLength: 40
                                },
                                minItems: 10,
                                maxItems: 10
                            }
                        },
                        required: ["design_keywords"],
                        additionalProperties: false
                    }
                }
            }
        });

        const responseData = JSON.parse(completion.choices[0].message.content);
        const keywords = responseData.design_keywords;

        return NextResponse.json({ keywords }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('Error generating keywords:', error);




        return NextResponse.json({ keywords: fallbackKeywords }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    }
}
