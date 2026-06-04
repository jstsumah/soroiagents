
'use server';

/**
 * @fileOverview A conversational AI flow for the support chatbot.
 *
 * - supportChat - A function that handles the chatbot conversation.
 * - SupportChatInput - The input type for the supportChat function.
 * - SupportChatOutput - The return type for the supportChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {getCompanyDetails} from '@/services/settings-service';
import { addMessage, getChatSession } from '@/services/chat-service';
import type { ChatMessage, Property } from '@/lib/types';
import { searchProperties } from '@/services/property-service';


const SupportChatInputSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;


const SupportChatOutputSchema = z.object({
  response: z.string(),
});
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;


export async function supportChat(input: SupportChatInput): Promise<SupportChatOutput> {
  return supportChatFlow(input);
}

const searchPropertiesTool = ai.defineTool(
  {
    name: 'searchProperties',
    description: 'Search for information about available properties by name, location, or description.',
    inputSchema: z.object({
      query: z.string().describe('The user\'s search query for a property.'),
    }),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        location: z.string(),
        description: z.string(),
        total_rooms: z.number(),
      })
    ),
  },
  async (input) => {
    const results = await searchProperties(input.query);
    return results.map(r => ({
      id: r.id || '',
      name: r.name || '',
      location: r.location || '',
      description: r.description || '',
      total_rooms: r.total_rooms || 0,
    }));
  }
);


const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async (input) => {
    const { sessionId, message } = input;
    
    // 1. Get existing chat history from Supabase
    const session = await getChatSession(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found.`);
    }

    // 2. Save the user's new message to the database immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      author: session.user,
    };
    await addMessage(sessionId, userMessage);
    
    // 3. Fetch company details for context
    const companyDetails = await getCompanyDetails();
    
    // 4. Construct the Genkit message history
    const history = session.messages.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      content: [{ text: msg.content }]
    }));

    history.push({
      role: 'user',
      content: [{ text: message }]
    });

    const systemPrompt = `You are the official support AI assistant for ${companyDetails.companyName || 'our company'}.
You assist travel agents with using the portal, finding resources, and querying property information.
Company Email: ${companyDetails.contactEmail || 'N/A'}
Company Phone: ${companyDetails.contactPhone || 'N/A'}

Instructions:
- Be polite, professional, and concise.
- Use the searchProperties tool if the user asks about specific camps, lodges, or properties to provide accurate information on location and room counts.
- If you don't know the answer, tell the user an admin will follow up with them shortly.`;

    try {
      // 5. Generate AI response
      const aiResponse = await ai.generate({
        system: systemPrompt,
        messages: history as any,
        tools: [searchPropertiesTool],
      });

      const responseText = aiResponse.text;

      // 6. Save bot's response to database
      const botMessage: ChatMessage = {
        role: 'model',
        content: responseText,
        author: {
          name: "Support Bot",
          uid: "support-bot-uid"
        }
      };
      await addMessage(sessionId, botMessage);

      return { response: responseText };
    } catch (error) {
      console.error("AI Generation Error:", error);
      // Fallback message if AI fails or API key is invalid
      const fallbackMessage = "I'm sorry, I'm having trouble thinking right now. An administrator will review your message and reply here soon.";
      await addMessage(sessionId, {
        role: 'model',
        content: fallbackMessage,
        author: { name: "Support Bot", uid: "support-bot-uid" }
      });
      return { response: fallbackMessage };
    }
  }
);
