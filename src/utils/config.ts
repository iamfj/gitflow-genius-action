import { getInput } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { Context } from '@actions/github/lib/context';
import semver, { type ReleaseType } from 'semver';

import { error } from '@/utils/logger';

/**
 * Type definition for configuration used in the GitHub action.
 *
 * @typedef {object} Config
 * @property {Context} context - The context of the GitHub action, containing information like event type or payload.
 * @property {ReturnType<typeof getOctokit>} octokit - The authenticated Octokit instance to interact with GitHub API.
 * @property {boolean} strict - Flag to enforce strict mode in the actions.
 * @property {string} initialVersion - The initial version from which to start versioning.
 * @property {Extract<ReleaseType, 'major' | 'minor' | 'patch'>} versionIncrement - The type of version increment (major, minor, patch).
 * @property {string} mainBranch - The name of the main branch in the repository.
 * @property {string} developBranch - The name of the development branch in the repository.
 * @property {string} releaseBranchPrefix - The prefix for release branches.
 * @property {string} hotfixBranchPrefix - The prefix for hotfix branches.
 */
export type Config = {
  context: Context;
  octokit: ReturnType<typeof getOctokit>;
  strict: boolean;
  initialVersion: string;
  versionIncrement: Extract<ReleaseType, 'major' | 'minor' | 'patch'>;
  mainBranch: string;
  developBranch: string;
  releaseBranchPrefix: string;
  hotfixBranchPrefix: string;
};

/**
 * Fetches and validates the configuration for the GitHub action from the environment and action inputs.
 * Throws an error if essential variables are missing or invalid.
 *
 * @returns {Config} The configuration object constructed from environment variables and action inputs.
 */
export const getConfig = (): Config => {
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    throw new Error('GITHUB_TOKEN is not defined');
  }

  const octokit = getOctokit(githubToken);

  // Fetch
  let versionIncrement = getInput('version_increment');

  // Check if versionIncrement matches the type ReleaseType
  if (versionIncrement && !['major', 'minor', 'patch'].includes(versionIncrement)) {
    error(`version_increment must be one of 'major', 'minor', or 'patch'. Taking 'patch'`);
    versionIncrement = 'patch';
  }

  return {
    octokit,
    context,
    strict: (getInput('strict') || 'false') === 'true',
    initialVersion: semver.clean(getInput('initial_version')) || '0.1.0',
    versionIncrement: versionIncrement as Extract<ReleaseType, 'major' | 'minor' | 'patch'>,
    mainBranch: getInput('main_branch') || 'main',
    developBranch: getInput('develop_branch') || 'develop',
    releaseBranchPrefix: getInput('release_branch_prefix') || 'release/',
    hotfixBranchPrefix: getInput('hotfix_branch_prefix') || 'hotfix/',
  };
};
