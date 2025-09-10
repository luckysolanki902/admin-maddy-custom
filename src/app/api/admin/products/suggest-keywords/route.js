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
Analyze this product and generate 5 unique search keywords based on the DESIGN, THEME, STYLE, and VISUAL ELEMENTS you can see.
The keywords should be those which people are likely to search for when looking for products, it may be as simple as just the color name, but should reflect this design and not very common that can be used with any other similar product.
Product Details:
- Title: ${title || 'Not provided'}
- Main Tags: ${mainTags ? mainTags.join(', ') : 'Not provided'}

IMPORTANT REQUIREMENTS:
1. Focus ONLY on design elements, themes, patterns, colors, styles, and visual appeal, or even synonym of the product's design name, like rabbit for bunny, but keep each tag single word and not two-three word, or words that are used together, like if the design name is title or tag contains Radha but not Krishna, you can suggest krishna
2. DO NOT include generic category words like "wraps", "cushion", "pillow"
3. DO NOT include brand names or basic product types
4. Look for: artistic themes, patterns, colors, design styles, visuals
5. Generate keywords that describe the aesthetic and design appeal
6. Examples of good keywords: ${fallbackKeywords.join(', ')}

You are a design and visual aesthetics expert. Analyze product images and generate keywords based purely on design elements, themes, patterns, and visual style. Never use generic product category terms. One-two of the keyword must contain simply color/design names if applicable. In short the keywords simply describe that design/theme/style, not the product type or category. Each keyword must be simple and something that people will actually search for when looking for products with that design or visual style.
Generate 10 unique design-focused keywords that capture the visual appeal and aesthetic elements.
    `.trim();

        const messages = [
            {
                role: "system",
                content:  "You are a design and visual aesthetics expert and have knowledge of seo and psycholgical knowledge of what people can search for. Analyze product images and generate keywords based purely on design elements, themes, patterns, and visual style. Never use generic product category terms. One-two of the keyword must contain simply color/design names if applicable. In short the keywords simply describe that design/theme/style, not the product type or category. Each keyword must be simple and something that people will actually search for when looking for products with that design or visual style."
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
