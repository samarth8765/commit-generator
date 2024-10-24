#!/usr/bin/env node

import { getCommitSuggestions } from './ai/gemini';
import { execSync } from 'node:child_process';
import inquirer from 'inquirer';
import clipboardy from 'clipboardy';
import chalk from 'chalk';

interface GitStatus {
  staged: boolean;
  branch: string;
  hasUnstagedChanges: boolean;
}

const getGitStatus = (): GitStatus => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trim();

    const stagedStatus = execSync('git diff --cached --name-only').toString();

    const unstagedStatus = execSync('git diff --name-only').toString();

    return {
      staged: stagedStatus.length > 0,
      branch,
      hasUnstagedChanges: unstagedStatus.length > 0
    };
  } catch (error) {
    console.error(
      chalk.red('Error: Not a git repository or git is not installed.')
    );
    process.exit(1);
  }
};

const getGitDiff = (): string => {
  try {
    const diff = execSync('git diff --cached').toString();
    if (!diff) {
      console.log(
        chalk.yellow('\n⚠️  No staged changes detected. Would you like to:')
      );

      inquirer
        .prompt([
          {
            type: 'list',
            name: 'action',
            message: 'Choose an action:',
            choices: [
              { name: '1. Stage all changes', value: 'stageAll' },
              {
                name: '2. Stage changes interactively',
                value: 'stageInteractive'
              },
              { name: '3. Exit\n', value: 'exit' }
            ]
          }
        ])
        .then(({ action }) => {
          switch (action) {
            case 'stageAll':
              execSync('git add .');
              console.log(chalk.green('\n✔ All changes staged'));
              main();
              break;
            case 'stageInteractive':
              execSync('git add -i', { stdio: 'inherit' });
              main();
              break;
            case 'exit':
              process.exit(0);
          }
        });

      return '';
    }
    return diff;
  } catch (error) {
    console.error(chalk.red('Error fetching git diff:'), error);
    process.exit(1);
  }
};

const displayGitStatus = (status: GitStatus) => {
  console.log(chalk.cyan('\n📦 Git Status:'));
  console.log(chalk.white(`Branch: ${status.branch}`));
  if (status.hasUnstagedChanges) {
    console.log(chalk.yellow('⚠️  You have unstaged changes'));
  }
};

const displayCommitSuggestions = (suggestions: string[]) => {
  console.log(chalk.cyan('\n🤖 AI Commit Suggestions:\n'));
  suggestions.forEach((suggestion, index) => {
    const [type, rest] = suggestion.split(':');
    console.log(
      chalk.gray(`${index + 1}. `) + chalk.green(`${type}:`) + chalk.white(rest)
    );
  });
};

const confirmAndExecute = async (commitCommand: string): Promise<void> => {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Would you like to execute this commit command now?',
      default: true
    }
  ]);

  if (confirm) {
    try {
      execSync(commitCommand, { stdio: 'inherit' });
      console.log(chalk.green('\n✨ Commit successful!'));

      // Ask if user wants to push
      const { shouldPush } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldPush',
          message: 'Would you like to push these changes?',
          default: false
        }
      ]);

      if (shouldPush) {
        execSync('git push', { stdio: 'inherit' });
        console.log(chalk.green('\n🚀 Changes pushed successfully!'));
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Error executing git command:'), error);
    }
  } else {
    console.log(
      chalk.yellow(
        '\nCommit command copied to clipboard. You can execute it manually.'
      )
    );
  }
};

const main = async () => {
  console.log(chalk.cyan('\n🎯 AI Git Commit Assistant\n'));

  const status = getGitStatus();
  displayGitStatus(status);

  const diff = getGitDiff();
  if (!diff) return;

  const prompt = process.argv[2] || '';
  console.log(chalk.gray('\nGenerating commit suggestions...'));

  const commitSuggestions = await getCommitSuggestions(diff, prompt);

  if (commitSuggestions.length > 0) {
    displayCommitSuggestions(commitSuggestions);

    const { selectedCommit } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCommit',
        message: 'Select a commit message:',
        choices: commitSuggestions.map((msg, i) => ({
          name: `${i + 1}. ${msg}`,
          value: msg
        }))
      }
    ]);

    const commitCommand = `git commit -m "${selectedCommit}"`;
    clipboardy.writeSync(commitCommand);

    console.log(chalk.cyan('\n📋 Command copied to clipboard:'));
    console.log(chalk.white(commitCommand));

    await confirmAndExecute(commitCommand);
  } else {
    console.log(chalk.red('\n❌ No commit suggestions were generated.'));
  }
};

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ An unexpected error occurred:'), error);
  process.exit(1);
});

main();
