const core = require('@actions/core');
const github = require('@actions/github');


try {
  const label = core.getInput('label');
  console.log(`Label: ${label}`)

  core.setOutput("label", label);

  const payload = JSON.stringify(github.context.payload, undefined, 2)

  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
