import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

// Path where the API key will be stored
const CONFIG_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.ai-commit-config'
);

/**
 * Load the API key from a local config file.
 */
export const loadApiKey = (): string | null => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return config.apiKey;
    }
    return null;
  } catch (error) {
    console.error('Error loading API key:', error);
    return null;
  }
};

/**
 * Save the API key to the local config file.
 */
export const saveApiKey = (apiKey: string): void => {
  const config = { apiKey };
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
    console.log('API key saved successfully.');
  } catch (error) {
    console.error('Error saving API key:', error);
  }
};

/**
 * Prompt the user to enter their API key and return it.
 */
export const promptForApiKey = async (): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      'Please enter your Google Gemini API key: ',
      (apiKey: string) => {
        resolve(apiKey);
        rl.close();
      }
    );
  });
};
