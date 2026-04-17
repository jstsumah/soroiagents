'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting resource metadata using AI.
 *
 * It exports:
 * - `suggestResourceMetadata`: A function that takes resource content as input and returns suggested metadata.
 * - `SuggestResourceMetadataInput`: The input type for the `suggestResourceMetadata` function.
 * - `SuggestResourceMetadataOutput`: The output type for the `suggestResourceMetadata` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestResourceMetadataInputSchema = z.object({
  resourceContent: z
    .string()
    .describe("The content of the resource for which metadata is to be suggested."),
});
export type SuggestResourceMetadataInput = z.infer<typeof SuggestResourceMetadataInputSchema>;

const SuggestResourceMetadataOutputSchema = z.object({
  tags: z.array(z.string()).describe("Suggested tags for the resource."),
  description: z.string().describe("A suggested description for the resource."),
  category: z
    .enum(['rates', 'itineraries', 'brochures', 'images'])
    .describe("A suggested category for the resource."),
});
export type SuggestResourceMetadataOutput = z.infer<typeof SuggestResourceMetadataOutputSchema>;

export async function suggestResourceMetadata(
  input: SuggestResourceMetadataInput
): Promise<SuggestResourceMetadataOutput> {
  return suggestResourceMetadataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestResourceMetadataPrompt',
  input: {schema: SuggestResourceMetadataInputSchema},
  output: {schema: SuggestResourceMetadataOutputSchema},
  prompt: `You are an expert in categorizing resources for a tour company.
  Given the following resource content, suggest relevant tags, a description, and a category.

  Resource Content: {{{resourceContent}}}

  Ensure the category is one of the following: rates, itineraries, brochures, images.`,
});

const suggestResourceMetadataFlow = ai.defineFlow(
  {
    name: 'suggestResourceMetadataFlow',
    inputSchema: SuggestResourceMetadataInputSchema,
    outputSchema: SuggestResourceMetadataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
