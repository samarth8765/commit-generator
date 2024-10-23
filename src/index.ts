import { getCommitSuggestions } from './ai/gemini.ts';
import { execSync } from 'node:child_process';

const getGitDiff = (): string => {
  try {
    const diff = execSync('git diff --cached').toString();
    if (!diff) {
      console.log(
        'No staged changes detected. Please stage your changes before running the tool.'
      );
      process.exit(0);
    }
    return diff;
  } catch (error) {
    console.error('Error fetching git diff:', error);
    process.exit(1);
  }
};

const main = async () => {
  const diff = getGitDiff();
  const prompt = process.argv[2] || '';

  const commitSuggestions = await getCommitSuggestions(diff, prompt);

  if (commitSuggestions.length > 0) {
    console.log('Commit message suggestions:');
    commitSuggestions.forEach((msg, index) =>
      console.log(`${index + 1}. ${msg}`)
    );
  } else {
    console.log('No commit suggestions were generated.');
  }
};

main();
