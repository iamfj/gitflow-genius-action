import assert from 'assert';
import { clean, inc } from 'semver';

import { Config } from '@/utils/config';
import {
  addLabels,
  branchExists,
  createLabel,
  createPull,
  createRef,
  developBranchSha,
  findLabel,
  findPulls,
  latestRelease,
} from '@/utils/git';
import { error, log } from '@/utils/logger';

/**
 * Handles dispatching logic for release workflows.
 * This includes:
 * - Creating a release label if it doesn't exist
 * - Detecting the latest release version
 * - Incrementing the release version
 * - Creating a release branch
 * - Creating a release pull request
 *
 * @param {Config} config - The configuration object for the release process.
 */
export const onDispatch = async (config: Config) => {
  const {
    versionIncrement,
    initialVersion,
    developBranch,
    mainBranch,
    releaseBranchPrefix,
    releaseLabel,
    releaseLabelColor,
  } = config;

  // Create the release label if it is not present
  log(`on-dispatch: detect or create release label "${releaseLabel}"...`);
  let release = await findLabel(releaseLabel, config);
  if (release) {
    log(`on-dispatch: label ${releaseLabel} already exists! Skipped!`);
  } else {
    log(`on-dispatch: creating label "${releaseLabel}"...`);
    release = await createLabel(releaseLabel, releaseLabelColor, config);
    log(`on-dispatch: label "${releaseLabel}" created!`, release);
  }

  // Assert release label name
  assert(release, `release label ${releaseLabel} not found!`);
  const releaseLabelName = release.name;

  // Get latest release
  log(`on-dispatch: detecting latest release version...`);
  const latest = await latestRelease(config);
  log(`on-dispatch: latest release version detected! (v${latestRelease})`);

  // Sanitize the latest release version
  log(
    `on-dispatch: increment release version from v${latestRelease} with ${versionIncrement} version`,
  );
  const version = clean(inc(latest, versionIncrement) || initialVersion);
  if (!version) {
    error(`on-dispatch: failed to increment version from v${latestRelease}`);
    return;
  }
  log(`on-dispatch: release version was incremented from v${latestRelease} to v${version})`);

  // Create release branch
  log(`on-dispatch: fetching develop branch sha`);
  const developSha = await developBranchSha(config);
  log(`on-dispatch: creating release branch for v${version} from ${developBranch} (${developSha})`);
  const releaseBranch = `${releaseBranchPrefix}${version}`;
  log(`on-dispatch: release branch name generated ${releaseBranch}`);

  // Check if release branch already exists
  log(`on-dispatch: checking if release branch ${releaseBranch} exists...`);
  const exists = await branchExists(releaseBranch, config);
  if (exists) {
    log(`on-dispatch: release branch ${releaseBranch} already exists. Skipped!`, exists);
  } else {
    // Create release branch
    log(`on-dispatch: release branch ${releaseBranch} does not exist.`);
    log(
      `on-dispatch: creating release branch ${releaseBranch} from ${developBranch} (${developSha})`,
    );
    const ref = await createRef(`refs/heads/${releaseBranch}`, developSha, config);
    log(`on-dispatch: release branch for v${version} created! (${releaseBranch})`, ref);
  }

  // List all pull requests with head releaseBranch and base mainBranch
  log(`on-dispatch: fetching pull requests from ${releaseBranch} to ${mainBranch}`);
  const pulls = await findPulls({ base: mainBranch, head: releaseBranch }, config);

  // Check if release pull request already exists
  let pull;
  if (pulls.length > 0) {
    pull = pulls[0];
    log(`on-dispatch: release pull request #${pull.number} already exists! Skipped!`, pull);
  } else {
    log(`on-dispatch: no release pull request for v${version} found!`);
  }

  // Create release pull request
  if (!pull) {
    log(`on-dispatch: creating pull request from ${developBranch} to ${mainBranch}`);
    pull = await createPull(
      {
        title: `Release v${version}`,
        body: `Release v${version}`, // ToDo: Add release notes
      },
      {
        head: releaseBranch,
        base: mainBranch,
      },
      config,
    );
    log(`on-dispatch: release pull request for v${version} created!`, pull);
  }

  // Check if pull request is available
  if (!pull) {
    throw new Error(`release pull request for v${version} not found!`);
  }

  // Add release label to existing pull request
  if (pull.labels.find((pullLabel) => pullLabel.name === releaseLabelName)) {
    log(`on-dispatch: ${releaseLabelName} label exists for pull request #${pull.number}`);
  } else {
    log(`on-dispatch: adding ${releaseLabelName} label to pull request #${pull.number}`);
    const label = await addLabels([releaseLabelName], pull.number, config);
    log(`on-dispatch: ${releaseLabelName} label added to pull request #${pull.number}`, label);
  }

  // Log dispatch completion
  log(`on-dispatch: release process completed for v${version}`);
};
