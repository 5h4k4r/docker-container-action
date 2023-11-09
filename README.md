# Project Version Check GitHub Action

The **Project Version Check** GitHub Action is a custom action designed to help you manage and maintain your project's version when following semantic versioning for releases. Whether your project is based on Node.js or .NET, this action automates the process of checking the project version against a Git tag and updating it when necessary.

## Why Use Project Version Check?

- **Semantic Versioning**: If you're using semantic versioning (e.g., `v1.0.0`) for your project releases, this action ensures that your project's version property is always in sync with the Git tag.

- **Automated Version Updates**: No need to manually update version numbers in your `package.json` (Node.js) or `csproj` files (.NET). The action does it for you.

- **Seamless Workflow**: Integrates seamlessly into your GitHub Actions workflow, making it easy to keep your project version up to date.

## Inputs

### `branch` (optional)

- **Description**: The name of the branch you want to target for version checks.
- **Required**: No
- **Default**: `main`

## Example Usage

```yaml
name: "Project Version Check"
on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'  # Match tags with the pattern vX.X.X

jobs:
  project_version_check:
    name: Check and Update Project Version
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v2

      - name: Project Version Check
        uses: 5h4k4r/project-version-check@v1
        with:
          branch: main # Optional, specify the target branch for creating releases

      - name: Example Workflow Step
        run: |
          # Your workflow steps here
```

The action is integrated into a workflow that triggers only when tags are pushed with the pattern `vX.X.X`. You can customize the branch name by specifying the `branch` input.

If you're not creating releases from the `main` branch and want to specify a different branch for creating releases, you can set the `branch` input to that specific branch.


## How it Works

If you're using semantic versioning for your releases, the **Project Version Check** GitHub Action will help you keep your `package.json` (for Node.js projects) or `csproj` version property (for .NET projects) up to date with your releases. Here's how it works:

1. **Determine Project Type**: The action first determines the type of your project (Node.js or .NET) by inspecting the project files.

2. **Fetch Git Tag**: It fetches the Git tag associated with the release.

3. **Get Branch Name**: The action allows you to specify the target branch for version checks. By default, it uses the `main` branch.

4. **Get App Version**: Depending on your project type, it retrieves the project's version from `package.json` (Node.js) or the `csproj` files (.NET).

5. **Compare Versions**: The action compares the project version with the Git tag. If they don't match, it proceeds to update the project version.

6. **Update Version**: It updates the version in either `package.json` or the `csproj` files, depending on the project type.

7. **Commit Changes**: The action commits the updated version to the repository and records the commit SHA.

8. **Update Tag**: Finally, it updates the Git tag with the latest version and pushes it to the repository.

By following this workflow, your project's version property will always match your Git tag, ensuring that your releases are accurately reflected in your project files.

**Important**: Ensure that your GitHub repository has the necessary permissions and secrets (e.g., `GITHUB_TOKEN`) to perform Git operations and update the repository.
