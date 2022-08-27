import * as core from '@actions/core';
import * as github from '@actions/github';
import assert from 'assert';

import { type Config, getConfig } from '@/utils/config';
import { getPullRequest } from '@/utils/git';
import { error, log } from '@/utils/logger';
import { onDispatch } from '@/workflows/dispatch';
import { onPullRequestMerged, onPullRequestSynchronize } from '@/workflows/pullRequest';

const main = async (config: Config) => {
  log('started');

  // Pre-filter config
  const filteredConfig = Object.fromEntries(
    Object.entries(config).filter(([key]) => !['octokit', 'context'].includes(key)),
  );

  // Log the filtered config
  log('loaded config', filteredConfig);

  // Run the onPullRequestClosed workflow when a pull request is closed
  if (github.context.eventName === 'pull_request' && github.context.payload.action === 'closed') {
    log('running on pull_request closed event');

    // Assert that the pull request is defined
    assert(github.context.payload.pull_request, 'pull request is not defined');

    // If the pull request is not merged, exit the workflow
    if (!github.context.payload.pull_request?.merged) {
      log('pull request is not merged. Exiting...');
      return;
    }

    // Fetch pull request data
    const pullRequest = await getPullRequest(github.context.payload.pull_request.number, config);

    // Execute the onPullRequestClosed workflow
    return onPullRequestMerged(pullRequest, config);
  }

  // Run the onPullRequestSynchronize workflow when a pull request is synchronized
  if (
    github.context.eventName === 'pull_request' &&
    github.context.payload.action === 'synchronize'
  ) {
    log('running on pull_request synchronize event');

    // Assert that the pull request is defined
    assert(github.context.payload.pull_request, 'pull request is not defined');

    // Fetch pull request data
    const pullRequest = await getPullRequest(github.context.payload.pull_request.number, config);

    // Execute the onPullRequestSynchronize workflow
    return onPullRequestSynchronize(pullRequest, config);
  }

  // Run the onDispatch workflow when a workflow_dispatch event is triggered
  if (github.context.eventName === 'workflow_dispatch') {
    log('running on workflow_dispatch event');

    // Execute the onDispatch workflow
    return onDispatch(config);
  }

  // Display a message when the event does not match any conditions to run
  log('does not match any conditions to run. Skipping...');
};

// Execute the main function as entry point for the action
main(getConfig())
  .then(() => {
    log('finished!');
    process.exitCode = 0;
  })
  .catch((err) => {
    error('failed!', err.message);
    core.setFailed(err.message);
    process.exitCode = 1;
  });
