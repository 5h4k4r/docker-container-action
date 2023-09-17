const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
try {
  const label = core.getInput('label');
  console.log(`Label: ${label}`)

  core.setOutput("label", label);


  fs.readFile('/README.md', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`File data: ${data}`);
  });
  const payload = JSON.stringify(github.context.payload, undefined, 2)

  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
