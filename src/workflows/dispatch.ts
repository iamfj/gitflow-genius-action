import { clean, inc } from 'semver';

import { Config } from '@/utils/config';
import {
  createReleaseBranch,
  createReleaseLabel,
  createReleasePullRequest,
  getDevelopBranchSha,
  getLatestRelease,
  getMainBranchSha,
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
  // ToDo: Check if a release pull request is already open, fail if it is

  // Create the release label if it is not present
  log(`on-dispatch: create release label if not exists`);
  await createReleaseLabel(config);

  // Get latest release
  log(`on-dispatch: detecting latest release version...`);
  const latestRelease = await getLatestRelease(config);
  log(`on-dispatch: latest release version detected! (v${latestRelease})`);

  // Sanitize the latest release version
  log(`on-dispatch: increment release version from v${latestRelease} with patch version`);
  const version = clean(inc(latestRelease, config.versionIncrement) || config.initialVersion);
  if (!version) {
    error(`on-dispatch: failed to increment version from v${latestRelease}`);
    return;
  }
  log(`on-dispatch: release version was incremented from v${latestRelease} to v${version})`);

  // Create release branch
  const { developBranch, mainBranch } = config;
  log(`on-dispatch: fetching main branch sha`);
  const mainSha = await getMainBranchSha(config);
  log(`on-dispatch: fetching develop branch sha`);
  const developSha = await getDevelopBranchSha(config);
  log(`on-dispatch: creating release branch for v${version} from ${developBranch} (${developSha})`);
  const releaseBranch = await createReleaseBranch(version, developSha, config);

  // Create pull request with label release
  log(
    `on-dispatch: creating pull request for v${version} from ${developBranch} (${developSha}) to ${mainBranch} (${mainSha})`,
  );
  const releasePullRequest = await createReleasePullRequest(
    version,
    {
      head: releaseBranch.ref,
      base: mainSha,
    },
    config,
  );
  log(`on-dispatch: release pull request for v${version} created!`, releasePullRequest);
};
