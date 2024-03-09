import { RestEndpointMethodTypes } from '@octokit/rest';
import { clean, inc } from 'semver';

import { Config } from '@/utils/config';
import {
  compareCommits,
  createPull,
  createRef,
  createRelease,
  createTag,
  currentRelease,
  getBranch,
  getPull,
  mergeBranch,
  pullType,
  updatePull,
} from '@/utils/git';
import { error, log } from '@/utils/logger';
import { notesMeta, updateNotes } from '@/utils/notes';

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
  // Get pull request
  log('on-pull-merge: getting pull request...');
  const pull = await getPull(pullRequest.number, config);
  log('on-pull-merge: pull request retrieved!', pull);

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
  const latest = await currentRelease(config);

  // If the pull request type is a hotfix, reintegrate the main branch into the develop branch
  if (pullRequestType === 'hotfix' || pullRequestType === 'release') {
    let version;

    // Compare the main branch SHA with the develop branch SHA
    log(`on-pull-merge: compare ${mainBranch} branch with ${developBranch} branch...`);
    const compare = await compareCommits({ base: developBranch, head: mainBranch }, config);
    if (compare.status === 'identical') {
      log(`on-pull-merge: ${mainBranch} and ${developBranch} are identical, nothing to do`);
      return;
    }
    log(`on-pull-merge: ${mainBranch} and ${developBranch} are different`, compare);

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
      const reintegratePull = await createPull(
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
      log(`on-pull-merge: pull #${pull.number} created!`, reintegratePull);
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
    const release = await createRelease(`v${version}`, pull.body || '', config);
    log(`on-pull-merge: release for v${version} created!`, release);
  }
};

export const onPullRequestSynchronize = async (
  pull: RestEndpointMethodTypes['pulls']['get']['response']['data'],
  config: Config,
) => {
  const { mainBranch } = config;

  // Determine the type of the pull request
  log('on-pull-sync: determine pull request type...');
  const type = pullType(
    {
      base: pull.base.ref,
      head: pull.head.ref,
    },
    config,
  );
  log(`on-pull-sync: pull request type detected: ${type}`);

  // If the pull request type is not a release, exit the workflow
  if (type !== 'release') {
    log('on-pull-sync: pull is not release branch, nothing to do');
    return;
  }

  // Parse the meta from the pull request body
  log('on-pull-sync: parsing pull request body...');
  const meta = notesMeta(pull.body || '', config);
  log('on-pull-sync: pull request body parsed!', meta);

  // Extract previous version from the pull request body
  log('on-pull-sync: extracting version from pull request body...');
  const current = meta.current;
  if (!current) {
    throw new Error('Could not determine current version from pull request body');
  }
  log(`on-pull-sync: previous version extracted from pull request body: v${current}`);

  // Extract next version from the pull request body
  log('on-pull-sync: extracting next version from pull request body...');
  const next = meta.next;
  if (!next) {
    throw new Error('Could not determine next version from pull request body');
  }
  log(`on-pull-sync: next version extracted from pull request body: v${next}`);

  // Compare head with base branch
  log('on-pull-sync: comparing head with base branch...');
  const commits = await compareCommits(
    {
      base: pull.base.sha,
      head: pull.head.sha,
    },
    config,
  );
  log('on-pull-sync: head compared with base branch!', commits);

  // Fetching main branch
  log(`on-dispatch: fetching ${mainBranch} branch...`);
  const main = await getBranch(mainBranch, config);
  log(`on-dispatch: ${mainBranch} branch fetched! (${main.commit.sha})`);

  // Update notes for previous version
  log(`on-pull-sync: updating notes for v${current}...`);
  const notes = updateNotes(commits, pull.body, config);
  log(`on-pull-sync: notes for v${current} updated!`);

  // Update pull request body with new notes
  log(`on-pull-sync: updating pull request body for v${next}...`);
  const updatedPull = await updatePull(pull.number, { body: notes }, config);
  log(`on-pull-sync: pull request body for v${next} updated!`, updatedPull);
};
