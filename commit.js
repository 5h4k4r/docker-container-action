const axios = require('axios');




export async function commitChanges(filePath) {
  const commitMessage = 'Commit message here';
  const newContent = 'New content to be added';


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
    const blobResponse = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        content: newContent,
        encoding: 'utf-8',
      }
    );

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

commitChanges();
