
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
  async (input) => searchProperties(input.query)
);


const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async (input) => {
    const { sessionId, message } = input;
    
    // 1. Get existing chat history from Firestore
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
    
    // For now, we will disable the bot's response to let admins handle the chat.
    // The user's message is saved, and the admin will see it in the support dashboard.
    return { response: '' };
  }
);
