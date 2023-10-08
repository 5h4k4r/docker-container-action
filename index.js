const core = require('@actions/core')
const github = require('@actions/github')
const glob = require('@actions/glob')
const fs = require('fs')
const axios = require('axios');
const convert = require('xml-js');
const { Octokit } = require("@octokit/action");
run();
async function run() {

  try {
    console.log(`CWD: ${process.cwd()}`)
    console.log(`filePath: ${core.getInput('filePath')}`)

    const githubToken = core.getInput('filePath');

    console.log("githubToken", githubToken)

    const patterns = ['src/**/*.csproj', 'package.json']
    const globber = await glob.create(patterns.join('\n'))
    const files = await globber.glob()

    console.log("files: ", files)

    const filePathInput = core.getInput('filePath');
    const labelInput = core.getInput('label');

    const filePath = getProjectInfoFilePath(filePathInput);


    console.log(`Label: ${labelInput}`)
    console.log(`File path: ${filePath}`)

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

    const file = updateProjectVersion(filePath, newVersion);

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

  const githubToken = process.env.GITHUB_TOKEN;

  // Get the repository owner and name
  const repoFullName = process.env.GITHUB_REPOSITORY;
  const [owner, repo] = repoFullName.split('/');

  // Get the current branch
  const branch = process.env.GITHUB_REF.replace('refs/heads/', '');
  const oktokit = new Octokit({
    auth: githubToken
  })


  console.log(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
    `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`)
  try {
    // Get the current commit SHA for the branch
    const branchResponse = await oktokit.request(`GET /repos/${owner}/${repo}/branches/${branch}`, {
      owner,
      repo,
      branch
    })
    // const branchResponse = await axios.get(
    //   `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`
    // );

    const baseTreeSha = branchResponse.data.commit.sha;
    // Create a new blob with the updated content
    console.log('Branch')

    const blobResponse = await oktokit.request(`POST /repos/${owner}/${repo}/git/blobs`, {
      owner,
      repo,
      content: newContent,
      encoding: 'utf-8'
    })
    // const blobResponse = await axios.post(
    //   `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
    //   {
    //     content: newContent,
    //     encoding: 'utf-8',
    //   },
    //   {
    //     headers: {
    //       'Accept': 'application/vnd.github.v3+json',
    //       'Authorization': `Bearer ${githubToken}`,
    //     },
    //   }
    // );

    console.log('Blob Created')
    console.log('File path: ', filePath)
    const newBlobSha = blobResponse.data.sha;
    // Create a new tree with the updated blob
    const treeResponse = await oktokit.request(`POST /repos/${owner}/${repo}/git/trees`, {
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: [
        {
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: newBlobSha,
        },
      ]
    })
    // const treeResponse = await axios.post(
    //   `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    //   {
    //     base_tree: baseTreeSha,
    //     tree: [
    //       {
    //         path: filePath,
    //         mode: '100644',
    //         type: 'blob',
    //         sha: newBlobSha,
    //       },
    //     ],
    //   },
    //   {
    //     headers: {
    //       'Accept': 'application/vnd.github+json',
    //       'Authorization': `Bearer ${githubToken}`
    //     },
    //   }
    // );

    console.log('Tree Created')
    const newTreeSha = treeResponse.data.sha;

    // Create a new commit
    const commitResponse = await oktokit.request(`POST /repos/${owner}/${repo}/git/commits`, {
      owner,
      repo,
      message: commitMessage,
      tree: newTreeSha,
      parents: [baseTreeSha],
    })

    // const commitResponse = await axios.post(
    //   `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    //   {
    //     message: commitMessage,
    //     tree: newTreeSha,
    //     parents: [baseTreeSha],
    //   },
    //   {
    //     headers: {
    //       'Accept': 'application/vnd.github+json',
    //       'Authorization': `Bearer ${githubToken}`,
    //     },
    //   }
    // );

    console.log('Commit Created')
    const newCommitSha = commitResponse.data.sha;

    // Update the branch reference
    await oktokit.request(`PATCH /repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      owner,
      repo,
      sha: newCommitSha
    })

    // await axios.patch(
    //   `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    //   {
    //     sha: newCommitSha,
    //   },
    //   {
    //     headers: {
    //       'Accept': 'application/vnd.github+json',
    //       'Authorization': `Bearer ${githubToken}`,
    //     },
    //   }
    // );
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

  if (filePath.match(/\.csproj/)) {

    const convertedToJson = convert.xml2js(projectInfoFile);
    // elements[0] -> PropertyGroup -> Version (object) -> text (e.g. 1.2.3)
    return convertedToJson.elements[0].elements.find(el => el.name == 'PropertyGroup').elements.find(el => el.name == 'Version').elements.find(el => el.type == 'text').text;

  } else if (filePath.match(/package\.json/))
    return projectInfoFile.version;

}
function updateProjectVersion(filePath, newVersion) {

  let projectInfoFile = getFile(filePath);

  // Update the version if the file is .csproj
  if (filePath.match(/\.csproj/))
    projectInfoFile.Project.PropertyGroup[0].Version = newVersion;
  else if (filePath.match(/package\.json/)) {
    projectInfoFile = JSON.parse(projectInfoFile)
    projectInfoFile.version = newVersion;
  }

  return projectInfoFile;
}

function getFile(filePath) {
  const file = fs.readFileSync(filePath, 'utf8');
  return file;
}
