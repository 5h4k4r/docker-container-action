const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
try {
  const label = core.getInput('label');
  console.log(`Label: ${label}`)

  core.setOutput("label", label);

  const version = require('./package.json').version;
  // the version is in semantic format, so we can split it by dot
  const versionParts = version.substring(1).split('.');
  if (label === 'major')
    versionParts[0] = parseInt(versionParts[0]) + 1;
  else if (label == 'minor')
    versionParts[1] = parseInt(versionParts[1]) + 1;
  else if (label == 'patch')
    versionParts[2] = parseInt(versionParts[2]) + 1;



  // increment the patch version
  // join the parts back together
  const newVersion = `v${versionParts.join('.')}`;

  // Parse XML to JS Obj
  xml2js.parseString(data, function (err, result) {
    if (err) {
      return console.log(err);
    }
    // Convert JS obj to JSON
    const json = JSON.stringify(result, null, 2);

    // Write JSON to file
    fs.writeFile('./project.json', json, 'utf8', function (err) {
      if (err) {
        return console.log(err);
      }
      console.log('Created project.json from project.csproj');
    });
  });

  console.log(`Old version: ${version}. New version: ${newVersion}`)


  const payload = JSON.stringify(github.context.payload, undefined, 2)

  // console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
