import os from 'os';

import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

interface Inputs {
  version: string;
}

function getPlatform(rawPlatform: string): string {
  switch (rawPlatform) {
    case 'linux':
      return 'linux';
  }

  throw new Error(`platform ${rawPlatform} not supported`);
}

function getArch(rawArch: string): string {
  switch (rawArch) {
    case 'x64':
      return 'amd64';

    case 'arm':
      return 'arm';

    case 'arm64':
      return 'arm64';
  }

  throw new Error(`architecture ${rawArch} not supported`);
}

function getInputs(): Inputs {
  let version = core.getInput('version');
  if (version === '') {
    return {
      version: 'latest',
    };
  }

  if (version.startsWith('v')) {
    throw new Error("'version' input should not be prefixed with 'v'");
  }

  const versionRegex =
    /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/i;

  if (!versionRegex.test(version)) {
    throw new Error(
      "incorrect 'version' specified, it should include all parts of the version e.g 11.0.1"
    );
  }

  return {
    version,
  };
}

const toolName = 'gamma';

async function run(): Promise<void> {
  const inputs = getInputs();

  if (inputs.version === 'latest') {
    core.info('Installing the latest Gamma')
  } else {
    core.info(`Installing Gamma ${inputs.version}`);
  }

  const toolPath = tc.find(toolName, inputs.version);
  if (toolPath !== '') {
    core.info('Gamma binaries found in cache.');
    core.addPath(toolPath);

    return;
  }

  core.info('Downloading Gamma...');

  const platform = getPlatform(os.platform());
  const arch = getArch(os.arch());

  const downloadPath = await tc.downloadTool(
    `https://github.com/ryanclark/gamma/releases/${inputs.version}/download/gamma-${platform}-${arch}`
  );

  const cachedPath = await tc.cacheFile(downloadPath, toolName, toolName, inputs.version);

  core.addPath(cachedPath);
}

run().catch(core.setFailed);
