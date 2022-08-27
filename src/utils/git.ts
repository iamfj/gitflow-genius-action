import { RestEndpointMethodTypes } from '@octokit/rest';
import { clean } from 'semver';

import { Config } from '@/utils/config';
import { log } from '@/utils/logger';

type PullRequestType = 'release' | 'hotfix' | 'feature';

export const getPullRequestType = (
  pullRequest: RestEndpointMethodTypes['pulls']['get']['response']['data'],
  { mainBranch, developBranch, releaseBranchPrefix, hotfixBranchPrefix }: Config,
): PullRequestType | undefined => {
  const headBranch = pullRequest.head.ref;
  const baseBranch = pullRequest.base.ref;

  const isHeadRelease = headBranch.startsWith(`${releaseBranchPrefix}/`);
  const isHeadHotfix = headBranch.startsWith(`${hotfixBranchPrefix}/`);

  // If the base branch is the main branch and the head branch is a release branch
  if (baseBranch === mainBranch && isHeadRelease) {
    return 'release';
  }

  // If the base branch is the main branch and the head branch is a hotfix branch
  if (baseBranch === mainBranch && isHeadHotfix) {
    return 'hotfix';
  }

  if (baseBranch === developBranch) {
    return 'feature'; // Or bugfix but in this workflow we don't care
  }

  return undefined;
};

interface Basehead {
  base: string;
  head: string;
}

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

export const reintegrateBranch = async (basehead: Basehead, config: Config) => {
  const compareStatus = await compareCommits(basehead, config);

  if (compareStatus === 'identical') {
    log('reintegrate-branch: branches are identical, nothing to do');
    return;
  }

  const { octokit } = config;
  const { repo } = config.context;
  const { base, head } = basehead;

  try {
    await octokit.rest.repos.merge({
      ...repo,
      base,
      head,
    });

    log(`reintegrate-branch: successfully reintegrate changes from ${head} to ${base}`);
  } catch (error) {
    log(
      `reintegrate-branch: failed to reintegrate changes from ${head} to ${base} automatically. Creating a pull request...`,
    );

    await octokit.rest.pulls.create({
      ...repo,
      base,
      head,
      title: `Merge ${head} branch into ${base}`,
      body: ``, // ToDo: Add PR description
    });

    log(`reintegrate-branch: pull request created to reintegrate changes from ${head} to ${base}`);
  }
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

export const getMainBranchSha = async ({ octokit, context, mainBranch }: Config) => {
  const { data } = await octokit.rest.repos.getBranch({
    ...context.repo,
    branch: mainBranch,
  });

  return data.commit.sha;
};

export const getDevelopBranchSha = async ({ octokit, context, developBranch }: Config) => {
  const { data } = await octokit.rest.repos.getBranch({
    ...context.repo,
    branch: developBranch,
  });

  return data.commit.sha;
};

export const getLatestRelease = async ({ octokit, context, initialVersion }: Config) => {
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

export const createReleaseLabel = async ({ octokit, context }: Config) => {
  log('create-release-label: creating release label if not exists');

  await octokit.rest.issues
    .createLabel({
      ...context.repo,
      name: 'release',
      color: '0366d6',
    })
    .catch(() => {
      log('create-release-label: label already exists. Skipping...');
    });
};

export const createReleaseBranch = async (
  version: string,
  base: Basehead['base'],
  { octokit, context, releaseBranchPrefix }: Config,
): Promise<RestEndpointMethodTypes['git']['createRef']['response']['data']> => {
  const { data } = await octokit.rest.git.createRef({
    ...context.repo,
    ref: `refs/heads/${releaseBranchPrefix}${version}`,
    sha: base,
  });

  return data;
};

export const createReleasePullRequest = async (
  version: string,
  { base, head }: Basehead,
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['pulls']['create']['response']['data']> => {
  log('create-release-pr: creating release pull request...');

  const { data } = await octokit.rest.pulls.create({
    ...context.repo,
    title: `Release ${version}`,
    head,
    base,
  });

  log('create-release-pr: release pull request created!');

  // Add label to the pull request
  await octokit.rest.issues.addLabels({
    ...context.repo,
    issue_number: data.number,
    labels: ['release'],
  });

  log('create-release-pr: release label attached to pull request!');

  return data;
};

export const getPullRequest = async (
  pull_number: number,
  { octokit, context }: Config,
): Promise<RestEndpointMethodTypes['pulls']['get']['response']['data']> => {
  const { data } = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number,
  });

  return data;
};
