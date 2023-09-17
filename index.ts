import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs';
try {
  const label = core.getInput('label');
  console.log(`Label: ${label}`)

  core.setOutput("label", label);


  fs.readFile('/Readme.md', 'utf8', (err, data) => {
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
