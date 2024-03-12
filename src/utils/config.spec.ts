import core from '@actions/core';

import { getConfig } from '@/utils/config';

beforeEach(() => {
  vi.resetAllMocks();

  process.env = {
    GITHUB_TOKEN: 'token',
  };
});

it('should return the default config', () => {
  const { octokit: _octokit, context: _context, ...config } = getConfig();

  expect(config).toEqual({
    action: {
      name: 'gitflow-genius-action',
      url: 'https://github.com/iamfj/gitflow-genius-action#readme',
    },
    developBranch: 'develop',
    hotfixBranchPrefix: 'hotfix/',
    initialVersion: '0.1.0',
    mainBranch: 'main',
    releaseBranchPrefix: 'release/',
    releaseLabel: 'release',
    releaseLabelColor: '#0366d6',
    strict: false,
    versionIncrement: 'patch',
  });
});

it('should return the config with custom inputs', () => {
  const inputs: Record<string, string> = {
    strict: 'true',
    initial_version: '1.0.0',
    version_increment: 'minor',
    main_branch: 'master',
    develop_branch: 'dev',
    release_branch_prefix: 'rel/',
    hotfix_branch_prefix: 'fix/',
    release_label: 'rel',
    release_label_color: '#ff0000',
  };

  vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
    return inputs[name] || '';
  });

  const { octokit: _octokit, context: _context, ...config } = getConfig();

  expect(config).toEqual({
    action: {
      name: 'gitflow-genius-action',
      url: 'https://github.com/iamfj/gitflow-genius-action#readme',
    },
    developBranch: 'dev',
    hotfixBranchPrefix: 'fix/',
    initialVersion: '1.0.0',
    mainBranch: 'master',
    releaseBranchPrefix: 'rel/',
    releaseLabel: 'rel',
    releaseLabelColor: '#ff0000',
    strict: true,
    versionIncrement: 'minor',
  });
});

it('should throw an error if GITHUB_TOKEN is not defined', () => {
  process.env = {};

  expect(() => getConfig()).toThrowError('GITHUB_TOKEN is not defined');
});

it('should return patch version increment if version_increment is not defined', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
    return name === 'version_increment' ? 'invalid' : '';
  });

  const { versionIncrement } = getConfig();
  expect(versionIncrement).toBe('patch');
  expect(errorSpy).toHaveBeenCalledWith(
    "gitflow-genius-action: version_increment must be one of 'major', 'minor', or 'patch'. Taking 'patch'",
  );
});

it('should return patch version increment if version_increment is invalid', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
    return name === 'version_increment' ? 'invalid' : '';
  });

  const { versionIncrement } = getConfig();
  expect(versionIncrement).toBe('patch');
  expect(errorSpy).toHaveBeenCalledWith(
    "gitflow-genius-action: version_increment must be one of 'major', 'minor', or 'patch'. Taking 'patch'",
  );
});

it('should return #0366d6 release label color if release_label_color is not defined', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
    return name === 'release_label_color' ? 'invalid' : '';
  });

  const { releaseLabelColor } = getConfig();
  expect(releaseLabelColor).toBe('#0366d6');
  expect(warnSpy).toHaveBeenCalledWith(
    "gitflow-genius-action: release_label_color must be a valid hex color. Taking '#0366d6'",
  );
});

it('should return #0366d6 release label color if release_label_color is invalid', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
    return name === 'release_label_color' ? 'invalid' : '';
  });

  const { releaseLabelColor } = getConfig();
  expect(releaseLabelColor).toBe('#0366d6');
  expect(warnSpy).toHaveBeenCalledWith(
    "gitflow-genius-action: release_label_color must be a valid hex color. Taking '#0366d6'",
  );
});
