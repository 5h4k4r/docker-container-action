const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
const axios = require('axios');

run();
async function run() {
  try {
    console.log(`CWD: ${process.cwd()}`)

    const filePathInput = core.getInput('filePath');
    const labelInput = core.getInput('label');

    const filePath = getProjectInfoFilePath(filePathInput);
    const file = require(filePath);


    console.log(`Label: ${labelInput}`)
    console.log(`File path: ${file}`)

    core.setOutput("label", labelInput);

    const version = getProjectVersion(filePath);

    // the version is in semantic format, so we can split it by dot
    const versionParts = version.split('.');
    // 1.2.3 => [1, 2, 3]
    if (labelInput === 'major') {

      versionParts[0] = parseInt(versionParts[0]) + 1;
      versionParts[1] = 0;
      versionParts[2] = 0;

    } else if (labelInput == 'minor') {

      versionParts[1] = parseInt(versionParts[1]) + 1;
      versionParts[2] = 0;

    }
    else if (labelInput == 'patch')
      versionParts[2] = parseInt(versionParts[2]) + 1;


    // join the parts back together
    const newVersion = versionParts.join('.');

    updateProjectVersion(filePath, newVersion);

    console.log(`Old version: ${version}. New version: ${newVersion}`)
    console.log(`Old version: ${version}. New version: ${newVersion}`)

    const filePathRelatedToRoot = getProjectInfoFilePath(filePathInput, true);
    await commitChanges(file, filePathRelatedToRoot);

    // console.log(`The event payload: ${payload}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}


// Region functions
async function commitChanges(file, filePath) {
  const commitMessage = 'Commit message here';

  let newContent = JSON.stringify(file, null, 2);
  // Append a newline character to the end of the new content
  newContent += '\n';

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

    const baseTreeSha = branchResponse.data.commit.sha;
    // Create a new blob with the updated content
    console.log('Branch')
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

    console.log('Blob Created')
    console.log('File path: ', filePath)
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
      },
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`
        },
      }
    );

    console.log('Tree Created')
    const newTreeSha = treeResponse.data.sha;

    // Create a new commit
    const commitResponse = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        message: commitMessage,
        tree: newTreeSha,
        parents: [baseTreeSha],
      },
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
        },
      }
    );

    console.log('Commit Created')
    const newCommitSha = commitResponse.data.sha;

    // Update the branch reference
    await axios.patch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        sha: newCommitSha,
      },
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
        },
      }
    );
    console.log('Branch Updated')
  } catch (error) {
    console.log(error)
    core.setFailed(error);

  }
}

function getProjectInfoFilePath(filePath, relativeToRoot = false) {
  if (filePath == null || filePath == undefined || filePath == '') {
    // List files inside the root directory of the repository
    const files = fs.readdirSync(process.cwd());
    // Return the first file that matches .csproj or package.json
    const projectInfoFile = files.find(file => file.match(/\.csproj|package\.json/));
    return relativeToRoot ? projectInfoFile : `${process.cwd()}/${projectInfoFile}`;
  }
  else
    return relativeToRoot ? filePath : `${process.cwd()}/${filePath}`;
}
function getProjectVersion(filePath) {
  const projectInfoFile = require(filePath);

  // Update the version if the file is .csproj
  if (filePath.match(/\.csproj/))
    return projectInfoFile.Project.PropertyGroup[0].Version;
  else if (filePath.match(/package\.json/))
    return projectInfoFile.version;

}
function updateProjectVersion(filePath, newVersion) {

  const projectInfoFile = require(filePath);

  // Update the version if the file is .csproj
  if (filePath.match(/\.csproj/))
    projectInfoFile.Project.PropertyGroup[0].Version = newVersion;
  else if (filePath.match(/package\.json/))
    projectInfoFile.version = newVersion;
}
