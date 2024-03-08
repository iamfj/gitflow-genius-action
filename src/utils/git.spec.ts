import { pullType } from '@/utils/git';

describe('pullType', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['main', 'release/1.0.0', true, 'release'],
    ['main', 'hotfix/strict-fix', true, 'hotfix'],
    ['main', 'non-strict-hotfix', true, undefined],
    ['develop', 'release/1.0.0', true, 'feature'],
    ['develop', 'hotfix/strict-fix', true, 'feature'],
    ['develop', 'non-strict-hotfix', true, 'feature'],
    ['main', 'release/1.0.0', false, 'release'],
    ['main', 'hotfix/strict-fix', false, 'hotfix'],
    ['main', 'non-strict-hotfix', false, 'hotfix'],
    ['develop', 'release/1.0.0', false, 'feature'],
    ['develop', 'hotfix/strict-fix', false, 'feature'],
    ['develop', 'non-strict-hotfix', false, 'feature'],
  ])(
    'should return with head "%s" and base "%s" (strict=%s) the pull request type "%s"',
    (base, head, strict, expectedType) => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const pull = {
        base,
        head,
      };

      const config = {
        mainBranch: 'main',
        developBranch: 'develop',
        releaseBranchPrefix: 'release/',
        hotfixBranchPrefix: 'hotfix/',
        strict,
      };

      expect(pullType(pull, config)).toBe(expectedType);
    },
  );
});
