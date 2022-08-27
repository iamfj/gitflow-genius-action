import { RestEndpointMethodTypes } from '@octokit/rest';
import { log } from 'console';
import { clean, inc } from 'semver';

import { Config } from '@/utils/config';
import {
  createTag,
  getDevelopBranchSha,
  getLatestRelease,
  getMainBranchSha,
  getPullRequestType,
  reintegrateBranch,
} from '@/utils/git';
import { error } from '@/utils/logger';

/**
 * Handles the logic after a pull request is merged.
 * This function identifies the type of the merged pull request, and based on its type (feature, hotfix, or release),
 * performs different actions like reintegrating branches or creating new tags.
 *
 * @param {RestEndpointMethodTypes['pulls']['get']['response']['data']} pullRequest - The pull request data.
 * @param {Config} config - Configuration settings for the GitHub repository and action behavior.
 */
export const onPullRequestMerged = async (
  pullRequest: RestEndpointMethodTypes['pulls']['get']['response']['data'],
  config: Config,
) => {
  log('on-pull-merge: determine pull request type...');
  const pullRequestType = getPullRequestType(pullRequest, config);
  if (!pullRequestType) {
    // If the pull request type is not defined, exit the workflow
    log('on-pull-merge: could not determine pull request type. Exiting...');
    return;
  }
  log(`on-pull-merge: pull request type detected: ${pullRequestType}`);

  if (pullRequestType === 'feature') {
    // If the pull request type is a feature, exit the workflow
    log('on-pull-merge: branch merged to develop, nothing to do');
    return;
  }

  // Get the latest release and develop branch SHA
  const { initialVersion } = config;
  const latestRelease = await getLatestRelease(config);
  const mainSha = await getMainBranchSha(config);
  const developSha = await getDevelopBranchSha(config);

  // If the pull request type is a hotfix, reintegrate the main branch into the develop branch
  if (pullRequestType === 'hotfix' || pullRequestType === 'release') {
    let version;

    // Reintegrate the main branch into the develop branch
    log('on-pull-merge: reintegrate main branch into develop branch...');
    await reintegrateBranch(
      {
        base: developSha,
        head: mainSha,
      },
      config,
    );

    // If the pull request type is a hotfix, increment the latest release version
    if (pullRequestType === 'hotfix') {
      version = clean(inc(latestRelease, 'prerelease', 'HOTFIX') || initialVersion);

      // Check if the version could be sanitized from the latest release
      if (!version) {
        error('on-pull-merge: could not determine version from latest release. Exiting...');
        return;
      }
    }

    // If the pull request type is a release, increment the version from the release branch
    if (pullRequestType === 'release') {
      version = clean(pullRequest.head.ref.substring(config.releaseBranchPrefix.length));

      // Check if the version could be sanitized from the release branch
      if (!version) {
        error('on-pull-merge: could not determine version from release branch. Exiting...');
        return;
      }
    }

    // Check if the version is defined
    if (!version) {
      error('on-pull-merge: could not determine version. Exiting...');
      return;
    }

    // Create a new tag and release with the version
    log(`on-pull-merge: creating tag for v${version}...`);
    await createTag(version, pullRequest.head.ref, config);
    log(`on-pull-merge: tag for v${version} created!`);
  }
};

export const onPullRequestSynchronize = async (
  pullRequest: RestEndpointMethodTypes['pulls']['get']['response']['data'],
  config: Config,
) => {
  // ToDo: Implement the onPullRequestSynchronize workflow
};
