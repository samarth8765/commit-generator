import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadApiKey, saveApiKey, promptForApiKey } from "../config/config";

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
	prompt: string,
): Promise<string[]> => {
	const apiKey = await setupApiKey();
	const genAI = new GoogleGenerativeAI(apiKey);

	const formattedPrompt = `
  As an expert Git commit message writer, analyze this git diff and generate semantic, conventional commits following best practices:

  DIFF:
  ${diff}

  CONTEXT:
  ${prompt ? prompt : "No additional context provided"}

  Requirements for commit messages:
  1. Follow the Conventional Commits specification (type(scope): description)
  2. Use types: feat, fix, refactor, style, docs, test, chore
  3. Include scope when clear from the changes
  4. Keep each message under 72 characters
  5. Use imperative mood ("add" not "added")
  6. Focus on WHY and WHAT, not HOW
  7. Highlight key impacts and breaking changes
  8. Be specific but concise
  9: Commit Messages should be in lowercase
  
  Analyze the changes for:
  - New features or functionality added
  - Bugs fixed
  - Code refactoring or improvements
  - Style/formatting changes
  - Documentation updates
  - Test modifications
  - Build/dependency changes

  Return EXACTLY 4 commit (not less than 4) message suggestions in this JSON format:
  {
    "commits": [
      "feat(scope): concise description of main feature change",
      "fix(scope): specific bug fix description",
      "refactor(scope): what was improved and why",
      "style(scope): what was reformatted or styled"
    ]
  }

  RULES:
  - ONLY return valid JSON
  - NO explanations or additional text
  - EXACTLY 4 suggestions
  - Each message MUST be complete and meaningful
  - NEVER include placeholder text
  `;

	try {
		const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
		const result = await model.generateContent(formattedPrompt);

		let rawResponse = result.response.text();
		rawResponse = rawResponse
			.replace(/```json/g, "")
			.replace(/```/g, "")
			.trim();

		const parsedResponse = JSON.parse(rawResponse);

		if (parsedResponse && Array.isArray(parsedResponse.commits)) {
			return parsedResponse.commits;
		}

		console.error("The AI response did not contain valid commit messages.");
		return [];
	} catch (error) {
		console.error(
			"Error communicating with the AI or parsing response:",
			error,
		);
		return [];
	}
};
