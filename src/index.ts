import { getCommitSuggestions } from './ai/gemini';
import { execSync } from 'node:child_process';
import inquirer from 'inquirer';
import clipboardy from 'clipboardy';

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

    const { selectedCommit } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCommit',
        message: 'Select the commit message to use:',
        choices: commitSuggestions
      }
    ]);

    const commitCommand = `git commit -m "${selectedCommit}"`;
    clipboardy.writeSync(commitCommand);

    console.log(
      `Your selected commit command has been copied to the clipboard: ${commitCommand}`
    );
  } else {
    console.log('No commit suggestions were generated.');
  }
};

main();
