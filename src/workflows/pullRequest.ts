import { RestEndpointMethodTypes } from '@octokit/rest';
import { clean, inc } from 'semver';

import { Config } from '@/utils/config';
import {
  compareCommits,
  createPull,
  createRef,
  createRelease,
  createTag,
  latestRelease,
  mergeBranch,
  pullType,
} from '@/utils/git';
import { error, log } from '@/utils/logger';

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
  // Determine the type of the pull request
  log('on-pull-merge: determine pull request type...');
  const pullRequestType = pullType(
    {
      base: pullRequest.base.ref,
      head: pullRequest.head.ref,
    },
    config,
  );
  if (!pullRequestType) {
    throw new Error('Could not determine pull request type');
  }
  log(`on-pull-merge: pull request type detected: ${pullRequestType}`);

  // If the pull request type is a feature, exit the workflow
  if (pullRequestType === 'feature') {
    log('on-pull-merge: branch merged to develop, nothing to do');
    return;
  }

  // Get the latest release and develop branch SHA
  const { initialVersion, mainBranch, developBranch } = config;
  const latest = await latestRelease(config);

  // If the pull request type is a hotfix, reintegrate the main branch into the develop branch
  if (pullRequestType === 'hotfix' || pullRequestType === 'release') {
    let version;

    // Compare the main branch SHA with the develop branch SHA
    log(`on-pull-merge: compare ${mainBranch} branch with ${developBranch} branch...`);
    const compareStatus = await compareCommits({ base: developBranch, head: mainBranch }, config);
    if (compareStatus === 'identical') {
      log(`on-pull-merge: ${mainBranch} and ${developBranch} are identical, nothing to do`);
      return;
    }
    log(`on-pull-merge: ${mainBranch} and ${developBranch} are different`, compareStatus);

    // Try to reintegrate the main branch into the develop branch
    try {
      log(`on-pull-merge: reintegrate ${mainBranch} into ${developBranch}...`);
      const merge = await mergeBranch(
        {
          base: developBranch,
          head: mainBranch,
        },
        config,
      );
      log(`on-pull-merge: ${mainBranch} reintegrated into ${developBranch}`, merge);
    } catch (err) {
      error(
        `on-pull-merge: could not reintegrate ${mainBranch} into ${developBranch}!`,
        (err as Error)?.message,
      );

      // Create a pull request to reintegrate
      log(`on-pull-merge: creating pull to reintegrate ${mainBranch} into ${developBranch}...`);
      const pull = await createPull(
        {
          title: `Reintegrate ${mainBranch} into ${developBranch}`,
          body: `This pull request reintegrates the ${mainBranch} branch into the ${developBranch} branch.`,
        },
        {
          base: developBranch,
          head: mainBranch,
        },
        config,
      );
      log(`on-pull-merge: pull #${pull.number} created!`, pull);
    }

    // If the pull request type is a hotfix, increment the latest release version
    if (pullRequestType === 'hotfix') {
      log('on-pull-merge: incrementing version for hotfix...');
      version = clean(inc(latest, 'prerelease', 'HOTFIX') || initialVersion);

      // Check if the version could be sanitized from the latest release
      if (!version) {
        throw new Error('Could not determine version from latest release');
      }

      // Log the incremented version
      log(`on-pull-merge: incremented version for hotfix to v${version}`);
    }

    // If the pull request type is a release, increment the version from the release branch
    if (pullRequestType === 'release') {
      log('on-pull-merge: incrementing version for release...');
      version = clean(pullRequest.head.ref.substring(config.releaseBranchPrefix.length));

      // Check if the version could be sanitized from the release branch
      if (!version) {
        throw new Error('Could not determine version from release branch');
      }

      // Log the incremented version
      log(`on-pull-merge: incremented version for release to v${version}`);
    }

    // Check if the version is defined
    if (!version) {
      throw new Error('Could not determine version');
    }

    // Create a new tag and release with the version
    log(`on-pull-merge: creating tag for v${version}...`);
    const tag = await createTag(`v${version}`, pullRequest.head.sha, config);
    log(`on-pull-merge: tag for v${version} created!`, tag);

    // Create a tag ref for the version
    log(`on-pull-merge: creating tag ref for v${version}...`);
    await createRef(`refs/tags/v${version}`, pullRequest.head.sha, config);
    log(`on-pull-merge: tag ref for v${version} created!`);

    // Create a release for the version
    log(`on-pull-merge: creating release for v${version}...`);
    const release = await createRelease(`v${version}`, config);
    log(`on-pull-merge: release for v${version} created!`, release);
  }
};

export const onPullRequestSynchronize = async (
  pullRequest: RestEndpointMethodTypes['pulls']['get']['response']['data'],
  config: Config,
) => {
  // ToDo: Implement the onPullRequestSynchronize workflow
};
