const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
const xml2js = require('xml2js')

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

  const version = require(filePath).version;


  // the version is in semantic format, so we can split it by dot
  const versionParts = version.split('.');
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
  const newVersion = `v${versionParts.join('.')}`;


  console.log(`Old version: ${version}. New version: ${newVersion}`)


  const payload = JSON.stringify(github.context.payload, undefined, 2)

  // console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
