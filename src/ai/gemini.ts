import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadApiKey, saveApiKey, promptForApiKey } from '../config/config';

const setupApiKey = async (): Promise<string> => {
  let apiKey = loadApiKey();

  if (!apiKey) {
    console.log("No API key found. Let's set it up.");
    apiKey = await promptForApiKey();
    saveApiKey(apiKey);
  }

  return apiKey;
};

export const getCommitSuggestions = async (
  diff: string,
  prompt: string
): Promise<string[]> => {
  const apiKey = await setupApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const formattedPrompt = `
    Based on the following git diff:
    ${diff}

    Between "START" and "END" is an optional additional context to guide the commit suggestions. 
    If nothing is between "START" and "END", ignore it.

    START
    ${prompt ? `Additional context: ${prompt}` : ''}
    END

    Please generate 4 concise one liner commit messges and clear commit message suggestions for the above changes.
    Return the commit messages in the following JSON format:
    Listen strictly respond only in json format and it should be response = 
    Only the below format no other character or text just follow below format

    {
      "commits": [
        "First commit suggestion",
        "Second commit suggestion",
        "Third commit suggestion"
      ]
    }
  `;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(formattedPrompt);

    let rawResponse = result.response.text();
    rawResponse = rawResponse
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsedResponse = JSON.parse(rawResponse);

    if (parsedResponse && Array.isArray(parsedResponse.commits)) {
      return parsedResponse.commits;
    }

    console.error('The AI response did not contain valid commit messages.');
    return [];
  } catch (error) {
    console.error(
      'Error communicating with the AI or parsing response:',
      error
    );
    return [];
  }
};
