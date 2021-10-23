import path, { join } from "path";
import { ChildProcess } from "child_process";
import { readJSON } from "fs-extra";
import { getServers, setup as setupDevServer } from "jest-dev-server";
const util = require('util');
const exec = util.promisify(require('child_process').exec);
import {generate} from "@sap-ux/fiori-freestyle-writer";

export const reportDir = path.join(__dirname, 'screenshots');

export const configs = {

}
export const generateFFApp = ()=> {
    import {generate} from "../../../../../packages/fiori-freestyle-writer";

}
export interface AppConfig {
    name: string;
    appId: string;
    listSelectorKey: string | undefined;
    selectorKey: string;
    listPageTitle: string | RegExp;
    title: string;
    url: string;
}

export const checkApp = async (config: AppConfig) => {
    await page.goto(config.url, {
        waitUntil: 'load',
        // Remove the timeout
        timeout: 0
    });

    try {
        const selector = await page.waitForSelector(config.selectorKey, { visible: true, timeout: 40000 });
        expect(selector).toBeDefined();

        // if (config.listSelectorKey) {
        //     const listSelector = await page.waitForSelector(config.listSelectorKey, { visible: true, timeout: 40000 });
        //     expect(listSelector).toBeDefined();
        // }
    } catch (e) {
        await page.screenshot({
            path: path.join(
                reportDir,
                // remove http(s)://
                `${config.url
                    .replace(/(^\w+:|^)\/\//, '')
                    .replace(/\//g, '_')
                    .replace(/\./g, '_')}_${config.name.replace('', '_')}.png`
            )
        });
        throw e;
    }
    await expect(page).toMatchElement(config.selectorKey, {
        text: config.listPageTitle
    });
    const pageTile = await page.title();
    expect(pageTile).toEqual(config.title);
};

export const startApp = async (projectRoot: string, yamlFileName: string, startHttpPort: number, scriptName: string): Promise<ChildProcess | undefined>  => {
    const packageJson: any = await readJSON(join(projectRoot, 'package.json'));

    try {
        const { stdout, stderr } = await exec('npm install --no-fund --no-audit --no-color', { cwd: projectRoot });
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
    } catch (e) {
        console.error(e); // should contain code (exit code) and signal (that caused the termination).
    }

    expect(packageJson.scripts[scriptName]).toBeDefined();
    const npmScriptName = scriptName;
    const scriptValue = packageJson.scripts?.[scriptName];
    if(scriptValue.includes('fiori')) {
        const fioriBin = 'node ./node_modules/@sap/ux-ui5-tooling/dist/cli/index.js';
        // 'node ../../../../../../../node_modules/@sap/ux-ui5-tooling/dist/cli/index.js';
        let command: string = scriptValue.replace('fiori', fioriBin);
        // get location of --open. Assumes last param in script!!!
        // remove --open param and use it later to open page
        const openStartIndex = command.indexOf('--open');
        const port = startHttpPort;
        const openStr = command
            .slice(openStartIndex + '--open'.length, command.length)
            .replace("'", '')
            .replace("'", '')
            .trimStart();
        command = command.slice(0, openStartIndex).concat(`--port ${port}`);
        if (command.includes('--config')) {
            const indexOfConfig = command.indexOf('--config');
            const indexOfYamlConfig = command.indexOf('./', indexOfConfig);
            const indexOfDotYaml = command.indexOf('.yaml', indexOfConfig);
            const configFileName = command.slice(indexOfYamlConfig + 2, indexOfDotYaml + 4);
            const configFilePath = join(projectRoot, configFileName);
            command.replace('./' + configFileName, configFilePath);
        } else {
            command = command + ` --config ${join(projectRoot, 'ui5.yaml')}`;
        }
        // Start the server and wait for port to come up.
        const currentDir = process.cwd();
        process.chdir(projectRoot);
        await setupDevServer({
            command: command,
            launchTimeout: 40000,
            port: port as number,
            debug: true,
            host: 'localhost',
            // path: '',
            protocol: 'http',
            usedPortAction: 'kill', // or 'error'??
            waitOnScheme: {
                delay: 1000
            }
        }).catch((error: any) => {
            expect(error).toBeUndefined();
        });
    }
    const servers = getServers();

    return servers[0]
};
