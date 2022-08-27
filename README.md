# gitflow-genius-action

Optimize your workflow with `gitflow-genius-action`, an innovative GitHub Action tailored for automating the renowned [Gitflow workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow). This tool streamlines your development process, handling the seamless transition between continuous development on the `develop` branch and production releases via the `main` branch. It intelligently manages `release` branches for pre-release tasks and swiftly addresses production issues with `hotfix` branches, ensuring a smooth and efficient pipeline from development to deployment.

![Gitflow](https://user-images.githubusercontent.com/40987398/187112231-30c0f1f1-8153-44f7-82b3-df6ff475e525.svg)

## Automated Gitflow Workflows

`gitflow-genius-action` simplifies critical Gitflow processes, enhancing team productivity and codebase integrity:

### Hotfix on Production

Address production emergencies efficiently with automated `hotfix` workflows. This feature creates and merges `hotfix` branches directly from `main`, automating changes reintegration into the `develop` branch. Automatic merges minimize downtime, while conflict scenarios prompt a pull request for resolution, ensuring smooth and immediate fixes without disrupting ongoing development.

### Planning Release

Secure your release process with feature freeze capabilities. Initiate a feature freeze by creating a `release` branch and corresponding pull request, isolating the `develop` branch from new additions. This freeze allows your team to focus on finalizing and testing the impending release, ensuring a thorough review process. Post-release, `gitflow-genius-action` efficiently merges changes back into `develop`, maintaining project momentum and coherence.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following tools installed and configured:

- Node.js (preferably the latest stable version)
- npm (Node.js package manager)
- Visual Studio Code (recommended for using the integrated dev container)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/iamfj/gitflow-genius-action.git
   ```

2. Navigate to the project directory:
   ```bash
   cd gitflow-genius-action
   ```

3. Install dependencies using npm:
   ```bash
   npm install
   ```

4. Open the project in Visual Studio Code. If prompted, reopen the project in the dev container to ensure all tooling is correctly set up. This step ensures that your environment matches the expected setup, including any required extensions and configurations.

### Recommended VS Code Extensions

The following VS Code extensions are recommended for this project. They are automatically set up if using the dev container:

- ESLint (for code linting)
- Prettier (for code formatting)
- GitLens (for enhanced git functionality)

These extensions can enhance your development experience by providing inline error messages, code formatting, and additional git insights.

## Usage

Details on how to use the `gitflow-genius-action` in your GitHub workflows.

```yaml
on:
  workflow_dispatch:
    inputs:
      version_increment:
        type: choice
        required: true
        description: "Version increment"
        default: "patch"
        options:
          - "major"
          - "minor"
          - "patch"
  pull_request:
    types:
      - closed
      - synchronize

name: Gitflow Release

jobs:
  gitflow-release:
    name: Gitflow Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Gitflow Genius Action
        uses: ./
        with:
          version_increment: ${{ inputs.version_increment }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

tbd

### Outputs

tbd

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/iamfj/gitflow-genius-action/tags).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements and Inspiration

This project was initially inspired by the [gitflow-workflow-action](https://github.com/hoangvvo/gitflow-workflow-action) developed by [Hoang Vo](https://github.com/hoangvvo). I would like to extend my heartfelt thanks to the original author and contributors for their innovative work, which laid the groundwork for the initial concepts behind this project. While this fork marks a departure into new territory, evolving significantly from its origins, I acknowledge the foundational elements derived from their efforts and the inspiration it provided for this new direction.
