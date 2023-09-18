const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
const axios = require('axios');

run();
async function run() {
  try {
    console.log(`CWD: ${process.cwd()}`)

    const label = core.getInput('label');
    const filePath = `${process.cwd()}/${core.getInput('filePath')}`;


    console.log(`Label: ${label}`)
    console.log(`File path: ${filePath}`)

    core.setOutput("label", label);

    // if (project == 'dotnet')
    //   filePath = `${filePath}/.csproj`;
    // else if (project == 'nodejs')
    //   filePath = `${filePath}/package.json`;

    const packageJson = require(filePath);
    const version = packageJson.version;


    // the version is in semantic format, so we can split it by dot
    const versionParts = version.split('.');
    // 1.2.3 => [1, 2, 3]
    if (label === 'major') {
      versionParts[0] = parseInt(versionParts[0]) + 1;
      versionParts[1] = 0;
      versionParts[2] = 0;

    }
    else if (label == 'minor') {
      versionParts[1] = parseInt(versionParts[1]) + 1;
      versionParts[2] = 0;

    }
    else if (label == 'patch')
      versionParts[2] = parseInt(versionParts[2]) + 1;


    console.log(versionParts)
    // increment the patch version
    // join the parts back together
    const newVersion = versionParts.join('.');


    console.log(`Old version: ${version}. New version: ${newVersion}`)

    packageJson.version = newVersion;

    fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));

    await commitChanges();

    const payload = JSON.stringify(github.context.payload, undefined, 2)

    // console.log(`The event payload: ${payload}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}


// Region functions
async function commitChanges(filePath) {
  const commitMessage = 'Commit message here';
  const newContent = 'New content to be added';
  const githubToken = core.getInput('githubToken');


  // Get the repository owner and name
  const repoFullName = process.env.GITHUB_REPOSITORY;
  const [owner, repo] = repoFullName.split('/');

  // Get the current branch
  const branch = process.env.GITHUB_REF.replace('refs/heads/', '');

  try {
    // Get the current commit SHA for the branch
    const branchResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`
    );

    console.log('branchResponse: ' + branchResponse.data)
    const baseTreeSha = branchResponse.data.commit.sha;

    // Create a new blob with the updated content
    const blobResponse = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        content: newContent,
        encoding: 'utf-8',
      },
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${githubToken}`,
        },
      }
    );
    console.log('blobResponse: ' + blobResponse.data)

    const newBlobSha = blobResponse.data.sha;

    // Create a new tree with the updated blob
    const treeResponse = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        base_tree: baseTreeSha,
        tree: [
          {
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: newBlobSha,
          },
        ],
      }
    );

    console.log('treeResponse: ' + treeResponse.data)
    const newTreeSha = treeResponse.data.sha;

    // Create a new commit
    const commitResponse = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        message: commitMessage,
        tree: newTreeSha,
        parents: [baseTreeSha],
      }
    );

    const newCommitSha = commitResponse.data.sha;

    // Update the branch reference
    await axios.patch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        sha: newCommitSha,
      }
    );

    console.log('Changes committed successfully!');
  } catch (error) {
    console.error('Error committing changes:', error);
  }
}

