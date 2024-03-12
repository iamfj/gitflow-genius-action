import { error, info, log, warn } from '@/utils/logger';

it.each([
  ['log', log],
  ['warn', warn],
  ['info', info],
  ['error', error],
])('logs formatted messages to the console %s', (spy, callee) => {
  const consoleSpy = vi.spyOn(console, spy as keyof Console).mockImplementation(() => {});
  const messages = ['Info message', { detail: 'This is additional info' }];

  callee(...messages);
  expect(consoleSpy).toHaveBeenCalledWith(
    'gitflow-genius-action: Info message {\n  "detail": "This is additional info"\n}',
  );
});

it.each([
  ['log', log],
  ['warn', warn],
  ['info', info],
  ['error', error],
])('logs simple message to the console %s', (spy, callee) => {
  const consoleSpy = vi.spyOn(console, spy as keyof Console).mockImplementation(() => {});
  const messages = ['Info message'];

  callee(...messages);
  expect(consoleSpy).toHaveBeenCalledWith('gitflow-genius-action: Info message');
});
