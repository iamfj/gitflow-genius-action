import assert from 'assert';
import { clean, coerce, inc } from 'semver';

import { Config } from '@/utils/config';
import {
  addLabels,
  branchExists,
  compareCommits,
  createLabel,
  createPull,
  createRef,
  currentRelease,
  findLabel,
  findPulls,
  getBranch,
} from '@/utils/git';
import { log } from '@/utils/logger';
import { createNotes } from '@/utils/notes';

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
  log(`on-dispatch: detecting current release version...`);
  const current = await currentRelease(config);
  log(`on-dispatch: current release version detected! (v${current})`);

  // Sanitize the latest release version
  log(`on-dispatch: sanitizing release ${current} version...`);
  const sanitized = coerce(clean(current));
  if (!sanitized) {
    throw new Error(`failed to sanitize version from ${current}`);
  }
  log(`on-dispatch: release version sanitized! (v${sanitized.version})`);

  // Sanitize the latest release version
  log(`on-dispatch: increment release version from v${current} with ${versionIncrement} version`);
  const next = inc(sanitized, versionIncrement);
  if (!next) {
    throw new Error(`failed to increment version from v${current}`);
  }
  log(`on-dispatch: release version was incremented from v${current} to v${next})`);

  // Fetching main branch
  log(`on-dispatch: fetching ${mainBranch} branch...`);
  const main = await getBranch(mainBranch, config);
  log(`on-dispatch: ${mainBranch} branch fetched! (${main.commit.sha})`);

  // Fetching develop branch
  log(`on-dispatch: fetching ${developBranch} branch...`);
  const develop = await getBranch(developBranch, config);
  log(`on-dispatch: ${developBranch} branch fetched! (${develop.commit.sha})`);

  // Create release branch
  log(`on-dispatch: creating branch for v${next} from ${developBranch}`);
  const releaseBranch = `${releaseBranchPrefix}${next}`;
  log(`on-dispatch: release branch name generated ${releaseBranch}`);

  // Check if release branch already exists
  log(`on-dispatch: checking if branch ${releaseBranch} exists...`);
  const exists = await branchExists(releaseBranch, config);
  if (exists) {
    log(`on-dispatch: branch ${releaseBranch} already exists. Skipped!`, exists);
  } else {
    // Create release branch
    log(`on-dispatch: branch ${releaseBranch} does not exist.`);
    log(`on-dispatch: creating branch ${releaseBranch} from ${developBranch} (${develop})`);
    const ref = await createRef(`refs/heads/${releaseBranch}`, develop.commit.sha, config);
    log(`on-dispatch: branch for v${next} created! (${releaseBranch})`, ref);
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
    log(`on-dispatch: no release pull request for v${next} found!`);
  }

  // If pull request is not available, create one
  if (!pull) {
    // Compare tags refs
    log(`on-dispatch: comparing tag refs for v${next} and v${current}...`);
    const commits = await compareCommits(
      {
        base: main.commit.sha,
        head: develop.commit.sha,
      },
      config,
    );
    log(`on-dispatch: tag refs for v${next} and v${current} compared!`, commits);

    // Pre process release notes
    log(`on-dispatch: create release notes for v${next}...`);
    const body = createNotes(
      commits,
      {
        current,
        next,
      },
      config,
    );
    log(`on-dispatch: release notes for v${next} created!`, body);

    // Create release pull request
    log(`on-dispatch: creating pull request from ${developBranch} to ${mainBranch}`);
    pull = await createPull(
      {
        title: `Release v${next}`,
        body,
      },
      {
        head: releaseBranch,
        base: mainBranch,
      },
      config,
    );
    log(`on-dispatch: release pull request for v${next} created!`, pull);
  }

  // Check if pull request is available
  if (!pull) {
    throw new Error(`release pull request for v${next} not found!`);
  }

  // Add release label to existing pull request
  if (pull.labels.find((pullLabel) => pullLabel.name === releaseLabelName)) {
    log(`on-dispatch: ${releaseLabelName} label exists for pull request #${pull.number}. Skipped!`);
  } else {
    log(`on-dispatch: adding ${releaseLabelName} label to pull request #${pull.number}`);
    const label = await addLabels([releaseLabelName], pull.number, config);
    log(`on-dispatch: ${releaseLabelName} label added to pull request #${pull.number}`, label);
  }

  // Log dispatch completion
  log(`on-dispatch: release process completed for v${next}`);
};
