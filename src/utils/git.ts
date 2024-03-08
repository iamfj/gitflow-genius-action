import { RestEndpointMethodTypes } from '@octokit/rest';
import { warn } from 'console';
import { clean } from 'semver';
import { type ValuesType } from 'utility-types';

import { Config } from '@/utils/config';
import { log } from '@/utils/logger';

type PullType = 'release' | 'hotfix' | 'feature';

interface Basehead {
  base: string;
  head: string;
}

export const pullType = (
  { base, head }: Basehead,
  {
    mainBranch,
    developBranch,
    releaseBranchPrefix,
    hotfixBranchPrefix,
    strict,
  }: Pick<
    Config,
    'mainBranch' | 'developBranch' | 'releaseBranchPrefix' | 'hotfixBranchPrefix' | 'strict'
  >,
): PullType | undefined => {
  log('get-pull-request-type: determine pull request type...');
  log(`get-pull-request-type: base branch "${base}"`);
  log(`get-pull-request-type: head branch "${head}"`);

  // If the base branch is the main branch and the head branch is a release branch
  if (base === mainBranch && head.startsWith(releaseBranchPrefix)) {
    log('get-pull-request-type: pull request type is release');
    return 'release';
  }

  // If the base branch is the main branch and the head branch is a hotfix branch
  if (base === mainBranch && (!strict || (strict && head.startsWith(hotfixBranchPrefix)))) {
    log('get-pull-request-type: pull request type is hotfix');
    return 'hotfix';
  }

  if (base === developBranch) {
    log('get-pull-request-type: pull request type is feature or bugfix');
    return 'feature'; // Or bugfix but in this workflow we don't care
  }

  warn('get-pull-request-type: could not determine pull request type');
  return undefined;
};

export const compareCommits = async (
  { base, head }: Basehead,
  { octokit, context }: Config,
): Promise<
  RestEndpointMethodTypes['repos']['compareCommitsWithBasehead']['response']['data']['status']
> => {
  const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
    ...context.repo,
    basehead: `${base}...${head}`,
  });

  return data.status;
};

export const mergeBranch = async (
  { base, head }: Basehead,
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['repos']['merge']['response']['data']> => {
  const { data } = await octokit.rest.repos.merge({
    ...context.repo,
    base,
    head,
  });

  return data;
};

export const createTag = async (
  version: string,
  sha: string,
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['git']['createTag']['response']['data']> => {
  const { data } = await octokit.rest.git.createTag({
    ...context.repo,
    tag: version,
    message: `Release ${version}`,
    object: sha,
    type: 'commit',
  });

  return data;
};

export const developBranchSha = async ({ octokit, context, developBranch }: Config) => {
  const { data } = await octokit.rest.repos.getBranch({
    ...context.repo,
    branch: developBranch,
  });

  return data.commit.sha;
};

export const latestRelease = async ({ octokit, context, initialVersion }: Config) => {
  log('get-release: fetching latest release from github');

  const { data } = await octokit.rest.repos
    .getLatestRelease(context.repo)
    .catch(() => ({ data: null }));

  // Check if version could be sanitized
  const version = clean(data?.tag_name || initialVersion);
  if (!version) {
    log(`get-release: failed to sanitize version from ${data?.tag_name}`);
    return initialVersion;
  }

  // Log if no previous release found
  if (!data?.tag_name) {
    log(`get-release: no previous release found, using default version v${version}`);
  } else {
    log(`get-release: found latest release ${version}`);
  }

  return version;
};

export const findLabel = async (
  label: string,
  { octokit, context }: Config,
): Promise<
  ValuesType<RestEndpointMethodTypes['issues']['listLabelsForRepo']['response']['data']> | undefined
> => {
  // Find label in repo
  const { data } = await octokit.rest.issues.listLabelsForRepo({
    ...context.repo,
  });

  return data.find((l) => l.name === label);
};

export const createLabel = async (label: string, color: string, { octokit, context }: Config) => {
  const { data } = await octokit.rest.issues.createLabel({
    ...context.repo,
    name: 'release',
    color: '0366d6',
  });

  return data;
};

export const branchExists = async (
  branch: string,
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['repos']['getBranch']['response']['data'] | undefined> => {
  try {
    const { data } = await octokit.rest.repos.getBranch({
      ...context.repo,
      branch,
    });

    return data;
  } catch (error) {
    return undefined;
  }
};

export const createRef = async (
  ref: string,
  sha: Basehead['base'],
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['git']['createRef']['response']['data']> => {
  const { data } = await octokit.rest.git.createRef({
    ...context.repo,
    ref,
    sha,
  });

  return data;
};

export const createRelease = async (tag: string, { octokit, context }: Config) => {
  const { data } = await octokit.rest.repos.createRelease({
    ...context.repo,
    tag_name: tag,
  });

  return data;
};

export const findPulls = async (
  { base, head }: Basehead,
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['pulls']['list']['response']['data']> => {
  const { data } = await octokit.rest.pulls.list({
    ...context.repo,
    head,
    base,
  });

  return data;
};

export const addLabels = async (
  labels: string[],
  issueNumber: RestEndpointMethodTypes['issues']['addLabels']['parameters']['issue_number'],
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['issues']['addLabels']['response']['data']> => {
  const { data } = await octokit.rest.issues.addLabels({
    ...context.repo,
    issue_number: issueNumber,
    labels,
  });

  return data;
};

export const createPull = async (
  params: Pick<RestEndpointMethodTypes['pulls']['create']['parameters'], 'title' | 'body'>,
  { base, head }: Basehead,
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['pulls']['create']['response']['data']> => {
  const { data } = await octokit.rest.pulls.create({
    ...context.repo,
    ...params,
    head,
    base,
  });

  return data;
};

export const getPull = async (
  pull_number: number,
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['pulls']['get']['response']['data']> => {
  const { data } = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number,
  });

  return data;
};
