/**
 * Formats input messages into a single string with a specific prefix.
 * This function accepts multiple messages which can be either strings or objects.
 * Objects are stringified with indentation for better readability.
 *
 * @param {...(string | object)[]} messages - A list of messages to format, which can be strings or objects.
 * @returns {string} The formatted string prefixed with 'gitflow-genius-action:' and messages separated by spaces.
 * @example
 * format("Error message", { detail: "This is an error detail" });
 * // Returns 'gitflow-genius-action: Error message { "detail": "This is an error detail" }'
 */
function format(...messages: (string | object)[]): string {
  const formattedMessages = messages.map((message) => {
    if (typeof message === 'object') {
      message = JSON.stringify(message, null, 2);
    }

    return message;
  });

  return `gitflow-genius-action: ${formattedMessages.join(' ')}`;
}

/**
 * Logs formatted messages to the console standard output.
 * This is a wrapper function around the console.log method that formats messages using the format function.
 *
 * @param {...(string | object)[]} messages - A list of messages to log, which can be strings or objects.
 * @example
 * log("Info message", { detail: "This is additional info" });
 * // Console output: 'gitflow-genius-action: Info message { "detail": "This is additional info" }'
 */
export const log = (...messages: (string | object)[]): void => {
  console.log(format(...messages));
};

/**
 * Logs formatted messages to the console information output.
 * This is a wrapper function around the console.info method that formats messages using the format function.
 *
 * @param {...(string | object)[]} messages - A list of messages to log as information, which can be strings or objects.
 * @example
 * info("Info message", { detail: "This is a detailed info" });
 * // Console output: 'gitflow-genius-action: Info message { "detail": "This is a detailed info" }'
 */
export const info = (...messages: (string | object)[]): void => {
  console.info(format(...messages));
};

/**
 * Logs formatted messages to the console warning output.
 * This is a wrapper function around the console.warn method that formats messages using the format function.
 *
 * @param {...(string | object)[]} messages - A list of messages to log as warnings, which can be strings or objects.
 * @example
 * warn("Warning message", { detail: "This is a warning detail" });
 * // Console output: 'gitflow-genius-action: Warning message { "detail": "This is a warning detail" }'
 */
export const warn = (...messages: (string | object)[]): void => {
  console.warn(format(...messages));
};

/**
 * Logs formatted messages to the console error output.
 * This is a wrapper function around the console.error method that formats messages using the format function.
 *
 * @param {...(string | object)[]} messages - A list of messages to log as errors, which can be strings or objects.
 * @example
 * error("Error message", { detail: "Error detail" });
 * // Console output: 'gitflow-genius-action: Error message { "detail": "Error detail" }'
 */
export const error = (...messages: (string | object)[]): void => {
  console.error(format(...messages));
};
